-- Incremental extension: original transaction values and dates remain unchanged.
alter table public.transacoes alter column usuario_criador_id drop not null;
alter table public.transacoes add column competence_date date;
alter table public.transacoes add column due_date date;
alter table public.transacoes add column paid_date date;
alter table public.transacoes add column cost_center_id uuid;
alter table public.transacoes add column created_by uuid references auth.users(id);
alter table public.transacoes add column source_type text not null default 'legacy';
alter table public.transacoes add column source_id uuid;
alter table public.transacoes add column version integer not null default 1 check(version>0);
alter table public.transacoes add column cancellation_reason text;
alter table public.transacoes add column cancelled_by uuid references auth.users(id);
alter table public.transacoes add column cancelled_at timestamptz;
alter table public.transacoes drop constraint transacoes_status_check;
alter table public.transacoes add constraint transacoes_status_check check(status in ('pendente_aprovacao','aprovada','rejeitada','confirmada','cancelada','pending','paid','cancelled'));
alter table public.transacoes add constraint transacoes_source_check check(source_type in ('legacy','manual'));
alter table public.transacoes add constraint transacoes_manual_check check(source_type='legacy' or (
 created_by is not null and source_id is not null and competence_date is not null and due_date is not null
 and competence_date between date '1900-01-01' and date '2199-12-31' and due_date between date '1900-01-01' and date '2199-12-31'
 and categoria_id is not null and length(trim(descricao)) between 1 and 500
 and status in ('pending','paid','cancelled')
 and ((status='paid' and paid_date is not null and paid_date between date '1900-01-01' and date '2199-12-31') or (status<>'paid' and paid_date is null))
 and (status<>'cancelled' or (length(trim(cancellation_reason)) between 3 and 500 and cancellation_reason is not null and cancelled_by is not null and cancelled_at is not null))
));
alter table public.contas_bancarias add constraint contas_id_org_key unique(id,empresa_id);
alter table public.cost_centers add constraint centers_id_org_key unique(id,organization_id);
alter table public.transacoes drop constraint transacoes_conta_id_fkey;
alter table public.transacoes drop constraint transacoes_categoria_id_fkey;
alter table public.transacoes drop constraint transacoes_empresa_id_fkey;
alter table public.transacoes add constraint transacoes_empresa_id_fkey foreign key(empresa_id) references public.empresas(id) on delete restrict;
alter table public.transacoes add constraint transacoes_account_org_fk foreign key(conta_id,empresa_id) references public.contas_bancarias(id,empresa_id) on delete restrict;
alter table public.transacoes add constraint transacoes_category_org_fk foreign key(categoria_id,empresa_id) references public.categorias(id,empresa_id) on delete restrict;
alter table public.transacoes add constraint transacoes_center_org_fk foreign key(cost_center_id,empresa_id) references public.cost_centers(id,organization_id) on delete restrict;
create index transacoes_center_idx on public.transacoes(cost_center_id,empresa_id);
create index transacoes_created_by_idx on public.transacoes(created_by);
create index transacoes_cancelled_by_idx on public.transacoes(cancelled_by);
create index transacoes_due_idx on public.transacoes(empresa_id,due_date,id);
create index transacoes_competence_idx on public.transacoes(empresa_id,competence_date,id);
create index transacoes_pending_due_idx on public.transacoes(empresa_id,due_date) where status='pending';
create table private.financial_entry_commands(
 organization_id uuid not null references public.organizations(id), request_id uuid not null,
 payload jsonb not null,result_id uuid not null,created_at timestamptz not null default now(),
 primary key(organization_id,request_id)
);
alter table private.financial_entry_commands enable row level security;
revoke all on private.financial_entry_commands from public,anon,authenticated;
create trigger audit_transaction after insert or update on public.transacoes for each row execute function private.audit_finance_catalog();

-- Only this authorized command may mutate financial facts. No direct DML grants.
create function private.write_financial_entry(org uuid,request_id uuid,payload jsonb) returns uuid
language plpgsql security definer set search_path='' as $$
declare operation text=payload->>'operation'; target uuid=nullif(payload->>'id','')::uuid;
 saved private.financial_entry_commands; previous public.transacoes; result uuid;
 account uuid; category uuid; center uuid; direction text; state text; label text; notes text;
 amount numeric; competence date; due date; paid date; today date=(now() at time zone 'America/Sao_Paulo')::date;
 reason text; category_type text;
begin
 if auth.uid() is null or not private.has_permission(org,'financial.write') then raise exception 'Forbidden' using errcode='42501'; end if;
 if request_id is null or payload is null or jsonb_typeof(payload)<>'object' or operation is null or operation not in ('save','settle','cancel') then raise exception 'Invalid request' using errcode='22023'; end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(org::text||request_id::text,1));
 select * into saved from private.financial_entry_commands c where c.organization_id=org and c.request_id=write_financial_entry.request_id;
 if found then
  if saved.payload<>payload then raise exception 'Idempotency key already used' using errcode='22023'; end if;
  return saved.result_id;
 end if;
 if target is not null then
  select * into previous from public.transacoes where id=target and empresa_id=org for update;
  if not found then raise exception 'Record unavailable' using errcode='42501'; end if;
  if previous.source_type<>'manual' or previous.status<>'pending' or previous.deletada_em is not null then raise exception 'Entry is immutable' using errcode='22023'; end if;
  if coalesce(payload->>'version','') !~ '^[0-9]{1,9}$' or (payload->>'version')::integer<>previous.version then raise exception 'Stale version' using errcode='40001'; end if;
 elsif operation<>'save' then raise exception 'Missing id' using errcode='22023';
 end if;
 if operation='save' then
  label=trim(payload->>'description'); notes=nullif(trim(payload->>'notes'),''); direction=payload->>'type';state=payload->>'status';
  if label is null or length(label) not between 1 and 500 or length(notes)>2000 or direction is null or direction not in ('receita','despesa') or state is null or state not in ('pending','paid') or (target is not null and state<>'pending') then raise exception 'Invalid entry' using errcode='22023'; end if;
  if coalesce(payload->>'amount','') !~ '^[0-9]{1,13}(\.[0-9]{1,2})?$' then raise exception 'Invalid amount' using errcode='22023'; end if;
  amount=(payload->>'amount')::numeric;
  if amount<=0 then raise exception 'Invalid amount' using errcode='22023'; end if;
  if coalesce(payload->>'competence_date','') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' or coalesce(payload->>'due_date','') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' then raise exception 'Invalid dates' using errcode='22023'; end if;
  competence=(payload->>'competence_date')::date;due=(payload->>'due_date')::date;
  if competence not between date '1900-01-01' and date '2199-12-31' or due not between date '1900-01-01' and date '2199-12-31' then raise exception 'Invalid dates' using errcode='22023'; end if;
  account=nullif(payload->>'account_id','')::uuid;category=nullif(payload->>'category_id','')::uuid;center=nullif(payload->>'cost_center_id','')::uuid;
  -- Share locks also prevent an archive racing a new relationship.
  perform 1 from public.contas_bancarias where id=account and empresa_id=org and ativa and deletada_em is null and moeda='BRL' for share;
  if not found then raise exception 'Invalid account' using errcode='22023'; end if;
  select tipo into category_type from public.categorias where id=category and empresa_id=org and deletada_em is null for share;
  if not found or category_type not in (direction,'ambos') then raise exception 'Invalid category' using errcode='22023'; end if;
  if center is not null then
   perform 1 from public.cost_centers where id=center and organization_id=org and active for share;
   if not found then raise exception 'Invalid cost center' using errcode='22023'; end if;
  end if;
  if state='paid' then
   if coalesce(payload->>'paid_date','') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' then raise exception 'Invalid payment date' using errcode='22023'; end if;
   paid=(payload->>'paid_date')::date;
   if paid<date '1900-01-01' or paid>today then raise exception 'Invalid payment date' using errcode='22023'; end if;
  elsif nullif(payload->>'paid_date','') is not null then raise exception 'Pending entry cannot have payment date' using errcode='22023'; end if;
  if target is null then
   result=gen_random_uuid();
   insert into public.transacoes(id,empresa_id,conta_id,tipo,descricao,categoria_id,valor,data_lancamento,status,observacoes,competence_date,due_date,paid_date,cost_center_id,created_by,source_type,source_id,idempotency_key)
   values(result,org,account,direction,label,category,amount,competence,state,notes,competence,due,paid,center,auth.uid(),'manual',result,request_id);
  else
   update public.transacoes set conta_id=account,tipo=direction,descricao=label,categoria_id=category,valor=amount,data_lancamento=competence,observacoes=notes,competence_date=competence,due_date=due,cost_center_id=center,version=version+1,atualizada_em=now()
   where id=target returning id into result;
  end if;
 elsif operation='settle' then
  if coalesce(payload->>'paid_date','') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' then raise exception 'Invalid payment date' using errcode='22023'; end if;
  paid=(payload->>'paid_date')::date;
  if paid<date '1900-01-01' or paid>today then raise exception 'Invalid payment date' using errcode='22023'; end if;
  perform 1 from public.contas_bancarias where id=previous.conta_id and empresa_id=org and ativa and deletada_em is null for share;
  if not found then raise exception 'Invalid account' using errcode='22023'; end if;
  update public.transacoes set status='paid',paid_date=paid,version=version+1,atualizada_em=now() where id=target returning id into result;
 else
  reason=trim(payload->>'reason');
  if reason is null or length(reason) not between 3 and 500 then raise exception 'Cancellation reason required' using errcode='22023'; end if;
  update public.transacoes set status='cancelled',cancellation_reason=reason,cancelled_by=auth.uid(),cancelled_at=now(),version=version+1,atualizada_em=now() where id=target returning id into result;
 end if;
 insert into private.financial_entry_commands(organization_id,request_id,payload,result_id) values(org,request_id,payload,result);
 return result;
end $$;
revoke all on function private.write_financial_entry(uuid,uuid,jsonb) from public,anon;
grant execute on function private.write_financial_entry(uuid,uuid,jsonb) to authenticated;
create function public.save_financial_entry(org uuid,request_id uuid,payload jsonb) returns uuid
language sql security invoker set search_path='' as $$ select private.write_financial_entry(org,request_id,payload); $$;
revoke all on function public.save_financial_entry(uuid,uuid,jsonb) from public,anon;
grant execute on function public.save_financial_entry(uuid,uuid,jsonb) to authenticated;

create function public.get_financial_entries(org uuid,filters jsonb default '{}',page integer default 1) returns jsonb
language plpgsql stable security invoker set search_path='' as $$
declare result jsonb; pattern text; direction text=coalesce(filters->>'type','all'); state text=coalesce(filters->>'status','all');
 account uuid=nullif(filters->>'account_id','')::uuid; date_from date=nullif(filters->>'from','')::date; date_to date=nullif(filters->>'to','')::date;
 basis text=coalesce(filters->>'basis','due'); today date=(now() at time zone 'America/Sao_Paulo')::date;
begin
 if auth.uid() is null or not private.has_permission(org,'financial.read') then raise exception 'Forbidden' using errcode='42501'; end if;
 if page is null or page not between 1 and 100000 or filters is null or jsonb_typeof(filters)<>'object' or length(coalesce(filters->>'q',''))>100 or direction not in ('all','receita','despesa') or state not in ('all','pending','overdue','paid','cancelled','legacy') or basis not in ('due','competence','paid') or date_from>date_to then raise exception 'Invalid filters' using errcode='22023'; end if;
 pattern='%'||replace(replace(replace(coalesce(filters->>'q',''),'\','\\'),'%','\%'),'_','\_')||'%';
 with filtered as materialized (
  select t.*,case when source_type='legacy' then 'legacy' when status='pending' and due_date<today then 'overdue' else status end as display_status
  from public.transacoes t where empresa_id=org and descricao ilike pattern
   and (direction='all' or tipo=direction) and (account is null or conta_id=account)
   and (date_from is null or (case basis when 'due' then due_date when 'paid' then paid_date else competence_date end)>=date_from)
   and (date_to is null or (case basis when 'due' then due_date when 'paid' then paid_date else competence_date end)<=date_to)
 ), selected as materialized (select * from filtered where state='all' or display_status=state)
 select jsonb_build_object('total',(select count(*) from selected),'page',page,'items',coalesce((select jsonb_agg(to_jsonb(r)) from (
  select t.id,t.tipo as type,t.descricao as description,t.valor::text as amount,t.status,t.display_status,t.conta_id as account_id,a.nome as account_name,t.categoria_id as category_id,c.nome as category_name,t.cost_center_id,cc.name as cost_center_name,t.competence_date,t.due_date,t.paid_date,t.data_lancamento as legacy_date,t.observacoes as notes,t.source_type,t.source_id,t.version,t.cancellation_reason
  from selected t join public.contas_bancarias a on a.id=t.conta_id and a.empresa_id=t.empresa_id
  left join public.categorias c on c.id=t.categoria_id and c.empresa_id=t.empresa_id
  left join public.cost_centers cc on cc.id=t.cost_center_id and cc.organization_id=t.empresa_id
  order by t.data_lancamento desc,t.criada_em desc,t.id limit 25 offset (page-1)*25
 ) r),'[]'::jsonb)) into result;
 return result;
end $$;
revoke all on function public.get_financial_entries(uuid,jsonb,integer) from public,anon;
grant execute on function public.get_financial_entries(uuid,jsonb,integer) to authenticated;

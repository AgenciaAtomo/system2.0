alter table public.transacoes add column paid_amount numeric(15,2) not null default 0;
alter table public.transacoes add column installment_group uuid;
alter table public.transacoes add column installment_number integer;
alter table public.transacoes add column installment_count integer;
alter table public.transacoes add constraint transacoes_id_org_key unique(id,empresa_id);
alter table public.transacoes add constraint transacoes_id_org_account_key unique(id,empresa_id,conta_id);
create table public.financial_installment_plans(
 id uuid primary key default gen_random_uuid(),organization_id uuid not null references public.organizations(id),
 total_amount numeric(15,2) not null check(total_amount>0),installment_count integer not null check(installment_count between 2 and 120),
 description text not null,first_due_date date not null,competence_date date not null,
 created_by uuid not null references auth.users(id),created_at timestamptz not null default now(),
 unique(id,organization_id)
);
create index installment_plans_org_idx on public.financial_installment_plans(organization_id);
create index installment_plans_creator_idx on public.financial_installment_plans(created_by);
alter table public.financial_installment_plans enable row level security;
revoke all on public.financial_installment_plans from public,anon,authenticated;
grant select on public.financial_installment_plans to authenticated;
create policy installment_plans_read on public.financial_installment_plans for select to authenticated using(private.has_permission(organization_id,'financial.read'));
alter table public.transacoes add constraint transacoes_plan_org_fk foreign key(installment_group,empresa_id) references public.financial_installment_plans(id,organization_id);
alter table public.transacoes add constraint transacoes_installment_fields check(
 (installment_group is null and installment_number is null and installment_count is null) or
 (installment_group is not null and installment_number is not null and installment_count is not null and installment_count between 2 and 120 and installment_number between 1 and installment_count)
);
create unique index transacoes_plan_number_idx on public.transacoes(installment_group,installment_number);
create index transacoes_plan_org_idx on public.transacoes(installment_group,empresa_id);
create table public.financial_payments(
 id uuid primary key default gen_random_uuid(),organization_id uuid not null references public.organizations(id),
 entry_id uuid not null,account_id uuid not null,amount numeric(15,2) not null check(amount>0),
 paid_date date not null check(paid_date between date '1900-01-01' and date '2199-12-31'),
 created_by uuid not null references auth.users(id),created_at timestamptz not null default now(),
 notes text check(length(notes)<=2000),origin text not null check(origin in ('entry','settlement','migration')),
 foreign key(entry_id,organization_id,account_id) references public.transacoes(id,empresa_id,conta_id) on delete restrict
);
create index financial_payments_entry_idx on public.financial_payments(entry_id,organization_id,account_id);
create index financial_payments_org_date_idx on public.financial_payments(organization_id,paid_date);
create index financial_payments_creator_idx on public.financial_payments(created_by);
alter table public.financial_payments enable row level security;
revoke all on public.financial_payments from public,anon,authenticated;
grant select on public.financial_payments to authenticated;
create policy financial_payments_read on public.financial_payments for select to authenticated using(private.has_permission(organization_id,'financial.read'));

-- Known modern paid dates and values are carried forward; legacy dates remain unknown.
insert into public.financial_payments(organization_id,entry_id,account_id,amount,paid_date,created_by,created_at,origin)
 select empresa_id,id,conta_id,valor,paid_date,created_by,coalesce(atualizada_em,criada_em,now()),'migration'
 from public.transacoes where source_type='manual' and status='paid';
update public.transacoes set paid_amount=valor where source_type='manual' and status='paid';
alter table public.transacoes add constraint transacoes_paid_amount_check check(paid_amount between 0 and valor);
alter table public.transacoes drop constraint transacoes_status_check;
alter table public.transacoes add constraint transacoes_status_check check(status in ('pendente_aprovacao','aprovada','rejeitada','confirmada','cancelada','pending','paid','partially_paid','cancelled'));
alter table public.transacoes drop constraint transacoes_manual_check;
alter table public.transacoes add constraint transacoes_manual_check check(source_type='legacy' or (
 created_by is not null and source_id is not null and competence_date is not null and due_date is not null
 and competence_date between date '1900-01-01' and date '2199-12-31' and due_date between date '1900-01-01' and date '2199-12-31'
 and categoria_id is not null and length(trim(descricao)) between 1 and 500
 and status in ('pending','paid','partially_paid','cancelled')
 and ((status='paid' and paid_date is not null and paid_date between date '1900-01-01' and date '2199-12-31' and paid_amount=valor)
   or (status='partially_paid' and paid_date is null and paid_amount>0 and paid_amount<valor)
   or (status in ('pending','cancelled') and paid_date is null and paid_amount=0))
 and (status<>'cancelled' or (length(trim(cancellation_reason)) between 3 and 500 and cancellation_reason is not null and cancelled_by is not null and cancelled_at is not null))
));
create index transacoes_open_due_idx on public.transacoes(empresa_id,due_date) where status in ('pending','partially_paid');
create trigger audit_payment after insert on public.financial_payments for each row execute function private.audit_finance_catalog();
create trigger audit_installment_plan after insert on public.financial_installment_plans for each row execute function private.audit_finance_catalog();

-- Deferred constraints guarantee that materialized totals match the immutable payment journal.
create function private.verify_financial_payments() returns trigger language plpgsql security definer set search_path='' as $$
declare target uuid; row public.transacoes; paid numeric; last_date date;
begin
 if TG_TABLE_NAME='transacoes' then target=coalesce(new.id,old.id); else target=coalesce(new.entry_id,old.entry_id); end if;
 select * into row from public.transacoes where id=target;
 if not found or row.source_type='legacy' then return null; end if;
 select coalesce(sum(amount),0),max(paid_date) into paid,last_date from public.financial_payments where entry_id=target and organization_id=row.empresa_id;
 if row.paid_amount<>paid or (row.status='paid' and row.paid_date is distinct from last_date) then raise exception 'Payment journal mismatch' using errcode='23514'; end if;
 return null;
end $$;
revoke all on function private.verify_financial_payments() from public,anon,authenticated;
create constraint trigger check_entry_payments after insert or update on public.transacoes deferrable initially deferred for each row execute function private.verify_financial_payments();
create constraint trigger check_payment_totals after insert or update or delete on public.financial_payments deferrable initially deferred for each row execute function private.verify_financial_payments();

create function private.verify_installment_plan() returns trigger language plpgsql security definer set search_path='' as $$
declare target uuid; plan public.financial_installment_plans; n integer; total numeric;
begin
 if TG_TABLE_NAME='transacoes' then target=coalesce(new.installment_group,old.installment_group); else target=coalesce(new.id,old.id); end if;
 if target is null then return null; end if;
 select * into plan from public.financial_installment_plans where id=target;
 if not found then return null; end if;
 select count(*),sum(valor) into n,total from public.transacoes where installment_group=target and empresa_id=plan.organization_id;
 if n<>plan.installment_count or total is distinct from plan.total_amount or exists(select 1 from public.transacoes where installment_group=target and installment_count<>plan.installment_count) then raise exception 'Installment plan mismatch' using errcode='23514'; end if;
 return null;
end $$;
revoke all on function private.verify_installment_plan() from public,anon,authenticated;
create constraint trigger check_plan_entries after insert or update or delete on public.transacoes deferrable initially deferred for each row execute function private.verify_installment_plan();
create constraint trigger check_plan_total after insert or update on public.financial_installment_plans deferrable initially deferred for each row execute function private.verify_installment_plan();

create or replace function private.write_financial_entry(org uuid,request_id uuid,payload jsonb) returns uuid
language plpgsql security definer set search_path='' as $$
declare operation text=payload->>'operation'; target uuid=nullif(payload->>'id','')::uuid;
 saved private.financial_entry_commands; previous public.transacoes; result uuid;
 account uuid; category uuid; center uuid; direction text; state text; label text; notes text;
 amount numeric; competence date; due date; paid date; today date=(now() at time zone 'America/Sao_Paulo')::date;
 reason text; category_type text; settlement numeric; payment_notes text;
 parts integer; plan_id uuid; new_id uuid; idx integer; cents numeric; unit_cents numeric; residue integer; part_amount numeric; part_due date;
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
  if previous.source_type<>'manual' or (previous.status not in ('pending','partially_paid') or (operation<>'settle' and previous.status<>'pending')) or previous.deletada_em is not null then raise exception 'Entry is immutable' using errcode='22023'; end if;
  if coalesce(payload->>'version','') !~ '^[0-9]{1,9}$' or (payload->>'version')::integer<>previous.version then raise exception 'Stale version' using errcode='40001'; end if;
 elsif operation<>'save' then raise exception 'Missing id' using errcode='22023';
 end if;
 if operation='save' then
  if coalesce(payload->>'installments','1') !~ '^[0-9]{1,3}$' then raise exception 'Invalid installment count' using errcode='22023'; end if;
  parts=coalesce(payload->>'installments','1')::integer;
  if parts not between 1 and 120 or (target is not null and parts<>1) then raise exception 'Invalid installment count' using errcode='22023'; end if;
  label=trim(payload->>'description'); notes=nullif(trim(payload->>'notes'),''); direction=payload->>'type';state=payload->>'status';
  if label is null or length(label) not between 1 and 500 or length(notes)>2000 or direction is null or direction not in ('receita','despesa') or state is null or state not in ('pending','paid') or (target is not null and state<>'pending') then raise exception 'Invalid entry' using errcode='22023'; end if;
  if coalesce(payload->>'amount','') !~ '^[0-9]{1,13}(\.[0-9]{1,2})?$' then raise exception 'Invalid amount' using errcode='22023'; end if;
  amount=(payload->>'amount')::numeric;
  if amount<=0 or amount*100<parts then raise exception 'Invalid amount' using errcode='22023'; end if;
  if target is not null and previous.installment_group is not null and amount<>previous.valor then raise exception 'Installment amount is immutable' using errcode='22023'; end if;
  if parts>1 and state<>'pending' then raise exception 'Installments must start pending' using errcode='22023'; end if;
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
   if parts>1 then
    insert into public.financial_installment_plans(organization_id,total_amount,installment_count,description,first_due_date,competence_date,created_by)
    values(org,amount,parts,label,due,competence,auth.uid()) returning id into plan_id;
   end if;
   cents=amount*100;unit_cents=trunc(cents/parts);residue=(cents-unit_cents*parts)::integer;
   for idx in 1..parts loop
    new_id=gen_random_uuid();if idx=1 then result=new_id; end if;
    part_amount=(unit_cents+case when idx<=residue then 1 else 0 end)/100;
    part_due=(due+make_interval(months=>idx-1))::date;
    if part_due>date '2199-12-31' then raise exception 'Installment date out of range' using errcode='22023'; end if;
    insert into public.transacoes(id,empresa_id,conta_id,tipo,descricao,categoria_id,valor,data_lancamento,status,observacoes,competence_date,due_date,paid_date,cost_center_id,created_by,source_type,source_id,idempotency_key,paid_amount,installment_group,installment_number,installment_count)
    values(new_id,org,account,direction,label,category,part_amount,competence,state,notes,competence,part_due,paid,center,auth.uid(),'manual',new_id,case when idx=1 then request_id else gen_random_uuid() end,case when state='paid' then part_amount else 0 end,plan_id,case when parts>1 then idx end,case when parts>1 then parts end);
    if state='paid' then
     insert into public.financial_payments(organization_id,entry_id,account_id,amount,paid_date,created_by,origin)
     values(org,new_id,account,part_amount,paid,auth.uid(),'entry');
    end if;
   end loop;
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
  if payload ? 'settlement_amount' then
   if coalesce(payload->>'settlement_amount','') !~ '^[0-9]{1,13}(\.[0-9]{1,2})?$' then raise exception 'Invalid settlement amount' using errcode='22023'; end if;
   settlement=(payload->>'settlement_amount')::numeric;
  else settlement=previous.valor-previous.paid_amount; end if;
  if settlement<=0 or settlement>previous.valor-previous.paid_amount then raise exception 'Settlement exceeds outstanding amount' using errcode='22023'; end if;
  payment_notes=nullif(trim(payload->>'payment_notes'),'');
  if length(payment_notes)>2000 then raise exception 'Payment notes too long' using errcode='22023'; end if;
  insert into public.financial_payments(organization_id,entry_id,account_id,amount,paid_date,created_by,notes,origin)
  values(org,target,previous.conta_id,settlement,paid,auth.uid(),payment_notes,'settlement');
  update public.transacoes set paid_amount=previous.paid_amount+settlement,
   status=case when previous.paid_amount+settlement=previous.valor then 'paid' else 'partially_paid' end,
   paid_date=case when previous.paid_amount+settlement=previous.valor then (select max(p.paid_date) from public.financial_payments p where p.entry_id=target and p.organization_id=org) else null end,
   version=version+1,atualizada_em=now() where id=target returning id into result;
 else
  reason=trim(payload->>'reason');
  if reason is null or length(reason) not between 3 and 500 then raise exception 'Cancellation reason required' using errcode='22023'; end if;
  update public.transacoes set status='cancelled',cancellation_reason=reason,cancelled_by=auth.uid(),cancelled_at=now(),version=version+1,atualizada_em=now() where id=target returning id into result;
 end if;
 insert into private.financial_entry_commands(organization_id,request_id,payload,result_id) values(org,request_id,payload,result);
 return result;
end $$;

create or replace function public.get_financial_entries(org uuid,filters jsonb default '{}',page integer default 1) returns jsonb
language plpgsql stable security invoker set search_path='' as $$
declare result jsonb; pattern text; direction text=coalesce(filters->>'type','all'); state text=coalesce(filters->>'status','all');
 account uuid=nullif(filters->>'account_id','')::uuid; date_from date=nullif(filters->>'from','')::date; date_to date=nullif(filters->>'to','')::date;
 basis text=coalesce(filters->>'basis','due'); today date=(now() at time zone 'America/Sao_Paulo')::date;
begin
 if auth.uid() is null or not private.has_permission(org,'financial.read') then raise exception 'Forbidden' using errcode='42501'; end if;
 if page is null or page not between 1 and 100000 or filters is null or jsonb_typeof(filters)<>'object' or length(coalesce(filters->>'q',''))>100 or direction not in ('all','receita','despesa') or state not in ('all','pending','overdue','partially_paid','paid','cancelled','legacy') or basis not in ('due','competence','paid') or date_from>date_to then raise exception 'Invalid filters' using errcode='22023'; end if;
 pattern='%'||replace(replace(replace(coalesce(filters->>'q',''),'\','\\'),'%','\%'),'_','\_')||'%';
 with filtered as materialized (
  select t.*,case when source_type='legacy' then 'legacy' when status in ('pending','partially_paid') and due_date<today then 'overdue' else status end as display_status
  from public.transacoes t where empresa_id=org and descricao ilike pattern
   and (direction='all' or tipo=direction) and (account is null or conta_id=account)
   and ((basis<>'paid' and (date_from is null or (case basis when 'due' then due_date else competence_date end)>=date_from)
    and (date_to is null or (case basis when 'due' then due_date else competence_date end)<=date_to))
    or (basis='paid' and exists(select 1 from public.financial_payments p where p.entry_id=t.id and p.organization_id=org and (date_from is null or p.paid_date>=date_from) and (date_to is null or p.paid_date<=date_to))))
 ), selected as materialized (select * from filtered where state='all' or display_status=state or (state='partially_paid' and status='partially_paid'))
 select jsonb_build_object('total',(select count(*) from selected),'page',page,'items',coalesce((select jsonb_agg(to_jsonb(r)) from (
  select t.id,t.tipo as type,t.descricao as description,t.valor::text as amount,t.status,t.display_status,t.conta_id as account_id,a.nome as account_name,t.categoria_id as category_id,c.nome as category_name,t.cost_center_id,cc.name as cost_center_name,t.competence_date,t.due_date,t.paid_date,t.data_lancamento as legacy_date,t.observacoes as notes,t.source_type,t.source_id,t.version,t.cancellation_reason,
   case when t.source_type='manual' then t.paid_amount::text end as paid_amount,
   case when t.source_type='manual' then (case when t.status='cancelled' then 0 else t.valor-t.paid_amount end)::text end as outstanding_amount,
   t.installment_group,t.installment_number,t.installment_count
  from selected t join public.contas_bancarias a on a.id=t.conta_id and a.empresa_id=t.empresa_id
  left join public.categorias c on c.id=t.categoria_id and c.empresa_id=t.empresa_id
  left join public.cost_centers cc on cc.id=t.cost_center_id and cc.organization_id=t.empresa_id
  order by t.data_lancamento desc,t.criada_em desc,t.id limit 25 offset (page-1)*25
 ) r),'[]'::jsonb)) into result;
 return result;
end $$;
revoke all on function public.get_financial_entries(uuid,jsonb,integer) from public,anon;
grant execute on function public.get_financial_entries(uuid,jsonb,integer) to authenticated;


create function public.get_financial_payments(org uuid,entry uuid,page integer default 1) returns jsonb
language plpgsql stable security invoker set search_path='' as $$
declare result jsonb;
begin
 if auth.uid() is null or not private.has_permission(org,'financial.read') then raise exception 'Forbidden' using errcode='42501'; end if;
 if entry is null or page is null or page not between 1 and 100000 then raise exception 'Invalid request' using errcode='22023'; end if;
 if not exists(select 1 from public.transacoes where id=entry and empresa_id=org) then raise exception 'Record unavailable' using errcode='42501'; end if;
 select jsonb_build_object('total',(select count(*) from public.financial_payments where entry_id=entry and organization_id=org),'items',coalesce((select jsonb_agg(to_jsonb(r)) from (
  select p.id,p.amount::text,p.paid_date,p.notes,p.origin,a.nome as account_name
  from public.financial_payments p join public.contas_bancarias a on a.id=p.account_id and a.empresa_id=p.organization_id
  where p.entry_id=entry and p.organization_id=org order by p.paid_date desc,p.created_at desc,p.id limit 25 offset (page-1)*25
 ) r),'[]'::jsonb)) into result;
 return result;
end $$;
revoke all on function public.get_financial_payments(uuid,uuid,integer) from public,anon;
grant execute on function public.get_financial_payments(uuid,uuid,integer) to authenticated;

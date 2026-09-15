alter table public.transacoes add column deleted_by uuid references auth.users(id);
create index transacoes_deleted_by_idx on public.transacoes(deleted_by);
create function private.revise_financial_entry(org uuid,request_id uuid,payload jsonb) returns uuid
language plpgsql security definer set search_path='' as $$
declare target uuid=nullif(payload->>'id','')::uuid; operation text=payload->>'operation'; previous public.transacoes; saved private.financial_entry_commands; label text; notes text;
begin
 if auth.uid() is null or not private.has_permission(org,'financial.write') then raise exception 'Forbidden' using errcode='42501'; end if;
 if target is null or request_id is null or operation is null or operation not in ('remove','amend') then raise exception 'Invalid request' using errcode='22023'; end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(org::text||request_id::text,1));
 select * into saved from private.financial_entry_commands c where c.organization_id=org and c.request_id=revise_financial_entry.request_id;
 if found then
  if saved.payload<>payload then raise exception 'Idempotency key already used' using errcode='22023'; end if;
  return saved.result_id;
 end if;
 select * into previous from public.transacoes where id=target and empresa_id=org for update;
 if not found then raise exception 'Record unavailable' using errcode='42501'; end if;
 if previous.deletada_em is not null then raise exception 'Entry already removed' using errcode='22023'; end if;
 if coalesce(payload->>'version','') !~ '^[0-9]{1,9}$' or (payload->>'version')::integer<>previous.version then raise exception 'Stale version' using errcode='40001'; end if;
 if operation='remove' then
  update public.transacoes set deletada_em=now(),deleted_by=auth.uid(),motivo_delecao='Exclusão solicitada na tela de lançamentos',version=version+1,atualizada_em=now() where id=target;
 else
  label=trim(payload->>'description');notes=nullif(trim(payload->>'notes'),'');
  if label is null or length(label) not between 1 and 500 or length(notes)>2000 then raise exception 'Invalid description' using errcode='22023'; end if;
  update public.transacoes set descricao=label,observacoes=notes,version=version+1,atualizada_em=now() where id=target;
 end if;
 insert into private.financial_entry_commands(organization_id,request_id,payload,result_id) values(org,request_id,payload,target);
 return target;
end $$;
revoke all on function private.revise_financial_entry(uuid,uuid,jsonb) from public,anon;
grant execute on function private.revise_financial_entry(uuid,uuid,jsonb) to authenticated;
create function public.revise_financial_entry(org uuid,request_id uuid,payload jsonb) returns uuid
language sql security invoker set search_path='' as $$ select private.revise_financial_entry(org,request_id,payload); $$;
revoke all on function public.revise_financial_entry(uuid,uuid,jsonb) from public,anon;
grant execute on function public.revise_financial_entry(uuid,uuid,jsonb) to authenticated;

create or replace function public.get_financial_entries(org uuid,filters jsonb default '{}',page integer default 1) returns jsonb
language plpgsql stable security invoker set search_path='' as $$
declare result jsonb; pattern text; direction text=coalesce(filters->>'type','all'); state text=coalesce(filters->>'status','all');
 account uuid=nullif(filters->>'account_id','')::uuid; date_from date=nullif(filters->>'from','')::date; date_to date=nullif(filters->>'to','')::date;
 basis text=coalesce(filters->>'basis','due'); today date=(now() at time zone 'America/Sao_Paulo')::date;
begin
 if auth.uid() is null or not private.has_permission(org,'financial.read') then raise exception 'Forbidden' using errcode='42501'; end if;
 if page is null or page not between 1 and 100000 or filters is null or jsonb_typeof(filters)<>'object' or length(coalesce(filters->>'q',''))>100 or direction not in ('all','receita','despesa') or state not in ('all','open','pending','overdue','partially_paid','paid','cancelled','legacy') or basis not in ('due','competence','paid') or date_from>date_to then raise exception 'Invalid filters' using errcode='22023'; end if;
 pattern='%'||replace(replace(replace(coalesce(filters->>'q',''),'\','\\'),'%','\%'),'_','\_')||'%';
 with filtered as materialized (
  select t.*,case when source_type='legacy' then 'legacy' when status in ('pending','partially_paid') and due_date<today then 'overdue' else status end as display_status
  from public.transacoes t where empresa_id=org and deletada_em is null and descricao ilike pattern
   and (direction='all' or tipo=direction) and (account is null or conta_id=account)
   and ((basis<>'paid' and (date_from is null or (case basis when 'due' then due_date else competence_date end)>=date_from)
    and (date_to is null or (case basis when 'due' then due_date else competence_date end)<=date_to))
    or (basis='paid' and exists(select 1 from public.financial_payments p where p.entry_id=t.id and p.organization_id=org and (date_from is null or p.paid_date>=date_from) and (date_to is null or p.paid_date<=date_to))))
 ), selected as materialized (select * from filtered where state='all' or (state='open' and status in ('pending','partially_paid')) or display_status=state or (state='partially_paid' and status='partially_paid'))
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



create or replace function public.get_financial_summary(org uuid,page integer default 1) returns jsonb
language plpgsql stable security invoker set search_path='' as $$
declare result jsonb; today date=(now() at time zone 'America/Sao_Paulo')::date;
 month_start date; month_end date;
begin
 if auth.uid() is null or not private.has_permission(org,'financial.read') then raise exception 'Forbidden' using errcode='42501'; end if;
 if page is null or page not between 1 and 100000 then raise exception 'Invalid page' using errcode='22023'; end if;
 month_start=date_trunc('month',today)::date;month_end=(month_start+interval '1 month')::date;
 with accounts as materialized (
  select id,nome,ativa,deletada_em,saldo_inicial from public.contas_bancarias where empresa_id=org and moeda='BRL'
 ), payments as materialized (
  select p.account_id,p.amount,p.paid_date,t.tipo from public.financial_payments p
  join public.transacoes t on t.id=p.entry_id and t.empresa_id=p.organization_id and t.conta_id=p.account_id
  join accounts a on a.id=p.account_id
  where p.organization_id=org and t.source_type='manual' and t.deletada_em is null and p.paid_date<=today
 ), cash_by_account as (
  select account_id,sum(case when tipo='receita' then amount else -amount end) as net from payments group by account_id
 ), legacy as materialized (
  select t.conta_id,t.tipo,t.valor from public.transacoes t join accounts a on a.id=t.conta_id
  where t.empresa_id=org and t.source_type='legacy' and t.status='confirmada' and t.deletada_em is null
 ), legacy_by_account as (
  select conta_id,sum(case when tipo='receita' then valor else -valor end) as net from legacy group by conta_id
 ), balances as materialized (
  select a.id,a.nome as name,coalesce(a.ativa,false) and a.deletada_em is null as active,a.saldo_inicial as opening_balance,
   a.saldo_inicial+coalesce(p.net,0)+coalesce(l.net,0) as balance
  from accounts a left join cash_by_account p on p.account_id=a.id left join legacy_by_account l on l.conta_id=a.id
 ), outstanding as (
  select t.tipo,t.valor-t.paid_amount as remaining from public.transacoes t join accounts a on a.id=t.conta_id
  where t.empresa_id=org and t.source_type='manual' and t.status in ('pending','partially_paid') and t.deletada_em is null
 )
 select jsonb_build_object(
  'as_of',today,'month_start',month_start,'month_end',month_end,
  'balance',coalesce((select sum(balance) from balances),0)::text,
  'unknown_opening_count',(select count(*) from balances where opening_balance is null),
  'received',coalesce((select sum(amount) from payments where tipo='receita' and paid_date>=month_start and paid_date<month_end),0)::text,
  'paid',coalesce((select sum(amount) from payments where tipo='despesa' and paid_date>=month_start and paid_date<month_end),0)::text,
  'receivable',coalesce((select sum(remaining) from outstanding where tipo='receita'),0)::text,
  'payable',coalesce((select sum(remaining) from outstanding where tipo='despesa'),0)::text,
  'legacy_count',(select count(*) from legacy),
  'account_count',(select count(*) from balances),
  'accounts',coalesce((select jsonb_agg(to_jsonb(r)) from (
   select id,name,active,opening_balance::text,balance::text from balances order by lower(name),id limit 25 offset (page-1)*25
  ) r),'[]'::jsonb)
 ) into result;
 return result;
end $$;
revoke all on function public.get_financial_summary(uuid,integer) from public,anon;
grant execute on function public.get_financial_summary(uuid,integer) to authenticated;

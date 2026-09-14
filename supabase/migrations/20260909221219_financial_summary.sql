create function public.get_financial_summary(org uuid,page integer default 1) returns jsonb
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
  where p.organization_id=org and t.source_type='manual' and p.paid_date<=today
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

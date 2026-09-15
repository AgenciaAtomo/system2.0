create or replace function private.purge_financial_account(org uuid,target uuid) returns void
language plpgsql security definer set search_path='' as $$
declare affected_order record; plan_ids uuid[];
begin
 if target is null then raise exception 'Missing account id' using errcode='22023'; end if;
 select coalesce(array_agg(distinct installment_group) filter(where installment_group is not null),'{}'::uuid[]) into plan_ids
  from public.transacoes where empresa_id=org and conta_id=target;

 for affected_order in
  select sr.order_id,sum(sr.amount) as amount
  from public.sale_receipts sr
  join public.transacoes t on t.id=sr.entry_id and t.empresa_id=sr.organization_id
  where sr.organization_id=org and t.conta_id=target
  group by sr.order_id
 loop
  update public.sales_orders set received=greatest(0,received-affected_order.amount),closed=false
   where id=affected_order.order_id and organization_id=org;
 end loop;

 delete from public.sale_receipts sr using public.transacoes t
  where sr.entry_id=t.id and sr.organization_id=t.empresa_id and t.empresa_id=org and t.conta_id=target;
 delete from public.purchase_financial_links pfl using public.transacoes t
  where pfl.entry_id=t.id and pfl.organization_id=t.empresa_id and t.empresa_id=org and t.conta_id=target;
 delete from public.financial_payments where organization_id=org and account_id=target;
 delete from public.alertas_saldo where empresa_id=org and conta_id=target;
 delete from public.bank_statement_drafts where organization_id=org and account_id=target;
 delete from public.bank_statement_imports where organization_id=org and account_id=target;
 delete from public.bank_statement_category_rules where organization_id=org and account_id=target;
 delete from public.transacoes where empresa_id=org and conta_id=target;
 delete from public.financial_installment_plans p where p.organization_id=org and p.id=any(plan_ids)
  and not exists(select 1 from public.transacoes t where t.empresa_id=org and t.installment_group=p.id);
 delete from public.contas_bancarias where empresa_id=org and id=target;
 if not found then raise exception 'Record unavailable' using errcode='42501'; end if;
end $$;
revoke all on function private.purge_financial_account(uuid,uuid) from public,anon,authenticated;

create or replace function public.save_financial_catalog(org uuid, request_id uuid, payload jsonb)
 returns uuid
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare kind text=payload->>'kind'; operation text=coalesce(payload->>'operation','save');
 target uuid; result uuid; saved private.finance_catalog_commands; label text=trim(payload->>'name');
 amount numeric; parent uuid; parent_kind text; account_type text; current_parent uuid;
begin
 if auth.uid() is null or not private.has_permission(org,'financial.write') then raise exception 'Forbidden' using errcode='42501'; end if;
 if request_id is null or payload is null or kind is null or kind not in ('account','category','cost_center') or operation not in ('save','archive') then raise exception 'Invalid request' using errcode='22023'; end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(org::text||request_id::text,0));
 select * into saved from private.finance_catalog_commands c where c.organization_id=org and c.request_id=save_financial_catalog.request_id;
 if found then
  if saved.payload<>payload then raise exception 'Idempotency key already used' using errcode='22023'; end if;
  return saved.result_id;
 end if;
 if payload->>'id' is not null then target=(payload->>'id')::uuid; end if;
 if operation='archive' and target is null then raise exception 'Missing id' using errcode='22023'; end if;
 if operation='save' and (label is null or length(label)<1 or length(label)>100) then raise exception 'Invalid name' using errcode='22023'; end if;
 if kind='account' then
  if operation='archive' then
   perform private.purge_financial_account(org,target);
   result=target;
  else
   account_type=payload->>'type';
   if account_type is null or account_type not in ('bancaria','carteira','caixa','marketplace','digital','corrente','poupanca','cartao_prepago') then raise exception 'Invalid account type' using errcode='22023'; end if;
   if target is null then
    if coalesce(payload->>'opening_balance','') !~ '^-?[0-9]{1,13}(\.[0-9]{1,2})?$' then raise exception 'Invalid amount' using errcode='22023'; end if;
    amount=(payload->>'opening_balance')::numeric;
    result=gen_random_uuid();
    insert into public.contas_bancarias(id,empresa_id,nome,tipo,numero_conta,saldo_inicial,saldo_atual,moeda)
     values(result,org,label,account_type,left(replace(result::text,'-',''),20),amount,amount,'BRL');
   else
    update public.contas_bancarias set nome=label,tipo=account_type,atualizada_em=now()
     where id=target and empresa_id=org and deletada_em is null returning id into result;
   end if;
  end if;
 elsif kind='category' then
  perform 1 from public.organizations where id=org for update;
  if operation='archive' then
   if exists(select 1 from public.categorias where parent_id=target and empresa_id=org and deletada_em is null) then raise exception 'Archive child categories first' using errcode='22023'; end if;
   update public.categorias set deletada_em=now(),atualizada_em=now() where id=target and empresa_id=org returning id into result;
  else
   if payload->>'type' is null or payload->>'type' not in ('receita','despesa','ambos') then raise exception 'Invalid category type' using errcode='22023'; end if;
   parent=nullif(payload->>'parent_id','')::uuid;
   if parent is not null then
    select tipo into parent_kind from public.categorias where id=parent and empresa_id=org and deletada_em is null;
    if not found then raise exception 'Invalid parent' using errcode='22023'; end if;
    if parent_kind<>'ambos' and parent_kind<>payload->>'type' then raise exception 'Incompatible parent type' using errcode='22023'; end if;
    current_parent=parent;
    while current_parent is not null loop
     if current_parent=target then raise exception 'Category cycle' using errcode='22023'; end if;
     select parent_id into current_parent from public.categorias where id=current_parent and empresa_id=org;
    end loop;
   end if;
   if target is null then
    insert into public.categorias(empresa_id,nome,tipo,parent_id) values(org,label,payload->>'type',parent) returning id into result;
   else
    if exists(select 1 from public.categorias where parent_id=target and empresa_id=org and deletada_em is null and payload->>'type'<>'ambos' and tipo<>payload->>'type') then raise exception 'Incompatible child type' using errcode='22023'; end if;
    update public.categorias set nome=label,tipo=payload->>'type',parent_id=parent,atualizada_em=now()
     where id=target and empresa_id=org and deletada_em is null returning id into result;
   end if;
  end if;
 else
  if operation='archive' then
   update public.cost_centers set active=false,updated_at=now() where id=target and organization_id=org returning id into result;
  elsif target is null then
   insert into public.cost_centers(organization_id,name) values(org,label) returning id into result;
  else
   update public.cost_centers set name=label,updated_at=now() where id=target and organization_id=org returning id into result;
  end if;
 end if;
 if result is null then raise exception 'Record unavailable' using errcode='42501'; end if;
 insert into private.finance_catalog_commands(organization_id,request_id,payload,result_id) values(org,request_id,payload,result);
 return result;
end $function$;

create or replace function public.get_financial_catalog(org uuid,kind text,search text default '',page integer default 1) returns jsonb
language plpgsql stable security invoker set search_path='' as $$
declare items jsonb; total bigint; skip integer; pattern text;
begin
 if auth.uid() is null or not private.has_permission(org,'financial.read') then raise exception 'Forbidden' using errcode='42501'; end if;
 if kind is null or kind not in ('account','category','cost_center') or page is null or page<1 or page>100000 or length(search)>100 then raise exception 'Invalid filter' using errcode='22023'; end if;
 skip=(page-1)*25;pattern='%'||replace(replace(replace(search,'\','\\'),'%','\%'),'_','\_')||'%';
 if kind='account' then
  select count(*) into total from public.contas_bancarias where empresa_id=org and moeda='BRL' and ativa and deletada_em is null and nome ilike pattern;
  select coalesce(jsonb_agg(to_jsonb(r)),'[]') into items from (
   select id,nome as name,tipo as type,saldo_inicial::text as opening_balance,true as active,null::uuid as parent_id
   from public.contas_bancarias where empresa_id=org and moeda='BRL' and ativa and deletada_em is null and nome ilike pattern order by lower(nome),id limit 25 offset skip) r;
 elsif kind='category' then
  select count(*) into total from public.categorias where empresa_id=org and nome ilike pattern;
  select coalesce(jsonb_agg(to_jsonb(r)),'[]') into items from (
   select id,nome as name,tipo as type,null::text as opening_balance,deletada_em is null as active,parent_id
   from public.categorias where empresa_id=org and nome ilike pattern order by lower(nome),id limit 25 offset skip) r;
 else
  select count(*) into total from public.cost_centers where organization_id=org and name ilike pattern;
  select coalesce(jsonb_agg(to_jsonb(r)),'[]') into items from (
   select id,name,null::text as type,null::text as opening_balance,active,null::uuid as parent_id
   from public.cost_centers where organization_id=org and name ilike pattern order by lower(name),id limit 25 offset skip) r;
 end if;
 return jsonb_build_object('items',items,'total',total,'page',page);
end $$;
revoke all on function public.get_financial_catalog(uuid,text,text,integer) from public,anon;
grant execute on function public.get_financial_catalog(uuid,text,text,integer) to authenticated;

create or replace function public.get_financial_summary(org uuid,page integer default 1) returns jsonb
language plpgsql stable security invoker set search_path='' as $$
declare result jsonb; today date=(now() at time zone 'America/Sao_Paulo')::date;
 month_start date; month_end date;
begin
 if auth.uid() is null or not private.has_permission(org,'financial.read') then raise exception 'Forbidden' using errcode='42501'; end if;
 if page is null or page not between 1 and 100000 then raise exception 'Invalid page' using errcode='22023'; end if;
 month_start=date_trunc('month',today)::date;month_end=(month_start+interval '1 month')::date;
 with accounts as materialized (
  select id,nome,ativa,deletada_em,saldo_inicial from public.contas_bancarias where empresa_id=org and moeda='BRL' and ativa and deletada_em is null
 ), payments as materialized (
  select p.account_id,p.amount,p.paid_date,t.tipo from public.financial_payments p
  join public.transacoes t on t.id=p.entry_id and t.empresa_id=p.organization_id and t.conta_id=p.account_id
  join accounts a on a.id=p.account_id
  where p.organization_id=org and t.source_type<>'legacy' and t.status<>'cancelled' and t.deletada_em is null and p.paid_date<=today
 ), cash_by_account as (
  select account_id,sum(case when tipo='receita' then amount else -amount end) as net from payments group by account_id
 ), legacy as materialized (
  select t.conta_id,t.tipo,t.valor from public.transacoes t join accounts a on a.id=t.conta_id
  where t.empresa_id=org and t.source_type='legacy' and t.status='confirmada' and t.deletada_em is null
 ), legacy_by_account as (
  select conta_id,sum(case when tipo='receita' then valor else -valor end) as net from legacy group by conta_id
 ), balances as materialized (
  select a.id,a.nome as name,true as active,a.saldo_inicial as opening_balance,
   a.saldo_inicial+coalesce(p.net,0)+coalesce(l.net,0) as balance
  from accounts a left join cash_by_account p on p.account_id=a.id left join legacy_by_account l on l.conta_id=a.id
 ), outstanding as (
  select t.tipo,t.valor-t.paid_amount as remaining from public.transacoes t join accounts a on a.id=t.conta_id
  where t.empresa_id=org and t.source_type in ('manual','input_purchase') and t.status in ('pending','partially_paid') and t.deletada_em is null
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

do $$ declare removed record; begin
 for removed in select id,empresa_id from public.contas_bancarias where coalesce(ativa,false)=false or deletada_em is not null loop
  perform private.purge_financial_account(removed.empresa_id,removed.id);
 end loop;
end $$;

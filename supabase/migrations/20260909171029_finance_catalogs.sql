create table public.cost_centers(
 id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id),
 name text not null check(length(trim(name)) between 1 and 100), active boolean not null default true,
 created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
 unique(organization_id,name)
);
alter table public.cost_centers enable row level security;
revoke all on public.cost_centers from public,anon,authenticated;
grant select on public.cost_centers to authenticated;
create policy cost_centers_read on public.cost_centers for select to authenticated using(private.has_permission(organization_id,'financial.read'));
create table private.finance_catalog_commands(
 organization_id uuid not null references public.organizations(id), request_id uuid not null,
 payload jsonb not null,result_id uuid not null,created_at timestamptz not null default now(),
 primary key(organization_id,request_id)
);
alter table private.finance_catalog_commands enable row level security;
revoke all on private.finance_catalog_commands from public,anon,authenticated;
alter table public.contas_bancarias drop constraint contas_bancarias_tipo_check;
alter table public.contas_bancarias add constraint contas_bancarias_tipo_check check(tipo in ('corrente','poupanca','cartao_prepago','caixa','bancaria','carteira','marketplace','digital'));
alter table public.categorias add column parent_id uuid;
alter table public.categorias add column atualizada_em timestamptz not null default now();
alter table public.categorias add constraint categorias_id_org_unique unique(id,empresa_id);
alter table public.categorias add constraint categorias_parent_org_fk foreign key(parent_id,empresa_id) references public.categorias(id,empresa_id);
create index categorias_parent_idx on public.categorias(parent_id,empresa_id);
create function private.audit_finance_catalog() returns trigger language plpgsql security definer set search_path='' as $$
declare prev jsonb; nxt jsonb; org uuid;
begin
 if TG_OP<>'INSERT' then prev=to_jsonb(old); end if;
 nxt=to_jsonb(new);org=coalesce((nxt->>'organization_id')::uuid,(nxt->>'empresa_id')::uuid);
 insert into public.audit_logs(organization_id,user_id,action,entity,entity_id,domain,old_value,new_value)
 values(org,auth.uid(),TG_OP,TG_TABLE_NAME,nxt->>'id','financial',prev,nxt);
 return new;
end $$;
revoke all on function private.audit_finance_catalog() from public,anon,authenticated;
create trigger audit_account after insert or update on public.contas_bancarias for each row execute function private.audit_finance_catalog();
create trigger audit_category after insert or update on public.categorias for each row execute function private.audit_finance_catalog();
create trigger audit_cost_center after insert or update on public.cost_centers for each row execute function private.audit_finance_catalog();
create function public.save_financial_catalog(org uuid,request_id uuid,payload jsonb) returns uuid
language plpgsql security definer set search_path='' as $$
declare kind text=payload->>'kind'; operation text=coalesce(payload->>'operation','save');
 target uuid; result uuid; saved private.finance_catalog_commands; label text=trim(payload->>'name');
 amount numeric; parent uuid; parent_kind text; account_type text; current_parent uuid;
begin
 if auth.uid() is null or not private.has_permission(org,'financial.write') then raise exception 'Forbidden' using errcode='42501'; end if;
 if request_id is null or payload is null or kind not in ('account','category','cost_center') or operation not in ('save','archive') then raise exception 'Invalid request' using errcode='22023'; end if;
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
   update public.contas_bancarias set ativa=false,atualizada_em=now() where id=target and empresa_id=org returning id into result;
  elsif target is null then
   account_type=payload->>'type';
   if account_type is null or account_type not in ('bancaria','carteira','caixa','marketplace','digital','corrente','poupanca','cartao_prepago') then raise exception 'Invalid account type' using errcode='22023'; end if;
   if coalesce(payload->>'opening_balance','') !~ '^-?[0-9]{1,13}(\.[0-9]{1,2})?$' then raise exception 'Invalid amount' using errcode='22023'; end if;
   amount=(payload->>'opening_balance')::numeric;
   result=gen_random_uuid();
   insert into public.contas_bancarias(id,empresa_id,nome,tipo,numero_conta,saldo_inicial,saldo_atual,moeda)
    values(result,org,label,account_type,left(replace(result::text,'-',''),20),amount,amount,'BRL');
  else
   update public.contas_bancarias set nome=label,atualizada_em=now()
    where id=target and empresa_id=org and deletada_em is null returning id into result;
  end if;
 elsif kind='category' then
  -- Serialize hierarchy changes per organization to prevent concurrent cycles.
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
end $$;
revoke all on function public.save_financial_catalog(uuid,uuid,jsonb) from public,anon;
grant execute on function public.save_financial_catalog(uuid,uuid,jsonb) to authenticated;


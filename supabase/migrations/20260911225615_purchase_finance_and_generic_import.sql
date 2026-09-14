create table public.purchase_financial_links(id uuid primary key default gen_random_uuid(),organization_id uuid not null references public.organizations(id),purchase_id uuid not null unique,entry_id uuid not null unique,foreign key(purchase_id,organization_id) references public.input_purchases(id,organization_id),foreign key(entry_id,organization_id) references public.transacoes(id,empresa_id));
create index purchase_financial_org_idx on public.purchase_financial_links(organization_id);
alter table public.purchase_financial_links enable row level security;
revoke all on public.purchase_financial_links from public,anon,authenticated;
grant select on public.purchase_financial_links to authenticated;
create policy purchase_financial_read on public.purchase_financial_links for select to authenticated using(private.has_permission(organization_id,'financial.read'));
create trigger purchase_link_audit after insert or update on public.purchase_financial_links for each row execute function private.audit_operational();

create function private.purchase_input(org uuid,request_id uuid,payload jsonb,finance jsonb default '{}') returns uuid language plpgsql security definer set search_path='' as $$
declare saved private.operation_commands;purchase uuid;entry uuid;cost numeric;body jsonb=jsonb_build_object('purchase',payload,'finance',finance);
begin
 if auth.uid() is null or not private.has_permission(org,'operational.write') or payload->>'operation' is distinct from 'purchase' then raise exception 'Acesso negado' using errcode='42501';end if;
 perform pg_advisory_xact_lock(hashtextextended(org::text,41));
 select * into saved from private.operation_commands c where c.organization_id=org and c.request_id=purchase_input.request_id;
 if found then if saved.payload<>body then raise exception 'Solicitação já utilizada';end if;return (saved.result->>'id')::uuid;end if;
 purchase=private.write_input(org,gen_random_uuid(),payload);
 if coalesce(finance->>'status','none')<>'none' then
  select final_cost into cost from public.input_purchases where id=purchase;
  entry=private.write_financial_entry(org,gen_random_uuid(),jsonb_build_object('operation','save','type','despesa','status',finance->>'status','description','Compra de insumos · '||left(payload->>'supplier',200),'amount',cost::text,'account_id',finance->>'account_id','category_id',finance->>'category_id','competence_date',payload->>'date','due_date',coalesce(nullif(finance->>'due_date',''),payload->>'date'),'paid_date',case when finance->>'status'='paid' then payload->>'date' else '' end,'notes','Custo incorporado ao estoque; não descontar novamente do resultado das vendas.'));
  update public.transacoes set source_type='input_purchase',source_id=purchase where id=entry;
  insert into public.purchase_financial_links(organization_id,purchase_id,entry_id) values(org,purchase,entry);
 end if;
 insert into private.operation_commands(organization_id,request_id,payload,result) values(org,request_id,body,jsonb_build_object('id',purchase));return purchase;
end $$;
revoke all on function private.purchase_input(uuid,uuid,jsonb,jsonb) from public,anon;
grant execute on function private.purchase_input(uuid,uuid,jsonb,jsonb) to authenticated;
create function public.purchase_input(org uuid,request_id uuid,payload jsonb,finance jsonb default '{}') returns uuid language sql security invoker set search_path='' as $$select private.purchase_input(org,request_id,payload,finance)$$;
revoke all on function public.purchase_input(uuid,uuid,jsonb,jsonb) from public,anon;
grant execute on function public.purchase_input(uuid,uuid,jsonb,jsonb) to authenticated;

-- Linked purchases allow settlement through the existing finance command; edits remain blocked.
do $$ declare def text;begin
 select pg_get_functiondef(p.oid) into def from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='private' and proname='write_financial_entry';
 def=replace(def,'previous.source_type<>''manual''','(previous.source_type<>''manual'' and not(previous.source_type=''input_purchase'' and operation=''settle''))');execute def;
 select pg_get_functiondef(p.oid) into def from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and proname='get_financial_entries';
 if def is not null then def=replace(def,'t.source_type=''manual''','t.source_type<>''legacy''');execute def;end if;
end $$;

create function private.import_row(org uuid,request_id uuid,payload jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare saved private.operation_commands;kind text=payload->>'kind';p jsonb=payload->'row';record_id uuid;v integer;result jsonb;channel uuid;order_id uuid;
begin
 if auth.uid() is null or not private.has_permission(org,case when kind in ('inputs','purchases') then 'operational.write' else 'financial.write' end) then raise exception 'Acesso negado' using errcode='42501';end if;
 if request_id is null then raise exception 'Solicitação inválida';end if;
 perform pg_advisory_xact_lock(hashtextextended(org::text,41));
 select * into saved from private.operation_commands c where c.organization_id=org and c.request_id=import_row.request_id;
 if found then if saved.payload<>payload then raise exception 'Referência já importada com valores diferentes';end if;return saved.result||'{"duplicate":true}'::jsonb;end if;
 if kind='inputs' then
  record_id=private.write_input(org,gen_random_uuid(),jsonb_build_object('operation','save','name',p->>'name','sku',upper(p->>'sku'),'base_unit',coalesce(nullif(p->>'unit',''),'unidade'),'minimum_stock',coalesce(nullif(p->>'minimum',''),'0'),'category',coalesce(p->>'category',''),'default_supplier',coalesce(p->>'supplier','')));
 elsif kind='purchases' then
  select id,version into record_id,v from public.inputs where organization_id=org and sku=upper(p->>'sku') for update;if not found then raise exception 'Insumo não encontrado: %',p->>'sku';end if;
  record_id=private.purchase_input(org,gen_random_uuid(),jsonb_build_object('operation','purchase','id',record_id,'version',v,'supplier',p->>'supplier','date',p->>'date','quantity',p->>'quantity','purchase_unit',p->>'unit','total_price',p->>'amount','freight',coalesce(nullif(p->>'shipping',''),'0'),'taxes','0','other_costs','0'),coalesce(payload->'finance','{}'));
 elsif kind='receipts' then
  channel=(payload->>'channel_id')::uuid;select id into order_id from public.sales_orders where organization_id=org and channel_id=channel and external_id=p->>'order';if not found then raise exception 'Pedido não encontrado';end if;
  result=private.operate(org,gen_random_uuid(),jsonb_build_object('operation','receive','id',order_id,'date',p->>'date','amount',p->>'amount','account_id',payload->>'account_id','category_id',payload->>'category_id','reason','Importação: '||coalesce(p->>'reference','')));record_id=(result->>'id')::uuid;
 elsif kind='statement' then
  if p->>'type' is null or p->>'type' not in ('receita','despesa') then raise exception 'Tipo deve ser receita ou despesa';end if;
  record_id=private.write_financial_entry(org,gen_random_uuid(),jsonb_build_object('operation','save','type',p->>'type','status','paid','description',p->>'description','amount',p->>'amount','paid_date',p->>'date','due_date',p->>'date','competence_date',p->>'date','account_id',payload->>'account_id','category_id',payload->>'category_id','notes','Importação de extrato · '||coalesce(p->>'reference','')));
 else raise exception 'Tipo de importação inválido';end if;
 result=jsonb_build_object('id',record_id);insert into private.operation_commands(organization_id,request_id,payload,result) values(org,request_id,payload,result);return result;
end $$;
revoke all on function private.import_row(uuid,uuid,jsonb) from public,anon;
grant execute on function private.import_row(uuid,uuid,jsonb) to authenticated;
create function public.import_row(org uuid,request_id uuid,payload jsonb) returns jsonb language sql security invoker set search_path='' as $$select private.import_row(org,request_id,payload)$$;
revoke all on function public.import_row(uuid,uuid,jsonb) from public,anon;
grant execute on function public.import_row(uuid,uuid,jsonb) to authenticated;

create table public.inputs(
 id uuid primary key default gen_random_uuid(),organization_id uuid not null references public.organizations(id),
 name text not null check(length(trim(name)) between 1 and 200),sku text not null check(sku ~ '^[A-Z0-9._-]{1,64}$'),
 category text not null default '' check(length(category)<=100),base_unit text not null check(base_unit in ('g','kg','ml','l','unidade','metro','cm')),
 stock_quantity numeric(18,6) not null default 0 check(stock_quantity>=0),minimum_stock numeric(18,6) not null default 0 check(minimum_stock>=0),
 stock_value numeric(24,6) not null default 0 check(stock_value>=0),average_cost numeric(20,6) check(average_cost>=0),last_cost numeric(20,6) check(last_cost>=0),
 default_supplier text not null default '' check(length(default_supplier)<=200),active boolean not null default true,
 version integer not null default 1 check(version>0),last_movement_date date,
 created_by uuid not null references auth.users(id),created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
 unique(organization_id,sku),unique(id,organization_id),check(stock_quantity>0 or stock_value=0),check(stock_quantity=0 or average_cost is not null)
);
create index inputs_creator_idx on public.inputs(created_by);
create table public.input_purchases(
 id uuid primary key default gen_random_uuid(),organization_id uuid not null references public.organizations(id),input_id uuid not null,
 supplier text not null check(length(trim(supplier)) between 1 and 200),purchase_date date not null,
 quantity numeric(18,6) not null check(quantity>0),purchase_unit text not null,converted_quantity numeric(18,6) not null check(converted_quantity>0),
 total_price numeric(15,2) not null check(total_price>=0),freight numeric(15,2) not null check(freight>=0),taxes numeric(15,2) not null check(taxes>=0),other_costs numeric(15,2) not null check(other_costs>=0),
 final_cost numeric(15,2) not null check(final_cost>0),unit_cost numeric(20,6) not null check(unit_cost>=0),
 created_by uuid not null references auth.users(id),created_at timestamptz not null default now(),
 foreign key(input_id,organization_id) references public.inputs(id,organization_id),unique(id,organization_id),
 check(final_cost=total_price+freight+taxes+other_costs)
);
create index input_purchases_input_idx on public.input_purchases(input_id,organization_id);
create index input_purchases_org_date_idx on public.input_purchases(organization_id,purchase_date);
create index input_purchases_creator_idx on public.input_purchases(created_by);
create table public.inventory_movements(
 id uuid primary key default gen_random_uuid(),organization_id uuid not null references public.organizations(id),input_id uuid not null,
 type text not null check(type in ('purchase','manual_adjustment')),quantity numeric(18,6) not null check(quantity<>0),
 value_change numeric(24,6) not null,stock_after numeric(18,6) not null check(stock_after>=0),average_cost_after numeric(20,6),
 movement_date date not null,source_type text not null check(source_type in ('purchase','adjustment')),source_id uuid not null,
 reason text not null check(length(trim(reason)) between 3 and 500),created_by uuid not null references auth.users(id),created_at timestamptz not null default now(),
 foreign key(input_id,organization_id) references public.inputs(id,organization_id)
);
create index inventory_movements_input_idx on public.inventory_movements(input_id,organization_id,created_at);
create index inventory_movements_org_idx on public.inventory_movements(organization_id);
create index inventory_movements_creator_idx on public.inventory_movements(created_by);
create table public.input_cost_history(
 id uuid primary key default gen_random_uuid(),organization_id uuid not null references public.organizations(id),input_id uuid not null,
 purchase_id uuid not null unique,quantity numeric(18,6) not null,total_value numeric(15,2) not null,unit_cost numeric(20,6) not null,
 date date not null,created_at timestamptz not null default now(),
 foreign key(input_id,organization_id) references public.inputs(id,organization_id),
 foreign key(purchase_id,organization_id) references public.input_purchases(id,organization_id)
);
create index input_cost_history_input_idx on public.input_cost_history(input_id,organization_id,date);
create index input_cost_history_org_idx on public.input_cost_history(organization_id);
create index input_cost_history_purchase_idx on public.input_cost_history(purchase_id,organization_id);
create table private.input_commands(
 organization_id uuid not null references public.organizations(id),request_id uuid not null,payload jsonb not null,result_id uuid not null,
 created_at timestamptz not null default now(),primary key(organization_id,request_id)
);
alter table private.input_commands enable row level security;
revoke all on private.input_commands from public,anon,authenticated;
create function private.audit_operational() returns trigger language plpgsql security definer set search_path='' as $$
declare prev jsonb; nxt jsonb;
begin
 if TG_OP='UPDATE' then prev=to_jsonb(old); end if;nxt=to_jsonb(new);
 insert into public.audit_logs(organization_id,user_id,action,entity,entity_id,domain,old_value,new_value)
 values((nxt->>'organization_id')::uuid,auth.uid(),TG_OP,TG_TABLE_NAME,nxt->>'id','operational',prev,nxt);return new;
end $$;
revoke all on function private.audit_operational() from public,anon,authenticated;
do $$ declare tab text;begin
 foreach tab in array array['inputs','input_purchases','inventory_movements','input_cost_history'] loop
  execute format('alter table public.%I enable row level security',tab);
  execute format('revoke all on public.%I from public,anon,authenticated',tab);
  execute format('grant select on public.%I to authenticated',tab);
  execute format('create policy operational_read on public.%I for select to authenticated using(private.has_permission(organization_id,''operational.read''))',tab);
  execute format('create trigger operational_audit after insert or update on public.%I for each row execute function private.audit_operational()',tab);
 end loop;
end $$;
create function private.input_decimal(value text,digits integer,places integer) returns numeric language plpgsql immutable security invoker set search_path='' as $$
begin
 if value is null or value !~ ('^[0-9]{1,'||digits||'}(\.[0-9]{1,'||places||'})?$') then raise exception 'Invalid decimal' using errcode='22023'; end if;
 return value::numeric;
end $$;
revoke all on function private.input_decimal(text,integer,integer) from public,anon,authenticated;
create function private.convert_input_quantity(quantity numeric,unit_from text,unit_to text) returns numeric language plpgsql immutable security invoker set search_path='' as $$
declare group_from text;group_to text;factor_from numeric;factor_to numeric;result numeric;
begin
 group_from=case when unit_from in ('g','kg') then 'mass' when unit_from in ('ml','l') then 'volume' when unit_from in ('metro','cm') then 'length' when unit_from='unidade' then 'count' end;
 group_to=case when unit_to in ('g','kg') then 'mass' when unit_to in ('ml','l') then 'volume' when unit_to in ('metro','cm') then 'length' when unit_to='unidade' then 'count' end;
 if quantity is null or quantity<=0 or group_from is null or group_to is null or group_from<>group_to then raise exception 'Incompatible units' using errcode='22023'; end if;
 factor_from=case when unit_from in ('kg','l') then 1000 when unit_from='metro' then 100 else 1 end;
 factor_to=case when unit_to in ('kg','l') then 1000 when unit_to='metro' then 100 else 1 end;
 result=quantity*factor_from/factor_to;
 if result<>round(result,6) or result>999999999999.999999 then raise exception 'Quantity precision exceeded' using errcode='22023'; end if;
 return result;
end $$;
revoke all on function private.convert_input_quantity(numeric,text,text) from public,anon,authenticated;
create function private.write_input(org uuid,request_id uuid,payload jsonb) returns uuid language plpgsql security definer set search_path='' as $$
declare operation text=payload->>'operation';target uuid=nullif(payload->>'id','')::uuid;previous public.inputs;saved private.input_commands;
 label text;code text;unit text;input_category text;supplier text;minimum numeric;input_active boolean;movement_date date;
 qty numeric;converted numeric;price numeric;freight numeric;taxes numeric;other_costs numeric;final_cost numeric;unit_cost numeric;
 quantity_after numeric;value_after numeric;average_after numeric;delta numeric;value_delta numeric;reason text;purchase uuid;movement uuid;
begin
 if auth.uid() is null or not private.has_permission(org,'operational.write') then raise exception 'Forbidden' using errcode='42501'; end if;
 if request_id is null or payload is null or operation is null or operation not in ('save','purchase','adjust') then raise exception 'Invalid request' using errcode='22023'; end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(org::text||request_id::text,2));
 select * into saved from private.input_commands c where c.organization_id=org and c.request_id=write_input.request_id;
 if found then
  if saved.payload<>payload then raise exception 'Idempotency key already used' using errcode='22023'; end if;return saved.result_id;
 end if;
 if target is not null then
  select * into previous from public.inputs where id=target and organization_id=org for update;
  if not found then raise exception 'Input unavailable' using errcode='42501'; end if;
  if coalesce(payload->>'version','') !~ '^[0-9]{1,9}$' or (payload->>'version')::integer<>previous.version then raise exception 'Stale version' using errcode='40001'; end if;
 elsif operation<>'save' then raise exception 'Missing input' using errcode='22023'; end if;
 if operation='save' then
  label=trim(payload->>'name');code=upper(trim(payload->>'sku'));unit=payload->>'base_unit';input_category=coalesce(trim(payload->>'category'),'');supplier=coalesce(trim(payload->>'default_supplier'),'');
  minimum=private.input_decimal(payload->>'minimum_stock',12,6);input_active=coalesce((payload->>'active')::boolean,true);
  if label is null or length(label) not between 1 and 200 or code is null or code !~ '^[A-Z0-9._-]{1,64}$' or unit is null or unit not in ('g','kg','ml','l','unidade','metro','cm') or length(input_category)>100 or length(supplier)>200 then raise exception 'Invalid input fields' using errcode='22023'; end if;
  if target is null then
   insert into public.inputs(organization_id,name,sku,base_unit,category,minimum_stock,default_supplier,active,created_by)
   values(org,label,code,unit,input_category,minimum,supplier,input_active,auth.uid()) returning id into target;
  else
   if unit<>previous.base_unit then raise exception 'Base unit is immutable' using errcode='22023'; end if;
   update public.inputs set name=label,sku=code,category=input_category,minimum_stock=minimum,default_supplier=supplier,active=input_active,version=version+1,updated_at=now() where id=target;
  end if;
 else
  if not previous.active then raise exception 'Input is inactive' using errcode='22023'; end if;
  if coalesce(payload->>'date','') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' then raise exception 'Invalid date' using errcode='22023'; end if;
  movement_date=(payload->>'date')::date;
  if movement_date<date '1900-01-01' or movement_date>(now() at time zone 'America/Sao_Paulo')::date or movement_date<previous.last_movement_date then raise exception 'Movement date precedes history or is future' using errcode='22023'; end if;
  if operation='purchase' then
   supplier=trim(payload->>'supplier');unit=payload->>'purchase_unit';qty=private.input_decimal(payload->>'quantity',12,6);
   if supplier is null or length(supplier) not between 1 and 200 then raise exception 'Supplier required' using errcode='22023'; end if;
   converted=private.convert_input_quantity(qty,unit,previous.base_unit);
   price=private.input_decimal(payload->>'total_price',13,2);freight=private.input_decimal(payload->>'freight',13,2);taxes=private.input_decimal(payload->>'taxes',13,2);other_costs=private.input_decimal(payload->>'other_costs',13,2);
   final_cost=price+freight+taxes+other_costs;
   if final_cost<=0 or final_cost>9999999999999.99 then raise exception 'Invalid total cost' using errcode='22023'; end if;
   unit_cost=round(final_cost/converted,6);delta=converted;value_delta=final_cost;reason='Compra de insumo';
   insert into public.input_purchases(organization_id,input_id,supplier,purchase_date,quantity,purchase_unit,converted_quantity,total_price,freight,taxes,other_costs,final_cost,unit_cost,created_by)
   values(org,target,supplier,movement_date,qty,unit,converted,price,freight,taxes,other_costs,final_cost,unit_cost,auth.uid()) returning id into purchase;
   insert into public.input_cost_history(organization_id,input_id,purchase_id,quantity,total_value,unit_cost,date) values(org,target,purchase,converted,final_cost,unit_cost,movement_date);
  else
   quantity_after=private.input_decimal(payload->>'counted_quantity',12,6);delta=quantity_after-previous.stock_quantity;reason=trim(payload->>'reason');
   if delta=0 or reason is null or length(reason) not between 3 and 500 then raise exception 'Adjustment reason or quantity invalid' using errcode='22023'; end if;
   if delta>0 then
    unit_cost=private.input_decimal(payload->>'unit_cost',14,6);value_delta=round(delta*unit_cost,6);
   else
    value_delta=case when quantity_after=0 then -previous.stock_value else -round((-delta)*previous.stock_value/previous.stock_quantity,6) end;
   end if;
  end if;
  quantity_after=previous.stock_quantity+delta;value_after=previous.stock_value+value_delta;
  average_after=case when quantity_after>0 then round(value_after/quantity_after,6) else previous.average_cost end;
  update public.inputs set stock_quantity=quantity_after,stock_value=value_after,average_cost=average_after,last_cost=case when operation='purchase' then unit_cost else last_cost end,last_movement_date=movement_date,version=version+1,updated_at=now() where id=target;
  movement=gen_random_uuid();
  insert into public.inventory_movements(id,organization_id,input_id,type,quantity,value_change,stock_after,average_cost_after,movement_date,source_type,source_id,reason,created_by)
  values(movement,org,target,case when operation='purchase' then 'purchase' else 'manual_adjustment' end,delta,value_delta,quantity_after,average_after,movement_date,case when operation='purchase' then 'purchase' else 'adjustment' end,coalesce(purchase,movement),reason,auth.uid());
 end if;
 insert into private.input_commands(organization_id,request_id,payload,result_id) values(org,request_id,payload,target);return target;
end $$;
revoke all on function private.write_input(uuid,uuid,jsonb) from public,anon;
grant execute on function private.write_input(uuid,uuid,jsonb) to authenticated;
create function public.save_input(org uuid,request_id uuid,payload jsonb) returns uuid language sql security invoker set search_path='' as $$select private.write_input(org,request_id,payload);$$;
revoke all on function public.save_input(uuid,uuid,jsonb) from public,anon;
grant execute on function public.save_input(uuid,uuid,jsonb) to authenticated;

create function private.verify_input_stock() returns trigger language plpgsql security definer set search_path='' as $$
declare target uuid;row public.inputs;quantity numeric;value numeric;
begin
 if TG_TABLE_NAME='inputs' then target=coalesce(new.id,old.id);else target=coalesce(new.input_id,old.input_id);end if;
 select * into row from public.inputs where id=target;if not found then return null;end if;
 select coalesce(sum(m.quantity),0),coalesce(sum(m.value_change),0) into quantity,value from public.inventory_movements m where m.input_id=target and m.organization_id=row.organization_id;
 if quantity<>row.stock_quantity or value<>row.stock_value or (quantity>0 and row.average_cost is distinct from round(value/quantity,6)) then raise exception 'Inventory history mismatch' using errcode='23514';end if;return null;
end $$;
revoke all on function private.verify_input_stock() from public,anon,authenticated;
create constraint trigger check_input_stock after insert or update on public.inputs deferrable initially deferred for each row execute function private.verify_input_stock();
create constraint trigger check_inventory_stock after insert or update or delete on public.inventory_movements deferrable initially deferred for each row execute function private.verify_input_stock();

create function public.get_inputs(org uuid,search text default '',page integer default 1) returns jsonb language plpgsql stable security invoker set search_path='' as $$
declare result jsonb;pattern text;
begin
 if auth.uid() is null or not private.has_permission(org,'operational.read') then raise exception 'Forbidden' using errcode='42501';end if;
 if page is null or page not between 1 and 100000 or length(search)>100 then raise exception 'Invalid filter' using errcode='22023';end if;
 pattern='%'||replace(replace(replace(coalesce(search,''),'\','\\'),'%','\%'),'_','\_')||'%';
 with filtered as materialized(select * from public.inputs where organization_id=org and (name ilike pattern or sku ilike pattern))
 select jsonb_build_object('total',(select count(*) from filtered),'items',coalesce((select jsonb_agg(to_jsonb(r)) from(
  select id,name,sku,category,base_unit,stock_quantity::text,minimum_stock::text,average_cost::text,last_cost::text,default_supplier,active,version,last_movement_date,
  stock_quantity<minimum_stock as low_stock from filtered order by lower(name),id limit 25 offset(page-1)*25
 ) r),'[]'::jsonb)) into result;return result;
end $$;
revoke all on function public.get_inputs(uuid,text,integer) from public,anon;
grant execute on function public.get_inputs(uuid,text,integer) to authenticated;
create function public.get_input_history(org uuid,input uuid,page integer default 1) returns jsonb language plpgsql stable security invoker set search_path='' as $$
declare result jsonb;
begin
 if auth.uid() is null or not private.has_permission(org,'operational.read') then raise exception 'Forbidden' using errcode='42501';end if;
 if input is null or page is null or page not between 1 and 100000 then raise exception 'Invalid request' using errcode='22023';end if;
 if not exists(select 1 from public.inputs where id=input and organization_id=org) then raise exception 'Input unavailable' using errcode='42501';end if;
 select jsonb_build_object('total',(select count(*) from public.inventory_movements where input_id=input and organization_id=org),'items',coalesce((select jsonb_agg(to_jsonb(r)) from(
  select m.id,m.type,m.quantity::text,m.value_change::text,m.stock_after::text,m.average_cost_after::text,m.movement_date,m.reason,
  p.supplier,p.final_cost::text,p.unit_cost::text,p.purchase_unit,p.quantity::text as purchased_quantity
  from public.inventory_movements m left join public.input_purchases p on p.id=m.source_id and p.organization_id=m.organization_id and m.source_type='purchase'
  where m.input_id=input and m.organization_id=org order by m.created_at desc,m.id limit 25 offset(page-1)*25
 ) r),'[]'::jsonb)) into result;return result;
end $$;
revoke all on function public.get_input_history(uuid,uuid,integer) from public,anon;
grant execute on function public.get_input_history(uuid,uuid,integer) to authenticated;


create table public.products(
 id uuid primary key default gen_random_uuid(),organization_id uuid not null references public.organizations(id),
 name text not null check(length(trim(name)) between 1 and 200),internal_sku text not null check(internal_sku ~ '^[A-Z0-9._-]{1,64}$'),
 category text not null default '' check(length(category)<=100),description text not null default '' check(length(description)<=2000),
 default_sale_price numeric(15,2) not null default 0 check(default_sale_price>=0),minimum_margin numeric(7,4) not null default 0 check(minimum_margin between 0 and 100),
 active boolean not null default true,version integer not null default 1,created_by uuid not null references auth.users(id),created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
 unique(organization_id,internal_sku),unique(id,organization_id)
);
create index products_creator_idx on public.products(created_by);
create table public.product_variants(
 id uuid primary key default gen_random_uuid(),organization_id uuid not null references public.organizations(id),product_id uuid not null,
 name text not null check(length(trim(name)) between 1 and 100),sku text not null check(sku ~ '^[A-Z0-9._-]{1,64}$'),attributes jsonb not null default '{}',
 price numeric(15,2) not null check(price>=0),active boolean not null default true,version integer not null default 1,
 production jsonb not null default '{}',other_direct_costs numeric(15,6) not null default 0 check(other_direct_costs>=0),overhead_percentage numeric(7,4) not null default 0 check(overhead_percentage between 0 and 100),
 created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
 foreign key(product_id,organization_id) references public.products(id,organization_id),unique(organization_id,sku),unique(id,organization_id)
);
create index product_variants_product_idx on public.product_variants(product_id,organization_id);
create table public.product_components(
 id uuid primary key default gen_random_uuid(),organization_id uuid not null references public.organizations(id),product_variant_id uuid not null,input_id uuid not null,
 quantity numeric(18,6) not null check(quantity>0),unit text not null check(unit in ('g','kg','ml','l','unidade','metro','cm')),waste_percentage numeric(7,4) not null check(waste_percentage between 0 and 100),
 foreign key(product_variant_id,organization_id) references public.product_variants(id,organization_id),foreign key(input_id,organization_id) references public.inputs(id,organization_id),unique(product_variant_id,input_id)
);
create index product_components_input_idx on public.product_components(input_id,organization_id);
create index product_components_org_idx on public.product_components(organization_id);
create table public.product_revisions(
 id uuid primary key default gen_random_uuid(),organization_id uuid not null references public.organizations(id),entity_id uuid not null,entity_type text not null check(entity_type in ('product','variant')),
 version integer not null,payload jsonb not null,created_by uuid not null references auth.users(id),created_at timestamptz not null default now(),unique(organization_id,entity_type,entity_id,version)
);
create index product_revisions_creator_idx on public.product_revisions(created_by);
create table private.product_commands(organization_id uuid not null references public.organizations(id),request_id uuid not null,payload jsonb not null,result_id uuid not null,created_at timestamptz not null default now(),primary key(organization_id,request_id));
alter table private.product_commands enable row level security;
revoke all on private.product_commands from public,anon,authenticated;
do $$ declare tab text;begin
 foreach tab in array array['products','product_variants','product_components','product_revisions'] loop
  execute format('alter table public.%I enable row level security',tab);
  execute format('revoke all on public.%I from public,anon,authenticated',tab);
  execute format('grant select on public.%I to authenticated',tab);
  execute format('create policy operational_read on public.%I for select to authenticated using(private.has_permission(organization_id,''operational.read''))',tab);
  execute format('create trigger operational_audit after insert or update on public.%I for each row execute function private.audit_operational()',tab);
 end loop;
end $$;
create function private.write_product(org uuid,request_id uuid,payload jsonb) returns uuid language plpgsql security definer set search_path='' as $$
declare kind text=payload->>'kind';target uuid=nullif(payload->>'id','')::uuid;parent uuid;old_product public.products;old_variant public.product_variants;command private.product_commands;
 label text;code text;amount numeric;margin numeric;ver integer;sheet jsonb;components jsonb;part jsonb;material public.inputs;filament uuid;field text;n numeric;attrs jsonb;
begin
 if auth.uid() is null or not private.has_permission(org,'operational.write') then raise exception 'Forbidden' using errcode='42501';end if;
 if request_id is null or kind is null or kind not in ('product','variant') or jsonb_typeof(payload)<>'object' then raise exception 'Invalid request' using errcode='22023';end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(org::text||request_id::text,3));
 select * into command from private.product_commands c where c.organization_id=org and c.request_id=write_product.request_id;
 if found then if command.payload<>payload then raise exception 'Request reused' using errcode='22023';end if;return command.result_id;end if;
 label=trim(payload->>'name');code=upper(trim(payload->>'sku'));amount=private.input_decimal(payload->>'price',13,2);
 if label is null or length(label) not between 1 and (case when kind='product' then 200 else 100 end) or code is null or code !~ '^[A-Z0-9._-]{1,64}$' then raise exception 'Invalid name or SKU' using errcode='22023';end if;
 if kind='product' then
  margin=private.input_decimal(payload->>'minimum_margin',3,4);
  if margin>100 or length(coalesce(payload->>'category',''))>100 or length(coalesce(payload->>'description',''))>2000 then raise exception 'Invalid product fields' using errcode='22023';end if;
  if target is not null then
   select * into old_product from public.products p where p.id=target and p.organization_id=org for update;
   if not found then raise exception 'Product unavailable' using errcode='42501';end if;
   if coalesce(payload->>'version','')<>old_product.version::text then raise exception 'Stale version' using errcode='40001';end if;
   update public.products set name=label,internal_sku=code,category=coalesce(payload->>'category',''),description=coalesce(payload->>'description',''),default_sale_price=amount,minimum_margin=margin,active=coalesce((payload->>'active')::boolean,true),version=version+1,updated_at=now() where id=target returning version into ver;
  else
   insert into public.products(organization_id,name,internal_sku,category,description,default_sale_price,minimum_margin,active,created_by) values(org,label,code,coalesce(payload->>'category',''),coalesce(payload->>'description',''),amount,margin,coalesce((payload->>'active')::boolean,true),auth.uid()) returning id,version into target,ver;
  end if;
 else
  parent=(payload->>'product_id')::uuid;
  select * into old_product from public.products p where p.id=parent and p.organization_id=org for update;
  if not found then raise exception 'Product unavailable' using errcode='42501';end if;
  if not old_product.active then raise exception 'Product inactive' using errcode='22023';end if;
  if target is not null then
   select * into old_variant from public.product_variants v where v.id=target and v.product_id=parent and v.organization_id=org for update;
   if not found then raise exception 'Variant unavailable' using errcode='42501';end if;
   if coalesce(payload->>'version','')<>old_variant.version::text then raise exception 'Stale version' using errcode='40001';end if;
  elsif (select count(*) from public.product_variants where product_id=parent)>=100 then raise exception 'Maximum 100 variants' using errcode='22023';end if;
  attrs=coalesce(payload->'attributes','{}');if jsonb_typeof(attrs)<>'object' or length(attrs::text)>2000 then raise exception 'Invalid attributes' using errcode='22023';end if;
  sheet=coalesce(payload->'production','{}');components=coalesce(payload->'components','[]');
  if jsonb_typeof(sheet)<>'object' or jsonb_typeof(components)<>'array' or jsonb_array_length(components)>100 then raise exception 'Invalid cost sheet' using errcode='22023';end if;
  if sheet<>'{}'::jsonb then
   select jsonb_object_agg(key,value #>> '{}') into sheet from jsonb_each(sheet);
   filament=(sheet->>'filament_id')::uuid;
   select * into material from public.inputs i where i.id=filament and i.organization_id=org for share;
   if not found or not material.active or material.base_unit not in ('g','kg') then raise exception 'Invalid filament' using errcode='22023';end if;
   foreach field in array array['piece_weight_g','support_weight_g','purge_weight_g','print_time_minutes','printer_power_watts','electricity_price_kwh','machine_hour_cost','maintenance_cost_per_hour','labor_minutes','labor_hour_cost'] loop
    n=private.input_decimal(sheet->>field,9,6);
   end loop;
   n=private.input_decimal(sheet->>'failed_print_rate',1,6);if n>=1 then raise exception 'Invalid failure rate' using errcode='22023';end if;
   n=private.input_decimal(sheet->>'quantity_per_batch',6,1);if n<1 or n<>trunc(n) then raise exception 'Invalid batch' using errcode='22023';end if;
   if (sheet->>'piece_weight_g')::numeric+(sheet->>'support_weight_g')::numeric+(sheet->>'purge_weight_g')::numeric<=0 then raise exception 'Batch weight required' using errcode='22023';end if;
  end if;
  margin=private.input_decimal(payload->>'overhead_percentage',3,4);n=private.input_decimal(payload->>'other_direct_costs',9,6);
  if margin>100 then raise exception 'Invalid overhead' using errcode='22023';end if;
  if target is null then
   insert into public.product_variants(organization_id,product_id,name,sku,price,active,attributes,production,other_direct_costs,overhead_percentage) values(org,parent,label,code,amount,coalesce((payload->>'active')::boolean,true),attrs,sheet,n,margin) returning id,version into target,ver;
  else
   update public.product_variants set name=label,sku=code,price=amount,active=coalesce((payload->>'active')::boolean,true),attributes=attrs,production=sheet,other_direct_costs=n,overhead_percentage=margin,version=version+1,updated_at=now() where id=target returning version into ver;
   delete from public.product_components where product_variant_id=target;
  end if;
  for part in select value from jsonb_array_elements(components) loop
   select * into material from public.inputs i where i.id=(part->>'input_id')::uuid and i.organization_id=org for share;
   if not found or not material.active then raise exception 'Material unavailable' using errcode='22023';end if;
   if material.id=filament then raise exception 'Filament duplicated in BOM' using errcode='22023';end if;
   n=private.input_decimal(part->>'quantity',12,6);perform private.convert_input_quantity(n,part->>'unit',material.base_unit);
   margin=private.input_decimal(part->>'waste_percentage',3,4);if margin>100 then raise exception 'Invalid waste' using errcode='22023';end if;
   insert into public.product_components(organization_id,product_variant_id,input_id,quantity,unit,waste_percentage) values(org,target,material.id,n,part->>'unit',margin);
  end loop;
 end if;
 insert into public.product_revisions(organization_id,entity_id,entity_type,version,payload,created_by) values(org,target,kind,ver,payload,auth.uid());
 insert into private.product_commands(organization_id,request_id,payload,result_id) values(org,request_id,payload,target);return target;
end $$;
revoke all on function private.write_product(uuid,uuid,jsonb) from public,anon;
grant execute on function private.write_product(uuid,uuid,jsonb) to authenticated;
create function public.save_product(org uuid,request_id uuid,payload jsonb) returns uuid language sql security invoker set search_path='' as $$select private.write_product(org,request_id,payload);$$;
revoke all on function public.save_product(uuid,uuid,jsonb) from public,anon;
grant execute on function public.save_product(uuid,uuid,jsonb) to authenticated;

create function public.get_products(org uuid,search text default '',page integer default 1,selected uuid default null) returns jsonb language plpgsql stable security invoker set search_path='' as $$
declare result jsonb;pattern text;
begin
 if auth.uid() is null or not private.has_permission(org,'operational.read') then raise exception 'Forbidden' using errcode='42501';end if;
 if page is null or page not between 1 and 100000 or length(search)>100 then raise exception 'Invalid filter' using errcode='22023';end if;
 pattern='%'||replace(replace(replace(coalesce(search,''),'\','\\'),'%','\%'),'_','\_')||'%';
 with filtered as materialized(select p.id,p.name,p.internal_sku,p.category,p.description,p.default_sale_price::text,p.minimum_margin::text,p.active,p.version,
 (select count(*) from public.product_variants v where v.product_id=p.id) as variant_count from public.products p where p.organization_id=org and (selected is null or p.id=selected) and (p.name ilike pattern or p.internal_sku ilike pattern))
 select jsonb_build_object('total',(select count(*) from filtered),'items',coalesce((select jsonb_agg(to_jsonb(r)) from(select * from filtered order by lower(name),id limit 25 offset(page-1)*25) r),'[]'::jsonb)) into result;return result;
end $$;
revoke all on function public.get_products(uuid,text,integer,uuid) from public,anon;
grant execute on function public.get_products(uuid,text,integer,uuid) to authenticated;
create function public.get_product_variants(org uuid,product uuid) returns jsonb language plpgsql stable security invoker set search_path='' as $$
declare result jsonb;
begin
 if auth.uid() is null or not private.has_permission(org,'operational.read') then raise exception 'Forbidden' using errcode='42501';end if;
 if not exists(select 1 from public.products where id=product and organization_id=org) then raise exception 'Product unavailable' using errcode='42501';end if;
 select coalesce(jsonb_agg(to_jsonb(r)),'[]'::jsonb) into result from(
  select v.id,v.name,v.sku,v.price::text,v.attributes,v.active,v.version,v.production,v.other_direct_costs::text,v.overhead_percentage::text,
  (select jsonb_build_object('id',i.id,'name',i.name,'base_unit',i.base_unit,'average_cost',i.average_cost::text,'active',i.active,'version',i.version) from public.inputs i where i.id=nullif(v.production->>'filament_id','')::uuid and i.organization_id=org) as filament,
  coalesce((select jsonb_agg(jsonb_build_object('input_id',c.input_id,'name',i.name,'quantity',c.quantity::text,'unit',c.unit,'waste_percentage',c.waste_percentage::text,'base_unit',i.base_unit,'average_cost',i.average_cost::text,'active',i.active,'input_version',i.version) order by c.id) from public.product_components c join public.inputs i on i.id=c.input_id and i.organization_id=c.organization_id where c.product_variant_id=v.id),'[]'::jsonb) as components
  from public.product_variants v where v.organization_id=org and v.product_id=product order by lower(v.name),v.id limit 100
 ) r;return result;
end $$;
revoke all on function public.get_product_variants(uuid,uuid) from public,anon;
grant execute on function public.get_product_variants(uuid,uuid) to authenticated;


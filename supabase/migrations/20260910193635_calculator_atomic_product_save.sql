create function public.get_calculator_materials(org uuid) returns jsonb language plpgsql stable security invoker set search_path='' as $$
begin
 if auth.uid() is null or not private.has_permission(org,'operational.read') then raise exception 'Forbidden' using errcode='42501';end if;
 return coalesce((select jsonb_agg(to_jsonb(r)) from(select id,name,sku,base_unit,average_cost::text,active,version from public.inputs where organization_id=org order by name,id limit 1001)r),'[]'::jsonb);
end $$;
revoke all on function public.get_calculator_materials(uuid) from public,anon;
grant execute on function public.get_calculator_materials(uuid) to authenticated;
create function private.save_calculator(org uuid,request_id uuid,product_payload jsonb,variant_payload jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare p uuid;v uuid;cmd private.product_commands;request jsonb=jsonb_build_object('product',product_payload,'variant',variant_payload);
begin
 if auth.uid() is null or not private.has_permission(org,'operational.write') then raise exception 'Forbidden' using errcode='42501';end if;
 if request_id is null or product_payload is null or variant_payload is null then raise exception 'Invalid request' using errcode='22023';end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(org::text||request_id::text,4));
 select * into cmd from private.product_commands c where c.organization_id=org and c.request_id=save_calculator.request_id;
 if found then
  if cmd.payload<>request then raise exception 'Request reused' using errcode='22023';end if;
  select product_id into p from public.product_variants where id=cmd.result_id and organization_id=org;
  return jsonb_build_object('product_id',p,'variant_id',cmd.result_id);
 end if;
 p=nullif(product_payload->>'id','')::uuid;
 if p is null then
  if nullif(variant_payload->>'id','') is not null then raise exception 'Invalid parent' using errcode='22023';end if;
  p=private.write_product(org,gen_random_uuid(),product_payload||'{"kind":"product"}');
 else
  if not exists(select 1 from public.products where id=p and organization_id=org) then raise exception 'Product unavailable' using errcode='42501';end if;
 end if;
 v=private.write_product(org,gen_random_uuid(),variant_payload||jsonb_build_object('kind','variant','product_id',p));
 insert into private.product_commands(organization_id,request_id,payload,result_id) values(org,request_id,request,v);
 return jsonb_build_object('product_id',p,'variant_id',v);
end $$;
revoke all on function private.save_calculator(uuid,uuid,jsonb,jsonb) from public,anon;
grant execute on function private.save_calculator(uuid,uuid,jsonb,jsonb) to authenticated;
create function public.save_calculator(org uuid,request_id uuid,product_payload jsonb,variant_payload jsonb) returns jsonb language sql security invoker set search_path='' as $$select private.save_calculator(org,request_id,product_payload,variant_payload);$$;
revoke all on function public.save_calculator(uuid,uuid,jsonb,jsonb) from public,anon;
grant execute on function public.save_calculator(uuid,uuid,jsonb,jsonb) to authenticated;

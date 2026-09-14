create or replace function public.get_inputs(org uuid,search text default '',page integer default 1) returns jsonb language plpgsql stable security invoker set search_path='' as $$
declare result jsonb;pattern text;
begin
 if auth.uid() is null or not private.has_permission(org,'operational.read') then raise exception 'Forbidden' using errcode='42501';end if;
 if page is null or page not between 1 and 100000 or length(search)>100 then raise exception 'Invalid filter' using errcode='22023';end if;
 pattern='%'||replace(replace(replace(coalesce(search,''),'\','\\'),'%','\%'),'_','\_')||'%';
 with filtered as materialized(select * from public.inputs where organization_id=org and (name ilike pattern or sku ilike pattern))
 select jsonb_build_object('total',(select count(*) from filtered),'items',coalesce((select jsonb_agg(to_jsonb(r)) from(
  select id,name,sku,category,base_unit,stock_quantity::text,minimum_stock::text,average_cost::text,last_cost::text,default_supplier,active,version,last_movement_date,
  stock_quantity<minimum_stock as low_stock from filtered order by (sku=upper(search)) desc,lower(name),id limit 25 offset(page-1)*25
 ) r),'[]'::jsonb)) into result;return result;
end $$;
revoke all on function public.get_inputs(uuid,text,integer) from public,anon;
grant execute on function public.get_inputs(uuid,text,integer) to authenticated;


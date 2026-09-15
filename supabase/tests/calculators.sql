begin;
select set_config('request.jwt.claim.sub','d957f820-c4cf-4dee-9a77-82073ef38a1c',true);
set local role authenticated;
do $$
declare org uuid='89390efb-61eb-4cda-b284-7834a0f2b142';req uuid=gen_random_uuid();p jsonb='{"name":"QA calculadora rollback","sku":"QA-CALC-ROLLBACK","price":"100","minimum_margin":"20"}';v jsonb='{"name":"Padrão","sku":"QA-CALC-ROLLBACK-01","price":"100","other_direct_costs":"30","overhead_percentage":"0","attributes":{"calculator":{"mode":"ml","commission":"12"}}}';r jsonb;repeat_result jsonb;
begin
 begin perform public.save_calculator(org,gen_random_uuid(),p,v||'{"sku":"INVALID SKU"}');raise exception 'Invalid variant accepted';exception when sqlstate '22023' then null;end;
 if exists(select 1 from public.products where organization_id=org and internal_sku='QA-CALC-ROLLBACK') then raise exception 'Partial product escaped rollback';end if;
 r=public.save_calculator(org,req,p,v);repeat_result=public.save_calculator(org,req,p,v);if r<>repeat_result then raise exception 'Retry mismatch';end if;
 if (select count(*) from public.products where organization_id=org and internal_sku='QA-CALC-ROLLBACK')<>1 then raise exception 'Duplicate product';end if;
 perform public.save_calculator(org,gen_random_uuid(),jsonb_build_object('id',r->>'product_id'),v||jsonb_build_object('id',r->>'variant_id','version','1','other_direct_costs','40'));
 if not exists(select 1 from public.product_variants where id=(r->>'variant_id')::uuid and other_direct_costs=40 and version=2) then raise exception 'Update failed';end if;
 begin perform public.save_calculator(org,gen_random_uuid(),jsonb_build_object('id',r->>'product_id'),v||jsonb_build_object('id',r->>'variant_id','version','1'));raise exception 'Stale update accepted';exception when sqlstate '40001' then null;end;
 perform set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',true);
 begin perform public.save_calculator(org,gen_random_uuid(),p,v);raise exception 'Unauthorized create accepted';exception when insufficient_privilege then null;end;
end $$;
reset role;
select 'calculator atomic save tests passed; fixtures rolled back' as result;
rollback;

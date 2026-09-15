begin;
select set_config('request.jwt.claim.sub','d957f820-c4cf-4dee-9a77-82073ef38a1c',true);
set local role authenticated;
do $$
#variable_conflict use_variable
declare org uuid='89390efb-61eb-4cda-b284-7834a0f2b142'; prod uuid; variant uuid; material uuid;req uuid; p jsonb;sheet jsonb;r jsonb;
begin
 material=public.save_input(org,gen_random_uuid(),'{"operation":"save","name":"QA material","sku":"QA-PRODUCT-MATERIAL","base_unit":"g","minimum_stock":"0"}');
 perform public.save_input(org,gen_random_uuid(),jsonb_build_object('operation','purchase','id',material,'version',1,'supplier','QA','date',current_date::text,'quantity','1','purchase_unit','kg','total_price','75','freight','0','taxes','0','other_costs','0'));
 prod=public.save_product(org,gen_random_uuid(),'{"kind":"product","name":"QA Produto","sku":"QA-PRODUCT","price":"20","minimum_margin":"10"}');
 req=gen_random_uuid();p=jsonb_build_object('kind','variant','product_id',prod,'name','Preto','sku','QA-PRODUCT-PRETO','price','20','other_direct_costs','0','overhead_percentage','0','components',jsonb_build_array(jsonb_build_object('input_id',material,'quantity','75','unit','g','waste_percentage','10')));
 variant=public.save_product(org,req,p);perform public.save_product(org,req,p);
 if (select count(*) from public.product_variants where product_id=prod)<>1 then raise exception 'Duplicate retry';end if;
 r=public.get_product_variants(org,prod);if r->0->'components'->0->>'average_cost'<>'0.075000' then raise exception 'Cost read incorrect';end if;
 p=p||jsonb_build_object('id',variant,'version','1','name','Preto atualizado');
 -- The variant UPDATE and BOM DELETE must roll back when a later component fails.
 begin perform public.save_product(org,gen_random_uuid(),p||jsonb_build_object('components',jsonb_build_array(jsonb_build_object('input_id',material,'quantity','1','unit','l','waste_percentage','0'))));raise exception 'Incompatible unit accepted';exception when sqlstate '22023' then null;end;
 if not exists(select 1 from public.product_variants v where v.id=variant and v.name='Preto' and version=1) or (select quantity from public.product_components where product_variant_id=variant)<>75 then raise exception 'Partial write escaped rollback';end if;
 perform public.save_product(org,gen_random_uuid(),p);
 begin perform public.save_product(org,gen_random_uuid(),p);raise exception 'Stale update accepted';exception when sqlstate '40001' then null;end;
 sheet=jsonb_build_object('filament_id',material,'quantity_per_batch','2','failed_print_rate','0.1','piece_weight_g','100','support_weight_g','10','purge_weight_g','10','print_time_minutes','120','printer_power_watts','200','electricity_price_kwh','1','machine_hour_cost','2','maintenance_cost_per_hour','0.5','labor_minutes','30','labor_hour_cost','20');
 begin perform public.save_product(org,gen_random_uuid(),p||jsonb_build_object('version','2','production',sheet));raise exception 'Duplicate filament accepted';exception when sqlstate '22023' then null;end;
 perform public.save_product(org,gen_random_uuid(),p||jsonb_build_object('version','2','production',sheet,'components','[]'::jsonb));
 begin perform public.save_product(org,gen_random_uuid(),p||jsonb_build_object('version','3','production',sheet||'{"failed_print_rate":"1"}','components','[]'::jsonb));raise exception '100 percent failure accepted';exception when sqlstate '22023' then null;end;
 begin perform public.save_product(org,gen_random_uuid(),p||jsonb_build_object('version','3','production',sheet||'{"quantity_per_batch":"0"}','components','[]'::jsonb));raise exception 'Empty batch accepted';exception when sqlstate '22023' then null;end;
 if (select count(*) from public.product_revisions where entity_id=variant)<>3 then raise exception 'Revision history incorrect';end if;
 if (select stock_quantity from public.inputs i where i.id=material)<>1000 then raise exception 'Catalog consumed stock';end if;
 begin update public.products set name='No permission' where products.id=prod;raise exception 'Direct write allowed';exception when insufficient_privilege then null;end;
 perform set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',true);
 if exists(select 1 from public.products where products.id=prod) then raise exception 'RLS leak';end if;
 begin perform public.get_product_variants(org,prod);raise exception 'Unauthorized read allowed';exception when insufficient_privilege then null;end;
end $$;
reset role;
set constraints all immediate;
select 'product integration tests passed; all fixtures rolled back' as result;
rollback;

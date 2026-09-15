begin;
select set_config('request.jwt.claim.sub','d957f820-c4cf-4dee-9a77-82073ef38a1c',true);
set local role authenticated;
do $$
#variable_conflict use_variable
declare org uuid='89390efb-61eb-4cda-b284-7834a0f2b142'; id uuid; req uuid; p jsonb; r jsonb; v integer;
begin
 id=public.save_input(org,gen_random_uuid(),'{"operation":"save","name":"Teste transacional insumo","sku":"TEST-ROLLBACK-INPUT","base_unit":"g","minimum_stock":"100","category":"Filamento"}');
 perform public.save_input(org,gen_random_uuid(),jsonb_build_object('operation','save','id',id,'version',1,'name','Teste editado','sku','TEST-ROLLBACK-INPUT','base_unit','g','minimum_stock','200','category','Material','active',true));
 req=gen_random_uuid();
 p=jsonb_build_object('operation','purchase','id',id,'version',2,'supplier','Teste','date',current_date::text,'quantity','1','purchase_unit','kg','total_price','75','freight','5','taxes','0','other_costs','0');
 perform public.save_input(org,req,p);perform public.save_input(org,req,p);
 if (select count(*) from public.input_purchases where input_id=id)<>1 then raise exception 'Duplicate purchase';end if;
 if not exists(select 1 from public.inputs i where i.id=id and stock_quantity=1000 and stock_value=80 and average_cost=0.08 and category='Material') then raise exception 'First cost incorrect';end if;
 perform public.save_input(org,gen_random_uuid(),p||jsonb_build_object('version',3,'total_price','120','freight','0'));
 if not exists(select 1 from public.inputs i where i.id=id and stock_quantity=2000 and stock_value=200 and average_cost=0.1) then raise exception 'Weighted average incorrect';end if;
 perform public.save_input(org,gen_random_uuid(),jsonb_build_object('operation','adjust','id',id,'version',4,'date',current_date::text,'counted_quantity','1500','reason','Contagem de teste'));
 if not exists(select 1 from public.inputs i where i.id=id and stock_quantity=1500 and stock_value=150 and average_cost=0.1) then raise exception 'Removal incorrect';end if;
 perform public.save_input(org,gen_random_uuid(),jsonb_build_object('operation','adjust','id',id,'version',5,'date',current_date::text,'counted_quantity','0','reason','Zerar teste'));
 perform public.save_input(org,gen_random_uuid(),jsonb_build_object('operation','adjust','id',id,'version',6,'date',current_date::text,'counted_quantity','100','unit_cost','0.12','reason','Entrada teste'));
 if not exists(select 1 from public.inputs i where i.id=id and stock_quantity=100 and stock_value=12 and average_cost=0.12) then raise exception 'Addition incorrect';end if;
 begin perform public.save_input(org,gen_random_uuid(),p||'{"version":7,"purchase_unit":"l"}');raise exception 'Invalid unit accepted';exception when sqlstate '22023' then null;end;
 begin perform public.save_input(org,gen_random_uuid(),p||'{"version":7,"quantity":"-1"}');raise exception 'Negative accepted';exception when sqlstate '22023' then null;end;
 begin perform public.save_input(org,gen_random_uuid(),p||jsonb_build_object('version',7,'date',(current_date+1)::text));raise exception 'Future accepted';exception when sqlstate '22023' then null;end;
 begin perform public.save_input(org,gen_random_uuid(),p||jsonb_build_object('version',7,'date',(current_date-1)::text));raise exception 'Past accepted';exception when sqlstate '22023' then null;end;
 begin perform public.save_input(org,gen_random_uuid(),p);raise exception 'Stale version accepted';exception when sqlstate '40001' then null;end;
 begin update public.inputs set name='Unauthorized' where inputs.id=id;raise exception 'Direct write accepted';exception when insufficient_privilege then null;end;
 r=public.get_input_history(org,id,1);if (r->>'total')::int<>5 then raise exception 'History incorrect';end if;
 r=public.get_inputs(org,'TEST-ROLLBACK-INPUT',1);if (r->>'total')::int<>1 then raise exception 'Search incorrect';end if;
 perform set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',true);
 if exists(select 1 from public.inputs i where i.id=id) then raise exception 'RLS leak';end if;
 begin perform public.save_input(org,gen_random_uuid(),p);raise exception 'Unauthorized write accepted';exception when insufficient_privilege then null;end;
end $$;
reset role;
set constraints all immediate;
select 'inputs integration tests passed; rollback follows' as result;
rollback;


begin;
select set_config('request.jwt.claim.sub','d957f820-c4cf-4dee-9a77-82073ef38a1c',true);
set local role authenticated;
do $$
declare org uuid='89390efb-61eb-4cda-b284-7834a0f2b142';mat uuid;v uuid;p jsonb;r jsonb;ch uuid;sale uuid;run uuid;req uuid=gen_random_uuid();today text=(now() at time zone 'America/Sao_Paulo')::date::text;account uuid;cat uuid;expense uuid;purchase uuid;entry uuid;version integer;
begin
 mat=public.save_input(org,gen_random_uuid(),'{"operation":"save","name":"QA fluxo","sku":"QA-FLOW-MAT","base_unit":"g","minimum_stock":"0"}');
 perform public.save_input(org,gen_random_uuid(),jsonb_build_object('operation','purchase','id',mat,'version','1','supplier','QA','date',today,'quantity','1000','purchase_unit','g','total_price','100','freight','0','taxes','0','other_costs','0'));
 r=public.save_calculator(org,gen_random_uuid(),'{"name":"QA fluxo","sku":"QA-FLOW-P","price":"20","minimum_margin":"20"}',jsonb_build_object('name','Padrão','sku','QA-FLOW-V','price','20','other_direct_costs','1','overhead_percentage','0','components',jsonb_build_array(jsonb_build_object('input_id',mat,'quantity','10','unit','g','waste_percentage','0'))));v=(r->>'variant_id')::uuid;
 p=jsonb_build_object('operation','produce','variant_id',v,'quantity','10','date',today,'kind','production');r=public.operate(org,req,p);run=(r->>'id')::uuid;perform public.operate(org,req,p);
 if (select stock_quantity from public.inputs where id=mat)<>900 then raise exception 'Consumption/retry failed';end if;
 if (select quantity from public.finished_stock where variant_id=v)<>10 then raise exception 'Finished stock failed';end if;
 ch=(public.operate(org,gen_random_uuid(),'{"operation":"channel","name":"QA CHANNEL"}')->>'id')::uuid;
 p=jsonb_build_object('operation','sale','channel_id',ch,'external_id','QA-001','date',today,'stock_mode','stock','fees','2','items',jsonb_build_array(jsonb_build_object('variant_id',v,'quantity','3','price','20')));
 r=public.operate(org,gen_random_uuid(),p);sale=(r->>'id')::uuid;
 if (select profit from public.sales_orders where id=sale)<>52 then raise exception 'Profit failed';end if;
 if (select quantity from public.finished_stock where variant_id=v)<>7 or (select stock_quantity from public.inputs where id=mat)<>900 then raise exception 'Double consumption';end if;
 begin perform public.operate(org,gen_random_uuid(),p);raise exception 'Duplicate accepted';exception when unique_violation then null;end;
 begin perform public.operate(org,gen_random_uuid(),p||jsonb_build_object('external_id','QA-FAIL','items',jsonb_build_array(jsonb_build_object('variant_id',v,'quantity','100','price','20'))));raise exception 'Oversell accepted';exception when raise_exception then if SQLERRM='Oversell accepted' then raise;end if;end;
 if (select quantity from public.finished_stock where variant_id=v)<>7 then raise exception 'Rollback failed';end if;
 select id into account from public.contas_bancarias where empresa_id=org and ativa and deletada_em is null and moeda='BRL' limit 1;
 select id into cat from public.categorias where empresa_id=org and tipo in ('receita','ambos') and deletada_em is null limit 1;
 if account is not null and cat is not null then
  perform public.operate(org,gen_random_uuid(),jsonb_build_object('operation','receive','id',sale,'date',today,'amount','58','account_id',account,'category_id',cat));
  if (select received from public.sales_orders where id=sale)<>58 then raise exception 'Receipt failed';end if;
  select id into expense from public.categorias where empresa_id=org and tipo in ('despesa','ambos') and deletada_em is null limit 1;
  if expense is not null then
   perform public.operate(org,gen_random_uuid(),jsonb_build_object('operation','refund','id',sale,'date',today,'amount','58','account_id',account,'category_id',expense));
   perform public.operate(org,gen_random_uuid(),jsonb_build_object('operation','cancel_sale','id',sale,'date',today,'reason','QA cancelamento'));
   perform public.operate(org,gen_random_uuid(),jsonb_build_object('operation','reverse_production','id',run,'date',today,'reason','QA estorno'));
   if (select stock_quantity from public.inputs where id=mat)<>1000 or (select quantity from public.finished_stock where variant_id=v)<>0 then raise exception 'Reversal mismatch';end if;
   select i.version into version from public.inputs i where id=mat;
   purchase=public.purchase_input(org,gen_random_uuid(),jsonb_build_object('operation','purchase','id',mat,'version',version,'supplier','QA','date',today,'quantity','7','purchase_unit','g','total_price','3','freight','0','taxes','0','other_costs','0'),jsonb_build_object('status','pending','account_id',account,'category_id',expense,'due_date',today));
   select entry_id into entry from public.purchase_financial_links where purchase_id=purchase;
   if entry is null then raise exception 'Missing purchase finance link';end if;
   perform public.save_financial_entry(org,gen_random_uuid(),jsonb_build_object('operation','settle','id',entry,'version','1','amount','3','paid_date',today));
   if (select paid_amount from public.transacoes where id=entry)<>3 then raise exception 'Purchase settlement failed';end if;
  end if;
 end if;
 req=gen_random_uuid();p='{"kind":"inputs","row":{"sku":"QA-IMPORT","name":"QA import","unit":"unidade"}}';perform public.import_row(org,req,p);r=public.import_row(org,req,p);if r->>'duplicate'<>'true' then raise exception 'Import retry failed';end if;
 perform public.operation_data(org,'dashboard','{}');perform public.operation_data(org,'sales','{}');perform public.operation_data(org,'stock','{}');
 perform set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',true);
 begin perform public.operation_data(org,'dashboard','{}');raise exception 'Access leaked';exception when insufficient_privilege then null;end;
end $$;
reset role;
set constraints all immediate;
select 'production/sales/receipts/rollback/access passed' result;
rollback;

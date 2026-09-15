begin;
do $test$
declare actor uuid; org uuid; account uuid; category uuid; import_result jsonb; workspace jsonb; draft uuid; second_result jsonb;
begin
 select user_id,organization_id into strict actor,org from public.user_roles where role_id='administrator' limit 1;
 perform set_config('request.jwt.claims',jsonb_build_object('sub',actor,'role','authenticated')::text,true);
 execute 'set local role authenticated';
 account=public.save_financial_catalog(org,gen_random_uuid(),'{"kind":"account","name":"Teste extrato rollback","type":"bancaria","opening_balance":"0.00"}');
 category=public.save_financial_catalog(org,gen_random_uuid(),'{"kind":"category","name":"Teste extrato rollback","type":"despesa"}');
 import_result=public.import_bank_statement(org,gen_random_uuid(),jsonb_build_object(
  'account_id',account,'file_name','extrato.csv','file_hash',repeat('a',64),
  'rows',jsonb_build_array(jsonb_build_object('date','2026-09-10','description','Tarifa Banco Mensal 12345','amount','12.30','type','despesa','reference','A1','recurrence_key','tarifa banco mensal','fingerprint','00000000-0000-4000-a000-000000000001'))
 ));
 if import_result->>'pending_count'<>'1' or import_result->>'imported_count'<>'0' then raise exception 'First statement should wait for category'; end if;
 workspace=public.get_bank_statement_workspace(org,1);
 draft=(workspace->'items'->0->>'id')::uuid;
 perform public.resolve_bank_statement_draft(org,gen_random_uuid(),jsonb_build_object('operation','categorize','draft_id',draft,'category_id',category));
 if not exists(select 1 from public.transacoes where source_type='bank_statement' and source_id=draft and status='paid' and paid_amount=12.30) then raise exception 'Draft was not materialized as paid statement entry'; end if;
 if not exists(select 1 from public.bank_statement_category_rules where organization_id=org and account_id=account and match_key='tarifa banco mensal' and category_id=category) then raise exception 'Rule was not learned'; end if;
 second_result=public.import_bank_statement(org,gen_random_uuid(),jsonb_build_object(
  'account_id',account,'file_name','extrato-2.csv','file_hash',repeat('b',64),
  'rows',jsonb_build_array(jsonb_build_object('date','2026-10-10','description','Tarifa Banco Mensal 67890','amount','12.30','type','despesa','reference','A2','recurrence_key','tarifa banco mensal','fingerprint','00000000-0000-4000-a000-000000000002'))
 ));
 if second_result->>'imported_count'<>'1' or second_result->>'pending_count'<>'0' then raise exception 'Learned rule did not auto import recurring row'; end if;
 second_result=public.import_bank_statement(org,gen_random_uuid(),jsonb_build_object(
  'account_id',account,'file_name','extrato-duplicado.csv','file_hash',repeat('c',64),
  'rows',jsonb_build_array(jsonb_build_object('date','2026-10-10','description','Tarifa Banco Mensal 67890','amount','12.30','type','despesa','reference','A2','recurrence_key','tarifa banco mensal','fingerprint','00000000-0000-4000-a000-000000000002'))
 ));
 if second_result->>'duplicate_count'<>'1' then raise exception 'Duplicate row was imported'; end if;
 execute 'reset role';
 update public.user_roles set role_id='viewer' where organization_id=org and user_id=actor;
 execute 'set local role authenticated';
 perform public.get_bank_statement_workspace(org,1);
 begin perform public.import_bank_statement(org,gen_random_uuid(),'{}'); raise exception 'Viewer imported statement'; exception when insufficient_privilege then null; end;
 execute 'reset role';execute 'set local role anon';
 begin perform public.get_bank_statement_workspace(org,1); raise exception 'Anon read statement workspace'; exception when insufficient_privilege then null; end;
 execute 'reset role';
end $test$;
rollback;
select 'PASS: bank statement upload, pending categorization, learned recurring rules, duplicate protection, paid entry materialization and authorization; rolled back' as result;

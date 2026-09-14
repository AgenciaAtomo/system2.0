begin;
do $test$
declare actor uuid; org uuid; r text; n integer;
begin
 select id into strict actor from auth.users where email='agenciaatomo10@gmail.com';
 select organization_id into strict org from public.organization_members where user_id=actor;
 perform set_config('request.jwt.claims',jsonb_build_object('sub',actor,'role','authenticated')::text,true);
 execute 'set local role authenticated';
 if not private.has_permission(org,'settings.manage') then raise exception 'admin permission failed'; end if;
 select count(*) into n from public.transacoes; if n<>2 then raise exception 'admin cannot see preserved transactions'; end if;
 begin
  insert into public.user_roles values(org,actor,'viewer',now());
  raise exception 'role self assignment allowed';
 exception when insufficient_privilege then null; end;
 begin
  delete from public.audit_logs;
  raise exception 'audit deletion allowed';
 exception when insufficient_privilege then null; end;
 execute 'reset role';
 foreach r in array array['viewer','operational','financial'] loop
  delete from public.user_roles where organization_id=org and user_id=actor;
  insert into public.user_roles(organization_id,user_id,role_id) values(org,actor,r);
  execute 'set local role authenticated';
  if private.has_permission(org,'settings.manage') then raise exception 'privilege escalation for %',r; end if;
  if r='viewer' and (private.has_permission(org,'financial.write') or private.has_permission(org,'financial.audit')) then raise exception 'viewer writes/audits'; end if;
  if r='operational' and private.has_permission(org,'financial.read') then raise exception 'operational finance exposure'; end if;
  if r='financial' and private.has_permission(org,'operational.write') then raise exception 'financial operational write'; end if;
  select count(*) into n from public.transacoes;
  if r='operational' and n<>0 then raise exception 'operational RLS failure'; end if;
  if r in ('viewer','financial') and n<>2 then raise exception 'authorized finance read failure'; end if;
  execute 'reset role';
 end loop;
 update public.organization_members set active=false where organization_id=org and user_id=actor;
 execute 'set local role authenticated';
 select count(*) into n from public.organizations; if n<>0 then raise exception 'revoked access'; end if;
 select count(*) into n from public.transacoes; if n<>0 then raise exception 'revoked finance access'; end if;
 execute 'reset role';
 perform set_config('request.jwt.claims',jsonb_build_object('sub',gen_random_uuid(),'role','authenticated')::text,true);
 execute 'set local role authenticated';
 select count(*) into n from public.organizations; if n<>0 then raise exception 'non member access'; end if;
 execute 'reset role';
 execute 'set local role anon';
 begin
  perform 1 from public.transacoes;
  raise exception 'anonymous access allowed';
 exception when insufficient_privilege then null; end;
 execute 'reset role';
 for r in select tablename from pg_tables where schemaname='foundation_restore' loop
 execute format('select count(*) from ((select * from public.%I except select * from foundation_restore.%I) union all (select * from foundation_restore.%I except select * from public.%I)) d',r,r,r,r) into n;
 if n<>0 then raise exception 'original data changed: %',r; end if;
 end loop;
end $test$;
rollback;
select 'PASS: admin, viewer, operational, financial, revoked, non-member, anon, immutable audit, role protection and legacy preservation' as result;

alter table public.transacoes drop constraint transacoes_source_check;
alter table public.transacoes add constraint transacoes_source_check check(source_type in ('legacy','manual','sale_receipt','sale_refund','input_purchase','bank_statement'));

create table public.bank_statement_imports(
 id uuid primary key default gen_random_uuid(),
 organization_id uuid not null references public.organizations(id),
 account_id uuid not null,
 file_name text not null check(length(trim(file_name)) between 1 and 240),
 file_hash text not null check(file_hash ~ '^[a-f0-9]{64}$'),
 imported_count integer not null default 0 check(imported_count>=0),
 pending_count integer not null default 0 check(pending_count>=0),
 duplicate_count integer not null default 0 check(duplicate_count>=0),
 created_by uuid not null references auth.users(id),
 created_at timestamptz not null default now(),
 foreign key(account_id,organization_id) references public.contas_bancarias(id,empresa_id) on delete restrict,
 unique(id,organization_id)
);
create index bank_statement_imports_org_idx on public.bank_statement_imports(organization_id,created_at desc,id);
create index bank_statement_imports_account_idx on public.bank_statement_imports(account_id,organization_id);
alter table public.bank_statement_imports enable row level security;
revoke all on public.bank_statement_imports from public,anon,authenticated;
grant select on public.bank_statement_imports to authenticated;
create policy bank_statement_imports_read on public.bank_statement_imports for select to authenticated using(private.has_permission(organization_id,'financial.read'));

create table public.bank_statement_drafts(
 id uuid primary key default gen_random_uuid(),
 organization_id uuid not null references public.organizations(id),
 import_id uuid not null,
 account_id uuid not null,
 transaction_date date not null check(transaction_date between date '1900-01-01' and date '2199-12-31'),
 description text not null check(length(trim(description)) between 1 and 500),
 amount numeric(15,2) not null check(amount>0),
 type text not null check(type in ('receita','despesa')),
 category_id uuid,
 recurrence_key text not null check(length(recurrence_key) between 1 and 240),
 fingerprint uuid not null,
 reference text not null default '' check(length(reference)<=120),
 is_recurring boolean not null default false,
 status text not null default 'pending' check(status in ('pending','imported','ignored')),
 imported_entry_id uuid,
 created_by uuid not null references auth.users(id),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 foreign key(import_id,organization_id) references public.bank_statement_imports(id,organization_id) on delete restrict,
 foreign key(account_id,organization_id) references public.contas_bancarias(id,empresa_id) on delete restrict,
 foreign key(category_id,organization_id) references public.categorias(id,empresa_id) on delete restrict,
 foreign key(imported_entry_id,organization_id) references public.transacoes(id,empresa_id) on delete restrict,
 unique(organization_id,account_id,fingerprint),
 unique(id,organization_id)
);
create index bank_statement_drafts_pending_idx on public.bank_statement_drafts(organization_id,status,transaction_date desc,id);
create index bank_statement_drafts_import_idx on public.bank_statement_drafts(import_id,organization_id);
create index bank_statement_drafts_rule_idx on public.bank_statement_drafts(organization_id,type,recurrence_key);
alter table public.bank_statement_drafts enable row level security;
revoke all on public.bank_statement_drafts from public,anon,authenticated;
grant select on public.bank_statement_drafts to authenticated;
create policy bank_statement_drafts_read on public.bank_statement_drafts for select to authenticated using(private.has_permission(organization_id,'financial.read'));

create table public.bank_statement_category_rules(
 id uuid primary key default gen_random_uuid(),
 organization_id uuid not null references public.organizations(id),
 account_id uuid,
 type text not null check(type in ('receita','despesa')),
 match_key text not null check(length(match_key) between 1 and 240),
 category_id uuid not null,
 last_description text not null check(length(last_description) between 1 and 500),
 use_count integer not null default 1 check(use_count>0),
 created_by uuid not null references auth.users(id),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 foreign key(account_id,organization_id) references public.contas_bancarias(id,empresa_id) on delete restrict,
 foreign key(category_id,organization_id) references public.categorias(id,empresa_id) on delete restrict,
 unique(organization_id,account_id,type,match_key)
);
create index bank_statement_rules_match_idx on public.bank_statement_category_rules(organization_id,type,match_key,use_count desc);
alter table public.bank_statement_category_rules enable row level security;
revoke all on public.bank_statement_category_rules from public,anon,authenticated;
grant select on public.bank_statement_category_rules to authenticated;
create policy bank_statement_rules_read on public.bank_statement_category_rules for select to authenticated using(private.has_permission(organization_id,'financial.read'));

create table private.bank_statement_commands(
 organization_id uuid not null references public.organizations(id),
 request_id uuid not null,
 payload jsonb not null,
 result jsonb not null,
 created_at timestamptz not null default now(),
 primary key(organization_id,request_id)
);
alter table private.bank_statement_commands enable row level security;
revoke all on private.bank_statement_commands from public,anon,authenticated;

create trigger audit_bank_statement_import after insert or update on public.bank_statement_imports for each row execute function private.audit_finance_catalog();
create trigger audit_bank_statement_draft after insert or update on public.bank_statement_drafts for each row execute function private.audit_finance_catalog();
create trigger audit_bank_statement_rule after insert or update on public.bank_statement_category_rules for each row execute function private.audit_finance_catalog();

create function private.bank_statement_key(value text) returns text
language sql immutable set search_path='' as $$
 select left(trim(regexp_replace(lower(coalesce(value,'')),'[^[:alnum:]]+',' ','g')),240);
$$;
revoke all on function private.bank_statement_key(text) from public,anon,authenticated;

create function private.materialize_bank_statement_draft(org uuid,draft uuid,category uuid,request_id uuid,learn_rule boolean default true) returns uuid
language plpgsql security definer set search_path='' as $$
declare draft_row public.bank_statement_drafts; import_name text; category_type text; entry uuid;
begin
 select * into draft_row from public.bank_statement_drafts where id=draft and organization_id=org for update;
 if not found or draft_row.status<>'pending' then raise exception 'Draft unavailable' using errcode='23505'; end if;
 select file_name into import_name from public.bank_statement_imports where id=draft_row.import_id and organization_id=org;
 select tipo into category_type from public.categorias where id=category and empresa_id=org and deletada_em is null for share;
 if not found or category_type not in (draft_row.type,'ambos') then raise exception 'Invalid category' using errcode='22023'; end if;
 if learn_rule then
  insert into public.bank_statement_category_rules(organization_id,account_id,type,match_key,category_id,last_description,created_by)
  values(org,draft_row.account_id,draft_row.type,draft_row.recurrence_key,category,draft_row.description,auth.uid())
  on conflict(organization_id,account_id,type,match_key) do update set category_id=excluded.category_id,last_description=excluded.last_description,use_count=public.bank_statement_category_rules.use_count+1,updated_at=now();
 end if;
 entry=private.write_financial_entry(org,request_id,jsonb_build_object(
  'operation','save','type',draft_row.type,'description',draft_row.description,'amount',draft_row.amount::text,'status','paid',
  'account_id',draft_row.account_id,'category_id',category,'cost_center_id','',
  'competence_date',draft_row.transaction_date,'due_date',draft_row.transaction_date,'paid_date',draft_row.transaction_date,
  'notes','Importação de extrato bancário · '||coalesce(import_name,'extrato')
 ));
 update public.transacoes set source_type='bank_statement',source_id=draft_row.id,atualizada_em=now() where id=entry and empresa_id=org;
 update public.bank_statement_drafts set status='imported',category_id=category,imported_entry_id=entry,updated_at=now() where id=draft_row.id and organization_id=org;
 return entry;
end $$;
revoke all on function private.materialize_bank_statement_draft(uuid,uuid,uuid,uuid,boolean) from public,anon,authenticated;

create function private.import_bank_statement(org uuid,request_id uuid,payload jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare saved private.bank_statement_commands; result jsonb; import_id uuid; account uuid; item jsonb; draft uuid; category uuid; category_type text;
 imported integer=0; pending integer=0; duplicates integer=0; key text; recurring boolean; file_name text; file_hash text;
begin
 if auth.uid() is null or not private.has_permission(org,'financial.write') then raise exception 'Forbidden' using errcode='42501'; end if;
 if request_id is null or payload is null or jsonb_typeof(payload)<>'object' or jsonb_typeof(payload->'rows')<>'array' or jsonb_array_length(payload->'rows') not between 1 and 500 then raise exception 'Invalid request' using errcode='22023'; end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(org::text||request_id::text,2));
 select * into saved from private.bank_statement_commands c where c.organization_id=org and c.request_id=import_bank_statement.request_id;
 if found then
  if saved.payload<>payload then raise exception 'Idempotency key already used' using errcode='22023'; end if;
  return saved.result;
 end if;
 account=nullif(payload->>'account_id','')::uuid;file_name=trim(payload->>'file_name');file_hash=payload->>'file_hash';
 if file_name is null or length(file_name) not between 1 and 240 or file_hash is null or file_hash !~ '^[a-f0-9]{64}$' then raise exception 'Invalid file' using errcode='22023'; end if;
 perform 1 from public.contas_bancarias where id=account and empresa_id=org and ativa and deletada_em is null and moeda='BRL' for share;
 if not found then raise exception 'Invalid account' using errcode='22023'; end if;
 insert into public.bank_statement_imports(organization_id,account_id,file_name,file_hash,created_by) values(org,account,file_name,file_hash,auth.uid()) returning id into import_id;
 for item in select * from jsonb_array_elements(payload->'rows') loop
  key=left(coalesce(nullif(trim(item->>'recurrence_key'),''),private.bank_statement_key(item->>'description')),240);
  if coalesce(item->>'date','') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' or coalesce(item->>'amount','') !~ '^[0-9]{1,13}(\.[0-9]{1,2})?$'
   or item->>'type' not in ('receita','despesa') or length(trim(item->>'description')) not between 1 and 500
   or key='' or coalesce(item->>'fingerprint','') !~ '^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-a[0-9a-f]{3}-[0-9a-f]{12}$' then raise exception 'Invalid row' using errcode='22023'; end if;
  category=null;
  select r.category_id,c.tipo into category,category_type from public.bank_statement_category_rules r
   join public.categorias c on c.id=r.category_id and c.empresa_id=r.organization_id and c.deletada_em is null
   where r.organization_id=org and r.type=item->>'type' and r.match_key=key and (r.account_id=account or r.account_id is null) and c.tipo in (item->>'type','ambos')
   order by case when r.account_id=account then 0 else 1 end,r.use_count desc,r.updated_at desc limit 1;
  recurring=category is not null or exists(select 1 from public.bank_statement_drafts d where d.organization_id=org and d.type=item->>'type' and d.recurrence_key=key);
  draft=null;
  insert into public.bank_statement_drafts(organization_id,import_id,account_id,transaction_date,description,amount,type,category_id,recurrence_key,fingerprint,reference,is_recurring,created_by)
  values(org,import_id,account,(item->>'date')::date,trim(item->>'description'),(item->>'amount')::numeric,item->>'type',category,key,(item->>'fingerprint')::uuid,left(coalesce(item->>'reference',''),120),recurring,auth.uid())
  on conflict(organization_id,account_id,fingerprint) do nothing returning id into draft;
  if draft is null then
   duplicates=duplicates+1;
  elsif category is not null then
   perform private.materialize_bank_statement_draft(org,draft,category,gen_random_uuid(),true);
   imported=imported+1;
  else
   pending=pending+1;
  end if;
 end loop;
 update public.bank_statement_imports set imported_count=imported,pending_count=pending,duplicate_count=duplicates where id=import_id and organization_id=org;
 result=jsonb_build_object('import_id',import_id,'imported_count',imported,'pending_count',pending,'duplicate_count',duplicates);
 insert into private.bank_statement_commands(organization_id,request_id,payload,result) values(org,request_id,payload,result);
 return result;
end $$;
revoke all on function private.import_bank_statement(uuid,uuid,jsonb) from public,anon;
grant execute on function private.import_bank_statement(uuid,uuid,jsonb) to authenticated;
create function public.import_bank_statement(org uuid,request_id uuid,payload jsonb) returns jsonb
language sql security invoker set search_path='' as $$ select private.import_bank_statement(org,request_id,payload); $$;
revoke all on function public.import_bank_statement(uuid,uuid,jsonb) from public,anon;
grant execute on function public.import_bank_statement(uuid,uuid,jsonb) to authenticated;

create function private.resolve_bank_statement_draft(org uuid,request_id uuid,payload jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare saved private.bank_statement_commands; operation text=payload->>'operation'; draft uuid=nullif(payload->>'draft_id','')::uuid; category uuid=nullif(payload->>'category_id','')::uuid; entry uuid; result jsonb;
begin
 if auth.uid() is null or not private.has_permission(org,'financial.write') then raise exception 'Forbidden' using errcode='42501'; end if;
 if request_id is null or operation not in ('categorize','ignore') or draft is null or (operation='categorize' and category is null) then raise exception 'Invalid request' using errcode='22023'; end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(org::text||request_id::text,3));
 select * into saved from private.bank_statement_commands c where c.organization_id=org and c.request_id=resolve_bank_statement_draft.request_id;
 if found then
  if saved.payload<>payload then raise exception 'Idempotency key already used' using errcode='22023'; end if;
  return saved.result;
 end if;
 if operation='ignore' then
  update public.bank_statement_drafts set status='ignored',updated_at=now() where id=draft and organization_id=org and status='pending' returning jsonb_build_object('draft_id',id,'operation','ignore') into result;
  if result is null then raise exception 'Draft unavailable' using errcode='23505'; end if;
 else
  entry=private.materialize_bank_statement_draft(org,draft,category,request_id,true);
  result=jsonb_build_object('draft_id',draft,'entry_id',entry,'operation','categorize');
 end if;
 insert into private.bank_statement_commands(organization_id,request_id,payload,result) values(org,request_id,payload,result);
 return result;
end $$;
revoke all on function private.resolve_bank_statement_draft(uuid,uuid,jsonb) from public,anon;
grant execute on function private.resolve_bank_statement_draft(uuid,uuid,jsonb) to authenticated;
create function public.resolve_bank_statement_draft(org uuid,request_id uuid,payload jsonb) returns jsonb
language sql security invoker set search_path='' as $$ select private.resolve_bank_statement_draft(org,request_id,payload); $$;
revoke all on function public.resolve_bank_statement_draft(uuid,uuid,jsonb) from public,anon;
grant execute on function public.resolve_bank_statement_draft(uuid,uuid,jsonb) to authenticated;

create function public.get_bank_statement_workspace(org uuid,page integer default 1) returns jsonb
language plpgsql stable security invoker set search_path='' as $$
declare result jsonb;
begin
 if auth.uid() is null or not private.has_permission(org,'financial.read') then raise exception 'Forbidden' using errcode='42501'; end if;
 if page is null or page not between 1 and 100000 then raise exception 'Invalid page' using errcode='22023'; end if;
 select jsonb_build_object(
  'pending_total',(select count(*) from public.bank_statement_drafts where organization_id=org and status='pending'),
  'page',page,
  'items',coalesce((select jsonb_agg(to_jsonb(r)) from (
   select d.id,d.transaction_date,d.description,d.amount::text,d.type,d.is_recurring,i.file_name as import_name
   from public.bank_statement_drafts d join public.bank_statement_imports i on i.id=d.import_id and i.organization_id=d.organization_id
   where d.organization_id=org and d.status='pending' order by d.transaction_date desc,d.created_at desc,d.id limit 25 offset (page-1)*25
  ) r),'[]'::jsonb),
  'imports',coalesce((select jsonb_agg(to_jsonb(r)) from (
   select id,file_name,created_at,imported_count,pending_count,duplicate_count
   from public.bank_statement_imports where organization_id=org order by created_at desc,id limit 10
  ) r),'[]'::jsonb)
 ) into result;
 return result;
end $$;
revoke all on function public.get_bank_statement_workspace(uuid,integer) from public,anon;
grant execute on function public.get_bank_statement_workspace(uuid,integer) to authenticated;

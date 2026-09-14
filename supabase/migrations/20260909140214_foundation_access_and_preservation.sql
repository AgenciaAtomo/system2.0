-- Execução remota incremental autorizada sem Docker.
-- Preserva public.empresas/usuarios/contas_bancarias/categorias/transacoes/alertas_saldo.
create schema foundation_restore;
revoke all on schema foundation_restore from public,anon,authenticated;
do $$ declare t text; begin
 foreach t in array array['empresas','usuarios','contas_bancarias','categorias','transacoes','alertas_saldo'] loop
 execute format('create table foundation_restore.%I as table public.%I',t,t);
 execute format('alter table foundation_restore.%I enable row level security',t);
 execute format('revoke all on foundation_restore.%I from public,anon,authenticated',t);
 end loop;
end $$;
create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;
create table public.organizations (
 id uuid primary key references public.empresas(id),
 name text not null check (length(trim(name)) between 1 and 160),
 active boolean not null default true,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create table public.profiles (
 id uuid primary key references auth.users(id),
 display_name text not null check (length(trim(display_name)) between 1 and 160),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create table public.organization_members (
 organization_id uuid not null references public.organizations(id),
 user_id uuid not null references public.profiles(id),
 active boolean not null default true,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 primary key(organization_id,user_id)
);
create index organization_members_user_idx on public.organization_members(user_id,organization_id) where active;
create table public.roles (
 id text primary key check(id in ('administrator','financial','operational','viewer')),
 name text not null,
 created_at timestamptz not null default now()
);
create table public.permissions (
 id text primary key,
 created_at timestamptz not null default now()
);
create table public.role_permissions (
 role_id text not null references public.roles(id),
 permission_id text not null references public.permissions(id),
 primary key(role_id,permission_id)
);
create index role_permissions_permission_idx on public.role_permissions(permission_id);
create table public.user_roles (
 organization_id uuid not null,
 user_id uuid not null,
 role_id text not null references public.roles(id),
 created_at timestamptz not null default now(),
 primary key(organization_id,user_id,role_id),
 foreign key(organization_id,user_id) references public.organization_members(organization_id,user_id)
);
create index user_roles_user_idx on public.user_roles(user_id,organization_id);
create index user_roles_role_idx on public.user_roles(role_id);
create table public.audit_logs (
 id uuid primary key default gen_random_uuid(),
 organization_id uuid not null references public.organizations(id),
 user_id uuid references auth.users(id),
 action text not null,
 entity text not null,
 entity_id text not null,
 domain text not null check(domain in ('settings','financial','operational','sales')),
 old_value jsonb,
 new_value jsonb,
 created_at timestamptz not null default now()
);
create index audit_logs_org_time_idx on public.audit_logs(organization_id,created_at desc);
create index audit_logs_user_idx on public.audit_logs(user_id);
create table public.attachments (
 id uuid primary key default gen_random_uuid(),
 organization_id uuid not null references public.organizations(id),
 bucket_id text not null check(bucket_id='be-organization-documents'),
 object_path text not null unique,
 original_name text not null check(length(original_name) between 1 and 255),
 mime_type text not null check(mime_type in ('application/pdf','image/png','image/jpeg')),
 size_bytes bigint not null check(size_bytes between 1 and 10485760),
 created_by uuid not null references auth.users(id),
 entity_type text not null check(entity_type='organization'),
 entity_id uuid not null references public.organizations(id),
 state text not null default 'pending' check(state in ('pending','confirmed','failed')),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 check(entity_id=organization_id),
 check(object_path=organization_id::text||'/'||id::text)
);
create index attachments_org_idx on public.attachments(organization_id,created_at desc);
create index attachments_author_idx on public.attachments(created_by);
create index attachments_entity_idx on public.attachments(entity_id);
-- Lookup elevation is limited to current identity; avoids recursive membership policies.
create function private.is_member(org uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and exists (
 select 1 from public.organization_members m join public.organizations o on o.id=m.organization_id
 where m.organization_id=org and m.user_id=(select auth.uid()) and m.active and o.active);
$$;
create function private.has_permission(org uuid, requested text) returns boolean
language sql stable security definer set search_path='' as $$
 select private.is_member(org) and exists (
 select 1 from public.user_roles ur join public.role_permissions rp on rp.role_id=ur.role_id
 where ur.organization_id=org and ur.user_id=(select auth.uid()) and rp.permission_id=requested);
$$;
revoke all on function private.is_member(uuid), private.has_permission(uuid,text) from public,anon;
grant execute on function private.is_member(uuid), private.has_permission(uuid,text) to authenticated;
-- No application role receives direct writes to memberships or role assignments.
do $$ declare t text; begin
 foreach t in array array['organizations','profiles','organization_members','roles','permissions','role_permissions','user_roles','audit_logs','attachments'] loop
 execute format('alter table public.%I enable row level security',t);
 execute format('revoke all on public.%I from public,anon,authenticated',t);
 execute format('grant select on public.%I to authenticated',t);
 end loop;
end $$;
create policy organizations_read on public.organizations for select to authenticated using(private.is_member(id));
create policy profiles_read on public.profiles for select to authenticated using(id=(select auth.uid()));
create policy members_read on public.organization_members for select to authenticated
 using(private.is_member(organization_id) and (user_id=(select auth.uid()) or private.has_permission(organization_id,'settings.manage')));
create policy roles_read on public.roles for select to authenticated
 using(exists(select 1 from public.organization_members m where m.user_id=(select auth.uid()) and m.active));
create policy permissions_read on public.permissions for select to authenticated
 using(exists(select 1 from public.organization_members m where m.user_id=(select auth.uid()) and m.active));
create policy role_permissions_read on public.role_permissions for select to authenticated
 using(exists(select 1 from public.organization_members m where m.user_id=(select auth.uid()) and m.active));
create policy user_roles_read on public.user_roles for select to authenticated
 using(private.is_member(organization_id) and (user_id=(select auth.uid()) or private.has_permission(organization_id,'settings.manage')));
create policy audit_read on public.audit_logs for select to authenticated
 using(private.has_permission(organization_id,domain||'.audit'));
create policy attachments_read on public.attachments for select to authenticated
 using(private.has_permission(organization_id,'settings.manage'));
grant insert on public.attachments to authenticated;
create policy attachments_insert on public.attachments for insert to authenticated
 with check(private.has_permission(organization_id,'settings.manage')
 and created_by=(select auth.uid()) and state='pending' and entity_type='organization' and entity_id=organization_id);
create function private.audit_change() returns trigger
language plpgsql security definer set search_path='' as $$
declare previous jsonb; following jsonb; record_value jsonb; org uuid;
begin
 if TG_OP<>'INSERT' then previous=to_jsonb(old); end if;
 if TG_OP<>'DELETE' then following=to_jsonb(new); end if;
 record_value=coalesce(following,previous);
 org=(record_value->>'organization_id')::uuid;
 if org is null then org=(record_value->>'id')::uuid; end if;
 insert into public.audit_logs(organization_id,user_id,action,entity,entity_id,domain,old_value,new_value)
 values(org,auth.uid(),TG_OP,TG_TABLE_NAME,coalesce(record_value->>'id',record_value->>'user_id'),'settings',previous,following);
 return coalesce(new,old);
end; $$;
revoke all on function private.audit_change() from public,anon,authenticated;
create trigger audit_organization after insert or update on public.organizations for each row execute function private.audit_change();
create trigger audit_membership after insert or update or delete on public.organization_members for each row execute function private.audit_change();
create trigger audit_user_role after insert or update or delete on public.user_roles for each row execute function private.audit_change();
create trigger audit_attachment after insert or update on public.attachments for each row execute function private.audit_change();

-- Catalogs are system data; not demo transactions.
insert into public.roles(id,name) values
 ('administrator','Administrador'),('financial','Financeiro'),('operational','Operacional'),('viewer','Visualização');
insert into public.permissions(id) values
 ('settings.manage'),('settings.audit'),
 ('financial.read'),('financial.write'),('financial.audit'),
 ('operational.read'),('operational.write'),('operational.audit'),
 ('sales.read'),('sales.write'),('sales.audit');
insert into public.role_permissions select 'administrator',id from public.permissions;
insert into public.role_permissions(role_id,permission_id) values
 ('financial','financial.read'),('financial','financial.write'),('financial','financial.audit'),
 ('financial','sales.read'),('financial','sales.write'),('financial','sales.audit'),('financial','operational.read'),
 ('operational','operational.read'),('operational','operational.write'),('operational','operational.audit'),
 ('viewer','financial.read'),('viewer','sales.read'),('viewer','operational.read');
-- Explicitly retain original company IDs and legal names.
insert into public.organizations(id,name,active)
 select id,nome,coalesce(ativa,false) and deletada_em is null from public.empresas;
-- No password data is copied, no role is inferred from an unverified identity.
insert into public.profiles(id,display_name)
 select a.id,u.nome_completo from public.usuarios u join auth.users a on lower(a.email)=lower(u.email)
 where a.email_confirmed_at is not null and a.deleted_at is null and coalesce(u.ativo,false) and u.deletado_em is null;
-- Membership/admin bootstrap is a separate reviewed operation after email confirmation.

-- Retain legacy history with scoped read access; direct writes await phase 2 RPCs.
do $$ declare t text; begin
 foreach t in array array['empresas','usuarios','contas_bancarias','categorias','transacoes','alertas_saldo'] loop
 execute format('alter table public.%I enable row level security',t);
 execute format('revoke all on public.%I from public,anon,authenticated',t);
 end loop;
end $$;
grant select on public.empresas,public.contas_bancarias,public.categorias,public.transacoes,public.alertas_saldo to authenticated;
create policy legacy_company_read on public.empresas for select to authenticated using(private.is_member(id));
create policy legacy_accounts_read on public.contas_bancarias for select to authenticated using(private.has_permission(empresa_id,'financial.read'));
create policy legacy_categories_read on public.categorias for select to authenticated using(private.has_permission(empresa_id,'financial.read'));
create policy legacy_transactions_read on public.transacoes for select to authenticated using(private.has_permission(empresa_id,'financial.read'));
create policy legacy_alerts_read on public.alertas_saldo for select to authenticated using(private.has_permission(empresa_id,'financial.read'));
revoke execute on function public.rls_auto_enable() from public,anon,authenticated;
-- Legacy password hashes remain preserved, inaccessible through app grants.
create index usuarios_empresa_idx on public.usuarios(empresa_id);
create index transacoes_empresa_idx on public.transacoes(empresa_id,data_lancamento);
create index transacoes_conta_idx on public.transacoes(conta_id);
create index transacoes_categoria_idx on public.transacoes(categoria_id);
create index transacoes_criador_idx on public.transacoes(usuario_criador_id);
create index transacoes_deleidor_idx on public.transacoes(usuario_deleidor_id);
create index alertas_saldo_empresa_idx on public.alertas_saldo(empresa_id);
create index alertas_saldo_conta_idx on public.alertas_saldo(conta_id);
create index alertas_saldo_transacao_idx on public.alertas_saldo(transacao_id);
-- Objects are authorized through an existing entity-bound attachment, not a path prefix.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
 values('be-organization-documents','be-organization-documents',false,10485760,array['application/pdf','image/png','image/jpeg']);
create policy be_documents_read on storage.objects for select to authenticated using (
 bucket_id='be-organization-documents' and exists (
 select 1 from public.attachments a where a.bucket_id=storage.objects.bucket_id
 and a.object_path=storage.objects.name and a.state='confirmed'
 and private.has_permission(a.organization_id,'settings.manage')));
create policy be_documents_upload on storage.objects for insert to authenticated with check (
 bucket_id='be-organization-documents' and exists (
 select 1 from public.attachments a where a.bucket_id=storage.objects.bucket_id
 and a.object_path=storage.objects.name and a.state='pending'
 and a.created_by=(select auth.uid()) and private.has_permission(a.organization_id,'settings.manage')));
-- No UPDATE/DELETE policies: uploads cannot overwrite or remove historical documents.
-- Confirmation RPC and upload UI must be implemented/tested before enabling uploads.

do $$ declare actor uuid; org uuid; begin
 select id into strict actor from auth.users where email='agenciaatomo10@gmail.com' and email_confirmed_at is not null and deleted_at is null;
 select id into strict org from public.organizations where active;
 insert into public.profiles(id,display_name) values(actor,'Administrador Bueno Express') on conflict(id) do nothing;
 insert into public.organization_members(organization_id,user_id) values(org,actor);
 insert into public.user_roles(organization_id,user_id,role_id) values(org,actor,'administrator');
end $$;

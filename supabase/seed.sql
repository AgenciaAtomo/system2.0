-- Catálogos de Fundação; idempotente. Sem usuários, transações ou saldos fictícios.
begin;
insert into public.roles(id,name) values
 ('administrator','Administrador'),('financial','Financeiro'),('operational','Operacional'),('viewer','Visualização')
on conflict(id) do nothing;
insert into public.permissions(id) values
 ('settings.manage'),('settings.audit'),('financial.read'),('financial.write'),('financial.audit'),
 ('operational.read'),('operational.write'),('operational.audit'),('sales.read'),('sales.write'),('sales.audit')
on conflict(id) do nothing;
insert into public.role_permissions select 'administrator',id from public.permissions on conflict do nothing;
insert into public.role_permissions(role_id,permission_id) values
 ('financial','financial.read'),('financial','financial.write'),('financial','financial.audit'),
 ('financial','sales.read'),('financial','sales.write'),('financial','sales.audit'),('financial','operational.read'),
 ('operational','operational.read'),('operational','operational.write'),('operational','operational.audit'),
 ('viewer','financial.read'),('viewer','sales.read'),('viewer','operational.read')
on conflict do nothing;
commit;

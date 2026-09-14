create function public.get_financial_catalog(org uuid,kind text,search text default '',page integer default 1) returns jsonb
language plpgsql stable security invoker set search_path='' as $$
declare items jsonb; total bigint; skip integer; pattern text;
begin
 if auth.uid() is null or not private.has_permission(org,'financial.read') then raise exception 'Forbidden' using errcode='42501'; end if;
 if kind is null or kind not in ('account','category','cost_center') or page is null or page<1 or page>100000 or length(search)>100 then raise exception 'Invalid filter' using errcode='22023'; end if;
 skip=(page-1)*25;pattern='%'||replace(replace(replace(search,'\','\\'),'%','\%'),'_','\_')||'%';
 if kind='account' then
  select count(*) into total from public.contas_bancarias where empresa_id=org and nome ilike pattern;
  select coalesce(jsonb_agg(to_jsonb(r)),'[]') into items from (
   select id,nome as name,tipo as type,saldo_inicial::text as opening_balance,coalesce(ativa,false) and deletada_em is null as active,null::uuid as parent_id
   from public.contas_bancarias where empresa_id=org and nome ilike pattern order by lower(nome),id limit 25 offset skip) r;
 elsif kind='category' then
  select count(*) into total from public.categorias where empresa_id=org and nome ilike pattern;
  select coalesce(jsonb_agg(to_jsonb(r)),'[]') into items from (
   select id,nome as name,tipo as type,null::text as opening_balance,deletada_em is null as active,parent_id
   from public.categorias where empresa_id=org and nome ilike pattern order by lower(nome),id limit 25 offset skip) r;
 else
  select count(*) into total from public.cost_centers where organization_id=org and name ilike pattern;
  select coalesce(jsonb_agg(to_jsonb(r)),'[]') into items from (
   select id,name,null::text as type,null::text as opening_balance,active,null::uuid as parent_id
   from public.cost_centers where organization_id=org and name ilike pattern order by lower(name),id limit 25 offset skip) r;
 end if;
 return jsonb_build_object('items',items,'total',total,'page',page);
end $$;
revoke all on function public.get_financial_catalog(uuid,text,text,integer) from public,anon;
grant execute on function public.get_financial_catalog(uuid,text,text,integer) to authenticated;

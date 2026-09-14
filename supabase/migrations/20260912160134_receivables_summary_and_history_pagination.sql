do $$ declare def text;begin
 select pg_get_functiondef(p.oid) into def from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and proname='get_financial_summary';
 def=replace(def,'''receivable'',coalesce((select sum(remaining) from outstanding where tipo=''receita''),0)::text','''receivable'',(coalesce((select sum(remaining) from outstanding where tipo=''receita''),0)+coalesce((select sum(greatest(expected-received,0)) from public.sales_orders where organization_id=org and status=''posted'' and not closed),0))::text');execute def;
 select pg_get_functiondef(p.oid) into def from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='private' and proname='operation_data';
 def=replace(def,'''total'',total,''runs''','''total'',total,''run_total'',(select count(*) from public.production_runs where organization_id=org and (detail is null or variant_id=detail)),''runs''');
 def=replace(def,'order by pr.created_at desc limit 50 offset (page-1)*50','order by pr.created_at desc limit 50 offset (greatest(1,least(100000,coalesce((filters->>''history_page'')::integer,1)))-1)*50');execute def;
end $$;

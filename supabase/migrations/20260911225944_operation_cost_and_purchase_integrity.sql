do $$ declare def text;begin
 select pg_get_functiondef(p.oid) into def from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='private' and proname='write_input';
 def=replace(def,'values(org,request_id,payload,target);return target;','values(org,request_id,payload,case when operation=''purchase'' and payload->>''return_purchase''=''true'' then purchase else target end);return case when operation=''purchase'' and payload->>''return_purchase''=''true'' then purchase else target end;');execute def;
 select pg_get_functiondef(p.oid) into def from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='private' and proname='purchase_input';
 def=replace(def,'purchase=private.write_input(org,gen_random_uuid(),payload);','purchase=private.write_input(org,gen_random_uuid(),payload||''{"return_purchase":true}''::jsonb);');execute def;
 select pg_get_functiondef(p.oid) into def from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='private' and proname='produce';
 def=replace(def,'stock_value=stock_value-delta,version=version+1','stock_value=stock_value-delta,average_cost=case when stock_quantity=consumed then average_cost else round((stock_value-delta)/(stock_quantity-consumed),6) end,version=version+1');
 def=replace(def,'m.stock_quantity-consumed,m.average_cost,day','m.stock_quantity-consumed,case when m.stock_quantity=consumed then m.average_cost else round((m.stock_value-delta)/(m.stock_quantity-consumed),6) end,day');execute def;
 select pg_get_functiondef(p.oid) into def from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='private' and proname='operation_data';
 def=replace(def,'section=''receivables'' or o.date between start_day and end_day','section=''receivables'' or detail is not null or o.date between start_day and end_day');
 def=replace(def,'i.quantity*i.price/o.gross)*(o.net-o.shipping_income) + (i.quantity*i.price/o.gross)*o.shipping_income','i.quantity*i.price/o.gross)*o.net');execute def;
end $$;

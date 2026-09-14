-- Operational MVP: every command commits stock, snapshots and finance together.
create table public.finished_stock (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id), variant_id uuid not null,
 quantity numeric(18,6) not null default 0 check(quantity>=0), value numeric(24,6) not null default 0 check(value>=0), last_date date,
 foreign key(variant_id,organization_id) references public.product_variants(id,organization_id), unique(organization_id,variant_id), check(quantity>0 or value=0)
);
create table public.production_runs (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id), variant_id uuid not null,
 quantity integer not null check(quantity>0), unit_cost numeric(20,6) not null check(unit_cost>=0), snapshot jsonb not null,
 date date not null, status text not null default 'posted' check(status in ('posted','reversed')), kind text not null check(kind in ('production','opening','loss')),
 reason text not null, created_at timestamptz not null default now(),
 foreign key(variant_id,organization_id) references public.product_variants(id,organization_id), unique(id,organization_id)
);
create index production_org_date_idx on public.production_runs(organization_id,date desc,id);
create index production_variant_idx on public.production_runs(variant_id,organization_id);
create table public.sales_channels (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id), name text not null check(length(trim(name)) between 1 and 100), active boolean not null default true,
 unique(organization_id,name),unique(id,organization_id)
);
create table public.sales_fee_rules (
 id uuid primary key default gen_random_uuid(),organization_id uuid not null references public.organizations(id),channel_id uuid not null,name text not null,
 percentage numeric(7,4) not null check(percentage between 0 and 100), fixed numeric(15,2) not null check(fixed>=0),
 minimum numeric(15,2) not null default 0 check(minimum>=0), maximum numeric(15,2), starts date not null, ends date,
 active boolean not null default true, check(maximum is null or maximum>=minimum),check(ends is null or ends>=starts),
 foreign key(channel_id,organization_id) references public.sales_channels(id,organization_id)
);
create index fee_channel_idx on public.sales_fee_rules(channel_id,organization_id,starts);
create index fee_org_idx on public.sales_fee_rules(organization_id);
create table public.sales_orders (
 id uuid primary key default gen_random_uuid(),organization_id uuid not null references public.organizations(id),channel_id uuid not null,
 external_id text not null check(length(trim(external_id)) between 1 and 150),date date not null,due_date date not null,
 status text not null default 'posted' check(status in ('posted','cancelled')),stock_mode text not null check(stock_mode in ('stock','produce','historical')),
 gross numeric(15,2) not null check(gross>0),discount numeric(15,2) not null check(discount>=0),shipping_income numeric(15,2) not null check(shipping_income>=0),
 fees numeric(15,2) not null check(fees>=0),taxes numeric(15,2) not null check(taxes>=0),shipping numeric(15,2) not null check(shipping>=0),other numeric(15,2) not null check(other>=0),
 cost numeric(24,6) not null check(cost>=0),net numeric(15,2) not null,profit numeric(24,6) not null,expected numeric(15,2) not null check(expected>=0),
 received numeric(15,2) not null default 0 check(received>=0),closed boolean not null default false,notes text not null default '',fee_snapshot jsonb not null default '[]',
 created_at timestamptz not null default now(),foreign key(channel_id,organization_id) references public.sales_channels(id,organization_id),unique(organization_id,channel_id,external_id),unique(id,organization_id)
);
create index sales_org_date_idx on public.sales_orders(organization_id,date desc,id);
create index sales_channel_idx on public.sales_orders(channel_id,organization_id);
create index sales_due_idx on public.sales_orders(organization_id,due_date) where status='posted' and not closed;
create table public.sales_items (
 id uuid primary key default gen_random_uuid(),organization_id uuid not null references public.organizations(id),order_id uuid not null,variant_id uuid not null,
 quantity integer not null check(quantity>0),price numeric(15,2) not null check(price>=0),unit_cost numeric(20,6) not null check(unit_cost>=0),snapshot jsonb not null,
 foreign key(order_id,organization_id) references public.sales_orders(id,organization_id),foreign key(variant_id,organization_id) references public.product_variants(id,organization_id)
);
create index sales_items_order_idx on public.sales_items(order_id,organization_id);
create index sales_items_variant_idx on public.sales_items(variant_id,organization_id);
create index sales_items_org_idx on public.sales_items(organization_id);
create table public.product_stock_movements (
 id uuid primary key default gen_random_uuid(),organization_id uuid not null references public.organizations(id),variant_id uuid not null,
 quantity numeric(18,6) not null check(quantity<>0),value_change numeric(24,6) not null,date date not null,source_type text not null,source_id uuid not null,reason text not null,
 created_at timestamptz not null default now(),foreign key(variant_id,organization_id) references public.product_variants(id,organization_id)
);
create index product_movements_org_idx on public.product_stock_movements(organization_id,date desc);
create index product_movements_variant_idx on public.product_stock_movements(variant_id,organization_id);
create table public.sale_receipts (
 id uuid primary key default gen_random_uuid(),organization_id uuid not null references public.organizations(id),order_id uuid not null,entry_id uuid not null,
 amount numeric(15,2) not null check(amount<>0),date date not null,reason text not null,created_at timestamptz not null default now(),
 foreign key(order_id,organization_id) references public.sales_orders(id,organization_id),foreign key(entry_id,organization_id) references public.transacoes(id,empresa_id)
);
create index sale_receipts_order_idx on public.sale_receipts(order_id,organization_id);
create index sale_receipts_entry_idx on public.sale_receipts(entry_id,organization_id);
create index sale_receipts_org_idx on public.sale_receipts(organization_id,date);
create table public.business_goals (
 id uuid primary key default gen_random_uuid(),organization_id uuid not null references public.organizations(id),metric text not null check(metric in ('gross','profit','orders','margin')),
 target numeric(18,2) not null check(target>0),starts date not null,ends date not null,active boolean not null default true,check(ends>=starts)
);
create index business_goals_org_idx on public.business_goals(organization_id,starts,ends);
create table public.alert_resolutions (id uuid primary key default gen_random_uuid(),organization_id uuid not null references public.organizations(id),alert_key text not null,resolved_at timestamptz not null default now(),unique(organization_id,alert_key));
create table private.operation_commands (organization_id uuid not null references public.organizations(id),request_id uuid not null,payload jsonb not null,result jsonb not null,created_at timestamptz not null default now(),primary key(organization_id,request_id));
alter table private.operation_commands enable row level security;
revoke all on private.operation_commands from public,anon,authenticated;
do $$ declare t text; perm text;begin
 foreach t in array array['finished_stock','production_runs','sales_channels','sales_fee_rules','sales_orders','sales_items','product_stock_movements','sale_receipts','business_goals','alert_resolutions'] loop
  perm=case when t in ('finished_stock','production_runs','product_stock_movements') then 'operational.read' else 'financial.read' end;
  execute format('alter table public.%I enable row level security',t);
  execute format('revoke all on public.%I from public,anon,authenticated',t);
  execute format('grant select on public.%I to authenticated',t);
  execute format('create policy scope_read on public.%I for select to authenticated using(private.has_permission(organization_id,%L))',t,perm);
  execute format('create trigger operation_audit after insert or update on public.%I for each row execute function private.audit_operational()',t);
 end loop;
end $$;
alter table public.inventory_movements drop constraint inventory_movements_type_check;
alter table public.inventory_movements add constraint inventory_movements_type_check check(type in ('purchase','manual_adjustment','production_consumption','return'));
alter table public.inventory_movements drop constraint inventory_movements_source_type_check;
alter table public.inventory_movements add constraint inventory_movements_source_type_check check(source_type in ('purchase','adjustment','production','production_reversal'));
alter table public.transacoes drop constraint transacoes_source_check;
alter table public.transacoes add constraint transacoes_source_check check(source_type in ('legacy','manual','sale_receipt','sale_refund','input_purchase'));

create function private.recipe(org uuid,variant uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare v public.product_variants;p jsonb;c record;m public.inputs;q numeric;b numeric;h numeric;cost numeric=0;extra numeric=0;parts jsonb='[]';capacity numeric;possible numeric;f uuid;
begin
 if auth.uid() is null or not (private.has_permission(org,'operational.read') or private.has_permission(org,'financial.read')) then raise exception 'Acesso negado' using errcode='42501';end if;
 select * into v from public.product_variants where id=variant and organization_id=org;
 if not found or not v.active then raise exception 'Produto indisponível';end if;
 p=v.production;f=nullif(p->>'filament_id','')::uuid;
 for c in select pc.input_id,pc.quantity,pc.unit,pc.waste_percentage from public.product_components pc where pc.product_variant_id=variant and pc.organization_id=org order by pc.input_id loop
  select * into m from public.inputs where id=c.input_id and organization_id=org;
  if not m.active or m.average_cost is null then raise exception 'Insumo sem custo ou inativo: %',m.name;end if;
  q=private.convert_input_quantity(c.quantity,c.unit,m.base_unit)*(1+c.waste_percentage/100);
  cost=cost+q*m.average_cost;possible=floor(m.stock_quantity/q);capacity=least(capacity,possible);
  parts=parts||jsonb_build_array(jsonb_build_object('id',m.id,'name',m.name,'quantity',q::text,'unit',m.base_unit,'cost',m.average_cost::text,'version',m.version));
 end loop;
 if p<>'{}'::jsonb then
  select * into m from public.inputs where id=f and organization_id=org;
  if not found or not m.active or m.average_cost is null then raise exception 'Vincule um filamento ativo e com custo na calculadora';end if;
  if exists(select 1 from public.product_components where product_variant_id=variant and input_id=f) then raise exception 'Filamento duplicado';end if;
  b=(p->>'quantity_per_batch')::numeric;
  q=((p->>'piece_weight_g')::numeric+(p->>'support_weight_g')::numeric+(p->>'purge_weight_g')::numeric)/(1-(p->>'failed_print_rate')::numeric)/b;
  q=q/case when m.base_unit='kg' then 1000 when m.base_unit='g' then 1 else null end;
  if q is null then raise exception 'Unidade do filamento inválida';end if;
  cost=cost+q*m.average_cost;capacity=least(capacity,floor(m.stock_quantity/q));
  parts=parts||jsonb_build_array(jsonb_build_object('id',m.id,'name',m.name,'quantity',q::text,'unit',m.base_unit,'cost',m.average_cost::text,'version',m.version));
  h=(p->>'print_time_minutes')::numeric/60/b;
  extra=h*((p->>'printer_power_watts')::numeric/1000*(p->>'electricity_price_kwh')::numeric+(p->>'machine_hour_cost')::numeric+(p->>'maintenance_cost_per_hour')::numeric)+(p->>'labor_minutes')::numeric/60/b*(p->>'labor_hour_cost')::numeric;
 end if;
 if parts='[]'::jsonb and v.other_direct_costs=0 and coalesce((v.attributes->>'manual_cost_confirmed')::boolean,false)=false then raise exception 'Produto sem ficha de custo';end if;
 cost=(cost+extra+v.other_direct_costs)*(1+v.overhead_percentage/100);
 return jsonb_build_object('unit_cost',round(cost,6)::text,'parts',parts,'production',p,'other_costs',v.other_direct_costs::text,'overhead',v.overhead_percentage::text,'version',v.version,'capacity',capacity::text,'sku',v.sku,'name',v.name);
end $$;
revoke all on function private.recipe(uuid,uuid) from public,anon,authenticated;

create function private.stock_change(org uuid,variant uuid,qty numeric,val numeric,day date,origin text,source uuid,note text) returns void language plpgsql security definer set search_path='' as $$
declare s public.finished_stock;
begin
 insert into public.finished_stock(organization_id,variant_id) values(org,variant) on conflict(organization_id,variant_id) do nothing;
 select * into s from public.finished_stock where organization_id=org and variant_id=variant for update;
 if day<coalesce(s.last_date,day) then raise exception 'Data anterior ao último movimento do produto';end if;
 if s.quantity+qty<0 or s.value+val< -0.000001 then raise exception 'Estoque insuficiente. Registre a produção ou o saldo inicial';end if;
 update public.finished_stock set quantity=s.quantity+qty,value=case when s.quantity+qty=0 then 0 else greatest(0,s.value+val) end,last_date=day where id=s.id;
 insert into public.product_stock_movements(organization_id,variant_id,quantity,value_change,date,source_type,source_id,reason) values(org,variant,qty,val,day,origin,source,note);
end $$;
revoke all on function private.stock_change(uuid,uuid,numeric,numeric,date,text,uuid,text) from public,anon,authenticated;

create function private.produce(org uuid,variant uuid,qty integer,day date,kind text,note text,manual_cost numeric default null) returns uuid language plpgsql security definer set search_path='' as $$
declare snap jsonb;part jsonb;m public.inputs;consumed numeric;delta numeric;cost numeric;result uuid=gen_random_uuid();s public.finished_stock;
begin
 if qty is null or qty not between 1 and 999999 or kind not in ('production','opening','loss') then raise exception 'Quantidade inválida';end if;
 perform 1 from public.product_variants where id=variant and organization_id=org and active for update;
 if not found then raise exception 'Produto indisponível';end if;
 if kind='production' then
  perform 1 from public.inputs where organization_id=org and id in (select input_id from public.product_components where product_variant_id=variant union select nullif(production->>'filament_id','')::uuid from public.product_variants where id=variant) order by id for update;
  snap=private.recipe(org,variant);cost=(snap->>'unit_cost')::numeric;
  if jsonb_array_length(snap->'parts')=0 then raise exception 'Vincule os insumos na calculadora antes de produzir. Para produtos já prontos, use saldo inicial';end if;
  for part in select value from jsonb_array_elements(snap->'parts') loop
   select * into m from public.inputs where id=(part->>'id')::uuid and organization_id=org for update;
   consumed=ceil((part->>'quantity')::numeric*qty*1000000)/1000000;
   if day<coalesce(m.last_movement_date,day) then raise exception 'Data anterior ao último movimento do insumo %',m.name;end if;
   if consumed>m.stock_quantity then raise exception 'Estoque insuficiente: %',m.name;end if;
   delta=case when consumed=m.stock_quantity then m.stock_value else least(m.stock_value,round(consumed*m.average_cost,6)) end;
   update public.inputs set stock_quantity=stock_quantity-consumed,stock_value=stock_value-delta,version=version+1,last_movement_date=day,updated_at=now() where id=m.id;
   insert into public.inventory_movements(organization_id,input_id,type,quantity,value_change,stock_after,average_cost_after,movement_date,source_type,source_id,reason,created_by) values(org,m.id,'production_consumption',-consumed,-delta,m.stock_quantity-consumed,m.average_cost,day,'production',result,note,auth.uid());
  end loop;
 elsif kind='opening' then
  if manual_cost is null or manual_cost<0 then raise exception 'Informe custo do saldo inicial';end if;cost=manual_cost;snap=jsonb_build_object('unit_cost',cost::text,'parts','[]'::jsonb,'basis','opening');
 else
  select * into s from public.finished_stock where organization_id=org and variant_id=variant for update;
  if not found or s.quantity<qty then raise exception 'Estoque insuficiente';end if;
  cost=round(s.value/s.quantity,6);snap=jsonb_build_object('unit_cost',cost::text,'parts','[]'::jsonb,'basis','loss');
 end if;
 insert into public.production_runs(id,organization_id,variant_id,quantity,unit_cost,snapshot,date,kind,reason) values(result,org,variant,qty,cost,snap,day,kind,note);
 perform private.stock_change(org,variant,case when kind='loss' then -qty else qty end,case when kind='loss' then -least(s.value,qty*cost) else qty*cost end,day,kind,result,note);
 return result;
end $$;
revoke all on function private.produce(uuid,uuid,integer,date,text,text,numeric) from public,anon,authenticated;

create function private.operate(org uuid,request_id uuid,payload jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare op text=payload->>'operation';saved private.operation_commands;result uuid=gen_random_uuid();day date;today date=(now() at time zone 'America/Sao_Paulo')::date;
 v uuid;ch uuid;qty integer;cost numeric;price numeric;gross numeric=0;total_cost numeric=0;fees numeric=0;taxes numeric;ship numeric;shipincome numeric;discount numeric;other numeric;net numeric;expected numeric;
 mode text;note text;line jsonb;lines jsonb='[]';snap jsonb;fee_snap jsonb='[]';s public.finished_stock;o public.sales_orders;r public.production_runs;m public.inputs;mov record;entry uuid;amount numeric;due date;code text;cnt integer;delta numeric;
begin
 if auth.uid() is null or op is null or request_id is null then raise exception 'Acesso negado' using errcode='42501';end if;
 if not private.has_permission(org,case when op in ('produce','reverse_production') then 'operational.write' else 'financial.write' end) then raise exception 'Acesso negado' using errcode='42501';end if;
 perform pg_advisory_xact_lock(hashtextextended(org::text,41));
 select * into saved from private.operation_commands c where c.organization_id=org and c.request_id=operate.request_id;
 if found then if saved.payload<>payload then raise exception 'Solicitação já utilizada';end if;return saved.result;end if;
 note=left(coalesce(nullif(trim(payload->>'reason'),''),'Movimentação registrada'),500);
 if op in ('produce','reverse_production','sale','cancel_sale','receive','refund') then
  day=(payload->>'date')::date;if day is null or day not between date '2000-01-01' and today then raise exception 'Data inválida ou futura';end if;
 end if;
 if op='produce' then
  if coalesce(payload->>'quantity','') !~ '^[1-9][0-9]{0,5}$' then raise exception 'Quantidade inválida';end if;
  result=private.produce(org,(payload->>'variant_id')::uuid,(payload->>'quantity')::integer,day,payload->>'kind',note,private.input_decimal(coalesce(payload->>'unit_cost','0'),12,6));
 elsif op='reverse_production' then
  select * into r from public.production_runs where id=(payload->>'id')::uuid and organization_id=org for update;
  if not found or r.status<>'posted' or day<r.date then raise exception 'Produção indisponível para estorno';end if;
  perform private.stock_change(org,r.variant_id,case when r.kind='loss' then r.quantity else -r.quantity end,case when r.kind='loss' then r.quantity*r.unit_cost else -r.quantity*r.unit_cost end,day,'production_reversal',r.id,note);
  for mov in select * from public.inventory_movements where organization_id=org and source_type='production' and source_id=r.id order by input_id loop
   select * into m from public.inputs where id=mov.input_id and organization_id=org for update;
   if day<coalesce(m.last_movement_date,day) then raise exception 'Data anterior ao último movimento do insumo';end if;
   update public.inputs set stock_quantity=stock_quantity-mov.quantity,stock_value=stock_value-mov.value_change,average_cost=round((stock_value-mov.value_change)/(stock_quantity-mov.quantity),6),version=version+1,last_movement_date=day,updated_at=now() where id=m.id;
   insert into public.inventory_movements(organization_id,input_id,type,quantity,value_change,stock_after,average_cost_after,movement_date,source_type,source_id,reason,created_by) values(org,m.id,'return',-mov.quantity,-mov.value_change,m.stock_quantity-mov.quantity,round((m.stock_value-mov.value_change)/(m.stock_quantity-mov.quantity),6),day,'production_reversal',r.id,note,auth.uid());
  end loop;
  update public.production_runs set status='reversed' where id=r.id;result=r.id;
 elsif op='channel' then
  code=trim(payload->>'name');if code is null or length(code) not between 1 and 100 then raise exception 'Nome inválido';end if;
  if nullif(payload->>'id','') is null then insert into public.sales_channels(id,organization_id,name) values(result,org,code);
  else update public.sales_channels set name=code,active=coalesce((payload->>'active')::boolean,true) where id=(payload->>'id')::uuid and organization_id=org returning id into result;if not found then raise exception 'Canal indisponível';end if;end if;
 elsif op='fee' then
  ch=(payload->>'channel_id')::uuid;perform 1 from public.sales_channels where id=ch and organization_id=org;if not found then raise exception 'Canal inválido';end if;
  if nullif(payload->>'id','') is not null then update public.sales_fee_rules set active=false where id=(payload->>'id')::uuid and organization_id=org returning id into result;if not found then raise exception 'Regra indisponível';end if;
  else
   insert into public.sales_fee_rules(id,organization_id,channel_id,name,percentage,fixed,minimum,maximum,starts,ends) values(result,org,ch,left(coalesce(payload->>'name','Taxa'),100),private.input_decimal(payload->>'percentage',3,4),private.input_decimal(payload->>'fixed',12,2),private.input_decimal(coalesce(payload->>'minimum','0'),12,2),case when nullif(payload->>'maximum','') is null then null else private.input_decimal(payload->>'maximum',12,2) end,(payload->>'starts')::date,nullif(payload->>'ends','')::date);
  end if;
 elsif op='sale' then
  ch=(payload->>'channel_id')::uuid;code=trim(payload->>'external_id');mode=payload->>'stock_mode';due=coalesce(nullif(payload->>'due_date','')::date,day);
  if due not between date '2000-01-01' and date '2199-12-31' or code is null or length(code) not between 1 and 150 or mode is null or mode not in ('stock','produce','historical') then raise exception 'Confira pedido, data e modo de estoque';end if;
  perform 1 from public.sales_channels where id=ch and organization_id=org and active;if not found then raise exception 'Canal inválido';end if;
  if mode='produce' and not private.has_permission(org,'operational.write') then raise exception 'Sem acesso à produção' using errcode='42501';end if;
  if exists(select 1 from public.sales_orders where organization_id=org and channel_id=ch and external_id=code) then raise exception 'Pedido duplicado: %',code using errcode='23505';end if;
  if jsonb_typeof(payload->'items') is distinct from 'array' or jsonb_array_length(payload->'items') not between 1 and 100 then raise exception 'Informe os itens';end if;
  for line in select value from jsonb_array_elements(payload->'items') order by value->>'variant_id',value->>'sku' loop
   select id into v from public.product_variants where organization_id=org and active and (id=nullif(line->>'variant_id','')::uuid or sku=upper(trim(line->>'sku'))) limit 1 for update;
   if not found then raise exception 'SKU não encontrado: %',coalesce(line->>'sku',line->>'variant_id');end if;
   if coalesce(line->>'quantity','') !~ '^[1-9][0-9]{0,5}$' then raise exception 'Quantidade deve ser inteira e positiva';end if;qty=(line->>'quantity')::integer;
   price=private.input_decimal(line->>'price',12,2);
   if mode='produce' then perform private.produce(org,v,qty,day,'production','Produção do pedido '||code);end if;
   if mode='historical' then
    cost=private.input_decimal(line->>'unit_cost',12,6);snap=jsonb_build_object('basis','historical_manual','unit_cost',cost::text,'sku',line->>'sku','note','Custo histórico informado; sem movimentação de estoque');
   else
    select * into s from public.finished_stock where organization_id=org and variant_id=v for update;
    if not found or s.quantity<qty then raise exception 'Estoque insuficiente para o SKU %',(select sku from public.product_variants where id=v);end if;
    cost=round(s.value/s.quantity,6);
    snap=jsonb_build_object('basis','finished_average','unit_cost',cost::text,'stock_quantity',s.quantity::text,'stock_value',s.value::text,'sku',(select sku from public.product_variants where id=v),'production_ids',coalesce((select jsonb_agg(id) from public.production_runs where organization_id=org and variant_id=v and status='posted'),'[]'));
    perform private.stock_change(org,v,-qty,-least(s.value,qty*cost),day,'sale',result,'Venda '||code);
   end if;
   gross=gross+qty*price;total_cost=total_cost+qty*cost;
   lines=lines||jsonb_build_array(jsonb_build_object('variant_id',v,'quantity',qty,'price',price::text,'unit_cost',cost::text,'snapshot',snap));
  end loop;
  if gross<=0 then raise exception 'Valor da venda deve ser positivo';end if;
  discount=private.input_decimal(coalesce(payload->>'discount','0'),12,2);shipincome=private.input_decimal(coalesce(payload->>'shipping_income','0'),12,2);
  ship=private.input_decimal(coalesce(payload->>'shipping','0'),12,2);taxes=private.input_decimal(coalesce(payload->>'taxes','0'),12,2);other=private.input_decimal(coalesce(payload->>'other','0'),12,2);
  if discount>gross then raise exception 'Desconto maior que a venda';end if;
  if nullif(payload->>'fees','') is not null then fees=private.input_decimal(payload->>'fees',12,2);fee_snap=jsonb_build_array(jsonb_build_object('manual',fees::text));
  else
   select coalesce(sum(round(gross*percentage/100+fixed,2)),0),coalesce(jsonb_agg(to_jsonb(f)),'[]') into fees,fee_snap from public.sales_fee_rules f where organization_id=org and channel_id=ch and active and starts<=day and (ends is null or ends>=day) and gross>=minimum and (maximum is null or gross<=maximum);
  end if;
  net=gross+shipincome-discount-fees-taxes-ship-other;
  expected=case when nullif(payload->>'expected','') is null then greatest(0,gross+shipincome-discount-fees-ship) else private.input_decimal(payload->>'expected',12,2) end;
  insert into public.sales_orders(id,organization_id,channel_id,external_id,date,due_date,stock_mode,gross,discount,shipping_income,fees,taxes,shipping,other,cost,net,profit,expected,notes,fee_snapshot) values(result,org,ch,code,day,due,mode,gross,discount,shipincome,fees,taxes,ship,other,total_cost,net,net-total_cost,expected,left(coalesce(payload->>'notes',''),2000),fee_snap);
  for line in select value from jsonb_array_elements(lines) loop
   insert into public.sales_items(organization_id,order_id,variant_id,quantity,price,unit_cost,snapshot) values(org,result,(line->>'variant_id')::uuid,(line->>'quantity')::integer,(line->>'price')::numeric,(line->>'unit_cost')::numeric,line->'snapshot');
  end loop;
 elsif op in ('cancel_sale','receive','refund','close_receivable') then
  select * into o from public.sales_orders where organization_id=org and id=(payload->>'id')::uuid for update;
  if not found or o.status<>'posted' then raise exception 'Pedido indisponível';end if;result=o.id;
  if op='cancel_sale' then
   if o.received<>0 then raise exception 'Registre a devolução dos recebimentos antes de cancelar';end if;
   if day<o.date then raise exception 'Data anterior à venda';end if;
   if o.stock_mode<>'historical' then
    for mov in select * from public.sales_items where order_id=o.id and organization_id=org order by variant_id loop perform private.stock_change(org,mov.variant_id,mov.quantity,mov.quantity*mov.unit_cost,day,'sale_reversal',o.id,note);end loop;
   end if;
   update public.sales_orders set status='cancelled',closed=true,notes=left(notes||E'\nCancelamento: '||note,2000) where id=o.id;
  elsif op='close_receivable' then update public.sales_orders set closed=coalesce((payload->>'closed')::boolean,true),notes=left(notes||E'\nConciliação: '||note,2000) where id=o.id;
  else
   amount=private.input_decimal(payload->>'amount',12,2);if amount<=0 or (op='refund' and amount>o.received) or day<o.date then raise exception 'Valor ou data inválidos';end if;
   entry=private.write_financial_entry(org,gen_random_uuid(),jsonb_build_object('operation','save','type',case when op='refund' then 'despesa' else 'receita' end,'description',case when op='refund' then 'Devolução · ' else 'Recebimento · ' end||o.external_id,'amount',amount::text,'status','paid','competence_date',o.date,'due_date',day,'paid_date',day,'account_id',payload->>'account_id','category_id',payload->>'category_id','notes',note));
   update public.transacoes set source_type=case when op='refund' then 'sale_refund' else 'sale_receipt' end,source_id=o.id where id=entry;
   insert into public.sale_receipts(organization_id,order_id,entry_id,amount,date,reason) values(org,o.id,entry,case when op='refund' then -amount else amount end,day,note);
   update public.sales_orders set received=received+case when op='refund' then -amount else amount end,closed=false where id=o.id;
  end if;
 elsif op='goal' then
  if nullif(payload->>'id','') is not null then update public.business_goals set active=false where id=(payload->>'id')::uuid and organization_id=org returning id into result;if not found then raise exception 'Meta indisponível';end if;
  else insert into public.business_goals(id,organization_id,metric,target,starts,ends) values(result,org,payload->>'metric',private.input_decimal(payload->>'target',12,2),(payload->>'starts')::date,(payload->>'ends')::date);end if;
 elsif op='resolve' then
  insert into public.alert_resolutions(id,organization_id,alert_key) values(result,org,left(payload->>'key',200)) on conflict(organization_id,alert_key) do update set resolved_at=now() returning id into result;
 else raise exception 'Operação inválida';end if;
 insert into private.operation_commands(organization_id,request_id,payload,result) values(org,request_id,payload,jsonb_build_object('id',result));return jsonb_build_object('id',result);
end $$;
revoke all on function private.operate(uuid,uuid,jsonb) from public,anon;
grant execute on function private.operate(uuid,uuid,jsonb) to authenticated;
create function public.operate(org uuid,request_id uuid,payload jsonb) returns jsonb language sql security invoker set search_path='' as $$ select private.operate(org,request_id,payload) $$;
revoke all on function public.operate(uuid,uuid,jsonb) from public,anon;
grant execute on function public.operate(uuid,uuid,jsonb) to authenticated;

create function private.numeric_text(j jsonb) returns jsonb language plpgsql immutable security invoker set search_path='' as $$
declare result jsonb;begin
 case jsonb_typeof(j)
 when 'number' then return to_jsonb(j#>>'{}');
 when 'array' then select coalesce(jsonb_agg(private.numeric_text(value)),'[]') into result from jsonb_array_elements(j);return result;
 when 'object' then select coalesce(jsonb_object_agg(key,private.numeric_text(value)),'{}') into result from jsonb_each(j);return result;
 else return j;end case;
end $$;
revoke all on function private.numeric_text(jsonb) from public,anon,authenticated;
create function private.operation_data(org uuid,section text,filters jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb='{}';rows jsonb='[]';rec record;snap jsonb;start_day date;end_day date;page integer;term text;channel uuid;detail uuid;total integer;metrics jsonb;alerts jsonb='[]';summary jsonb;actual numeric;
begin
 if auth.uid() is null or not private.has_permission(org,case when section in ('stock','costs') then 'operational.read' else 'financial.read' end) then raise exception 'Acesso negado' using errcode='42501';end if;
 start_day=coalesce(nullif(filters->>'from','')::date,date_trunc('month',now() at time zone 'America/Sao_Paulo')::date);end_day=coalesce(nullif(filters->>'to','')::date,(now() at time zone 'America/Sao_Paulo')::date);
 if start_day>end_day or end_day-start_day>3660 then raise exception 'Período inválido; máximo de dez anos';end if;
 page=greatest(1,least(100000,coalesce((filters->>'page')::integer,1)));term=left(coalesce(filters->>'q',''),100);channel=nullif(filters->>'channel_id','')::uuid;detail=nullif(filters->>'id','')::uuid;
 if section in ('stock','costs') then
  select count(*) into total from public.product_variants v join public.products p on p.id=v.product_id where v.organization_id=org and (term='' or v.sku ilike '%'||term||'%' or p.name ilike '%'||term||'%');
  for rec in select v.*,p.name product_name,coalesce(s.quantity,0) stock_quantity,coalesce(s.value,0) stock_value from public.product_variants v join public.products p on p.id=v.product_id left join public.finished_stock s on s.variant_id=v.id and s.organization_id=org where v.organization_id=org and (term='' or v.sku ilike '%'||term||'%' or p.name ilike '%'||term||'%') order by p.name,v.sku limit 50 offset (page-1)*50 loop
   begin snap=private.recipe(org,rec.id);exception when others then snap=jsonb_build_object('error',SQLERRM);end;
   rows=rows||jsonb_build_array(to_jsonb(rec)||jsonb_build_object('recipe',snap));
  end loop;
  result=jsonb_build_object('variants',rows,'total',total,'runs',coalesce((select jsonb_agg(to_jsonb(r)) from (select pr.*,v.sku,p.name product_name from public.production_runs pr join public.product_variants v on v.id=pr.variant_id join public.products p on p.id=v.product_id where pr.organization_id=org and (detail is null or pr.variant_id=detail) order by pr.created_at desc limit 50 offset (page-1)*50)r),'[]'));
  return private.numeric_text(result);
 end if;
 if section in ('sales','settings','receivables') then
  result=jsonb_build_object('channels',coalesce((select jsonb_agg(to_jsonb(c) order by c.name) from public.sales_channels c where organization_id=org),'[]'),
   'rules',coalesce((select jsonb_agg(to_jsonb(f) order by f.starts desc) from public.sales_fee_rules f where organization_id=org and active),'[]'),
   'variants',coalesce((select jsonb_agg(to_jsonb(v)) from (select v.id,v.sku,p.name||' · '||v.name name,v.price,coalesce(s.quantity,0) quantity from public.product_variants v join public.products p on p.id=v.product_id left join public.finished_stock s on s.variant_id=v.id and s.organization_id=org where v.organization_id=org and v.active and (term='' or v.sku ilike '%'||term||'%' or p.name ilike '%'||term||'%') order by p.name,v.sku limit 1000)v),'[]'),
   'accounts',coalesce((select jsonb_agg(jsonb_build_object('id',id,'name',nome)) from public.contas_bancarias where empresa_id=org and ativa and deletada_em is null and moeda='BRL'),'[]'),
   'categories',coalesce((select jsonb_agg(jsonb_build_object('id',id,'name',nome,'type',tipo)) from public.categorias where empresa_id=org and deletada_em is null),'[]'));
  select count(*) into total from public.sales_orders o where organization_id=org and (section='receivables' or o.date between start_day and end_day) and (term='' or external_id ilike '%'||term||'%') and (channel is null or channel_id=channel) and (detail is null or id=detail);
  select coalesce(jsonb_agg(to_jsonb(r)),'[]') into rows from (select o.*,c.name channel_name,case when o.status='cancelled' then 'Cancelado' when o.received=o.expected then 'Recebido' when o.closed or o.received>o.expected then 'Divergente' when o.received>0 then 'Parcial' else 'Pendente' end payment_status,
   (select jsonb_agg(to_jsonb(i)||jsonb_build_object('sku',v.sku,'name',p.name)) from public.sales_items i join public.product_variants v on v.id=i.variant_id join public.products p on p.id=v.product_id where i.order_id=o.id) items,
   coalesce((select jsonb_agg(to_jsonb(sr) order by sr.created_at) from public.sale_receipts sr where sr.order_id=o.id),'[]') receipts
   from public.sales_orders o join public.sales_channels c on c.id=o.channel_id where o.organization_id=org and (section='receivables' or o.date between start_day and end_day) and (term='' or o.external_id ilike '%'||term||'%') and (channel is null or o.channel_id=channel) and (detail is null or o.id=detail) order by o.date desc,o.created_at desc limit 50 offset (page-1)*50)r;
  return private.numeric_text(result||jsonb_build_object('orders',rows,'total',total));
 end if;
 if section not in ('dashboard','reports','analysis') then raise exception 'Seção inválida';end if;
 with selected as materialized(select * from public.sales_orders where organization_id=org and status='posted' and date between start_day and end_day and (channel is null or channel_id=channel)),
 expenses as (select coalesce(sum(valor),0) amount from public.transacoes where empresa_id=org and tipo='despesa' and source_type='manual' and status<>'cancelled' and deletada_em is null and competence_date between start_day and end_day)
 select jsonb_build_object('gross',coalesce(sum(gross),0),'net',coalesce(sum(net),0),'cost',coalesce(sum(cost),0),'profit',coalesce(sum(profit),0),'fees',coalesce(sum(fees),0),'taxes',coalesce(sum(taxes),0),'orders',count(*),'units',coalesce((select sum(i.quantity) from public.sales_items i join selected s on s.id=i.order_id),0),'expenses',(select amount from expenses),'operating_profit',coalesce(sum(profit),0)-(select amount from expenses),'margin',case when sum(gross)>0 then round(sum(profit)/sum(gross)*100,2) else null end,'ticket',case when count(*)>0 then round(sum(gross)/count(*),2) else null end) into metrics from selected;
 select jsonb_build_object('receivable',coalesce(sum(greatest(expected-received,0)) filter(where not closed),0),'divergence',coalesce(sum(received-expected) filter(where closed or received>expected),0)) into summary from public.sales_orders where organization_id=org and status='posted' and (channel is null or channel_id=channel);
 result=jsonb_build_object('from',start_day,'to',end_day,'updated_at',now(),'metrics',metrics||summary,'channels',coalesce((select jsonb_agg(to_jsonb(c)) from public.sales_channels c where organization_id=org),'[]'));
 select coalesce(jsonb_agg(to_jsonb(r)),'[]') into rows from (select date,sum(gross) gross,sum(profit) profit from public.sales_orders where organization_id=org and status='posted' and date between start_day and end_day and (channel is null or channel_id=channel) group by date order by date)r;
 result=result||jsonb_build_object('daily',rows);
 select coalesce(jsonb_agg(to_jsonb(r)),'[]') into rows from (select c.name,count(*) orders,sum(o.gross) gross,sum(o.profit) profit from public.sales_orders o join public.sales_channels c on c.id=o.channel_id where o.organization_id=org and o.status='posted' and o.date between start_day and end_day and (channel is null or o.channel_id=channel) group by c.name order by sum(o.profit) desc)r;
 result=result||jsonb_build_object('by_channel',rows);
 select coalesce(jsonb_agg(to_jsonb(r)),'[]') into rows from (select v.sku,p.name,sum(i.quantity) units,sum(i.quantity*i.price) gross,sum(i.quantity*i.unit_cost) cost,sum(case when o.gross>0 then (i.quantity*i.price/o.gross)*(o.net-o.shipping_income) + (i.quantity*i.price/o.gross)*o.shipping_income-i.quantity*i.unit_cost else 0 end) profit from public.sales_items i join public.sales_orders o on o.id=i.order_id join public.product_variants v on v.id=i.variant_id join public.products p on p.id=v.product_id where o.organization_id=org and o.status='posted' and o.date between start_day and end_day and (channel is null or o.channel_id=channel) group by v.sku,p.name order by sum(i.quantity*i.price-i.quantity*i.unit_cost) desc limit 100)r;
 result=result||jsonb_build_object('by_product',rows);
 select coalesce(jsonb_agg(to_jsonb(r)),'[]') into rows from (select coalesce(c.nome,'Sem categoria') name,sum(t.valor) amount from public.transacoes t left join public.categorias c on c.id=t.categoria_id where t.empresa_id=org and t.tipo='despesa' and t.source_type='manual' and t.status<>'cancelled' and t.deletada_em is null and t.competence_date between start_day and end_day group by c.nome order by sum(t.valor) desc)r;
 result=result||jsonb_build_object('expense_categories',rows);
 rows='[]';
 for rec in select * from public.business_goals where organization_id=org and active order by ends loop
  select case rec.metric when 'gross' then coalesce(sum(gross),0) when 'profit' then coalesce(sum(profit),0) when 'orders' then count(*) else coalesce(round(sum(profit)/nullif(sum(gross),0)*100,2),0) end into actual from public.sales_orders where organization_id=org and status='posted' and date between rec.starts and rec.ends;
  rows=rows||jsonb_build_array(to_jsonb(rec)||jsonb_build_object('actual',actual,'progress',round(actual/rec.target*100,1)));
 end loop;
 result=result||jsonb_build_object('goals',rows);
 select coalesce(jsonb_agg(to_jsonb(a)),'[]') into alerts from (
  select 'stock:'||id::text||':'||version::text key,'Estoque baixo: '||name||' ('||stock_quantity::text||' '||base_unit||')' message,'/insumos?q='||sku href from public.inputs where organization_id=org and active and stock_quantity<=minimum_stock
  union all select 'due:'||id::text,'Conta vencida: '||descricao||' · R$ '||(valor-paid_amount)::text,'/financeiro/lancamentos' from public.transacoes where empresa_id=org and status in ('pending','partially_paid') and due_date<(now() at time zone 'America/Sao_Paulo')::date and deletada_em is null
  union all select 'sale:'||id::text||':'||received::text,'Recebimento pendente/divergente: '||external_id,'/recebiveis?id='||id::text from public.sales_orders where organization_id=org and status='posted' and received<>expected and (closed or received>expected or due_date<(now() at time zone 'America/Sao_Paulo')::date)
  union all select 'margin:'||id::text,'Venda com prejuízo: '||external_id,'/vendas?id='||id::text from public.sales_orders where organization_id=org and status='posted' and profit<0 and date between start_day and end_day
 )a where not exists(select 1 from public.alert_resolutions ar where ar.organization_id=org and ar.alert_key=a.key);
 result=result||jsonb_build_object('alerts',alerts,'cash',public.get_financial_summary(org,1));
 return private.numeric_text(result);
end $$;
revoke all on function private.operation_data(uuid,text,jsonb) from public,anon;
grant execute on function private.operation_data(uuid,text,jsonb) to authenticated;
create function public.operation_data(org uuid,section text,filters jsonb default '{}') returns jsonb language sql security invoker set search_path='' as $$ select private.operation_data(org,section,filters) $$;
revoke all on function public.operation_data(uuid,text,jsonb) from public,anon;
grant execute on function public.operation_data(uuid,text,jsonb) to authenticated;
-- Include linked cash facts in the existing Financeiro without treating them as another sale.
do $$ declare definition text;begin
 select pg_get_functiondef(p.oid) into definition from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='get_financial_summary';
 definition=replace(definition,'t.source_type=''manual''','t.source_type in (''manual'',''sale_receipt'',''sale_refund'',''input_purchase'')');execute definition;
end $$;

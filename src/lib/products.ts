import {z} from "zod";
import Decimal from "decimal.js";
const D=Decimal.clone({precision:50,rounding:Decimal.ROUND_HALF_UP});
const dec=z.string().regex(/^\d+(\.\d+)?$/);
export const productSchema=z.object({id:z.uuid(),name:z.string(),internal_sku:z.string(),category:z.string(),description:z.string(),default_sale_price:dec,minimum_margin:dec,active:z.boolean(),version:z.number(),variant_count:z.number()});
export type Product=z.infer<typeof productSchema>;
export const productsSchema=z.object({total:z.number(),items:z.array(productSchema)});
export const productionFields=[
 ["piece_weight_g","Peso das peças do lote (g)"],["support_weight_g","Suportes do lote (g)"],["purge_weight_g","Purga do lote (g)"],
 ["print_time_minutes","Impressão do lote (min)"],["printer_power_watts","Potência da impressora (W)"],["electricity_price_kwh","Energia (R$/kWh)"],
 ["machine_hour_cost","Hora máquina (R$/h)"],["maintenance_cost_per_hour","Manutenção (R$/h)"],["labor_minutes","Trabalho manual por lote (min)"],["labor_hour_cost","Mão de obra (R$/h)"]
] as const;
export const variantSchema=z.object({id:z.uuid(),name:z.string(),sku:z.string(),price:dec,active:z.boolean(),version:z.number(),attributes:z.record(z.string(),z.unknown()),production:z.record(z.string(),z.string()),other_direct_costs:dec,overhead_percentage:dec,
 filament:z.object({id:z.uuid(),name:z.string(),base_unit:z.string(),average_cost:dec.nullable(),active:z.boolean(),version:z.number()}).nullable(),
 components:z.array(z.object({input_id:z.uuid(),name:z.string(),quantity:dec,unit:z.string(),waste_percentage:dec,base_unit:z.string(),average_cost:dec.nullable(),active:z.boolean(),input_version:z.number()}))});
export type Variant=z.infer<typeof variantSchema>;
export function failureFraction(percent:string){const n=new D(percent);if(n.isNegative()||n.gte(100))throw new Error("Falhas devem estar entre 0% e menos de 100%.");return n.div(100).toFixed();}
export function failurePercent(fraction:string){return new D(fraction).mul(100).toFixed();}
const unitFactors:Record<string,[string,string]>={g:["mass","1"],kg:["mass","1000"],ml:["volume","1"],l:["volume","1000"],metro:["length","100"],cm:["length","1"],unidade:["count","1"]};
function convert(quantity:Decimal,from:string,to:string){const a=unitFactors[from],b=unitFactors[to];if(!a||!b||a[0]!==b[0])throw new Error("Unidades incompatíveis na ficha.");return quantity.mul(a[1]).div(b[1]);}
export type CostLine={label:string;quantity?:string;unit?:string;amount:string|null};
export type CostSheet={lines:CostLine[];issues:string[];total:string|null;grossMargin:string|null;belowMinimum:boolean;version:string};
// Authoritative current-estimate calculation. Used on the server, never recalculated in forms.
export function calculateProductCost(variant:Variant,minimumMargin="0"):CostSheet{
 const lines:CostLine[]=[];const issues:string[]=[];let subtotal=new D(0);const versions:string[]=[`variant:${variant.id}:${variant.version}`];
 function materialCost(label:string,quantity:Decimal,unit:string,cost:string|null,active:boolean){
  if(cost===null||!active){issues.push(`${label}: ${!active?"insumo inativo":"custo ainda não informado"}.`);lines.push({label,quantity:quantity.toFixed(6),unit,amount:null});return;}
  const amount=quantity.mul(cost);subtotal=subtotal.plus(amount);lines.push({label,quantity:quantity.toFixed(6),unit,amount:amount.toFixed(6)});
 }
 function add(label:string,value:Decimal){subtotal=subtotal.plus(value);lines.push({label,amount:value.toFixed(6)});}
 for(const c of variant.components){if(new D(c.quantity).lte(0)||new D(c.waste_percentage).gt(100))throw new Error("Consumo inválido.");versions.push(`input:${c.input_id}:${c.input_version}`);materialCost(c.name,convert(new D(c.quantity).mul(new D(c.waste_percentage).div(100).plus(1)),c.unit,c.base_unit),c.base_unit,c.average_cost,c.active);}
 const p=variant.production;
 if(Object.keys(p).length){
  const batch=new D(p.quantity_per_batch);const failure=new D(p.failed_print_rate);
  if(batch.lt(1)||!batch.isInteger()||failure.lt(0)||failure.gte(1))throw new Error("Lote ou percentual de falha inválido.");
  for(const [key] of productionFields)if(new D(p[key]).lt(0))throw new Error("Valor negativo na ficha 3D.");
  const weight=new D(p.piece_weight_g).plus(p.support_weight_g).plus(p.purge_weight_g);if(weight.lte(0))throw new Error("Informe o peso do lote.");
  const f=variant.filament;
  if(!f)issues.push("Filamento não encontrado.");else{
   if(variant.components.some(c=>c.input_id===f.id))throw new Error("O filamento está duplicado nos componentes.");
   versions.push(`input:${f.id}:${f.version}`);materialCost("Filamento · "+f.name,convert(weight.div(new D(1).minus(failure)).div(batch),"g",f.base_unit),f.base_unit,f.average_cost,f.active);
  }
  const hours=new D(p.print_time_minutes).div(60).div(batch);
  add("Energia",hours.mul(p.printer_power_watts).div(1000).mul(p.electricity_price_kwh));
  add("Hora máquina",hours.mul(p.machine_hour_cost));add("Manutenção",hours.mul(p.maintenance_cost_per_hour));
  add("Mão de obra",new D(p.labor_minutes).div(60).div(batch).mul(p.labor_hour_cost));
 }
 if(!variant.components.length&&!Object.keys(p).length&&new D(variant.other_direct_costs).isZero()&&variant.attributes.manual_cost_confirmed!==true)issues.push("Adicione materiais, uma ficha 3D ou um custo direto.");
 add("Outros custos diretos",new D(variant.other_direct_costs));
 const overhead=subtotal.mul(variant.overhead_percentage).div(100);lines.push({label:"Rateio de indiretos ("+variant.overhead_percentage+"%)",amount:issues.length?null:overhead.toFixed(6)});
 const total=issues.length?null:subtotal.plus(overhead);const price=new D(variant.price);const margin=total&&price.gt(0)?price.minus(total).div(price).mul(100):null;
 return {lines,issues,total:total?.toFixed(6)??null,grossMargin:margin?.toFixed(2)??null,belowMinimum:margin?margin.lt(minimumMargin):false,version:versions.join("|")};
}

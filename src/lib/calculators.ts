import Decimal from "decimal.js";
import {z} from "zod";
const D=Decimal.clone({precision:50,rounding:Decimal.ROUND_HALF_UP});
export const calculatorDefaults:Record<string,string>={mode:"ml",price:"",cost:"",commission:"",tax:"0",fixed_fee:"0",shipping:"0",packaging:"0",outsourced:"0",storage:"0",collection:"0",reimbursement:"0",acos:"0",ads_share:"100",target_margin:"20",monthly_units:"0",monthly_fixed:"0",ad_type:"classico",logistics:"standard",filament_id:"",filament_kg:"",weight:"",support:"0",purge:"0",batch:"1",hours:"0",minutes:"0",watts:"",energy:"",machine_mode:"direct",machine_hour:"0",machine_purchase:"0",machine_residual:"0",machine_lifetime:"1",maintenance:"0",labor_setup:"0",labor_post:"0",labor_pack:"0",labor_hour:"0",failure:"0",extra_batch:"0",extra_unit:"0",printers:"1",hours_day:"8",days_month:"22",availability:"80",income_goal:"0"};
export const numericCalculatorKeys=Object.keys(calculatorDefaults).filter(k=>!["mode","ad_type","logistics","filament_id","machine_mode"].includes(k));
export function parseCalculator(raw:Record<string,string>){
 const values={...calculatorDefaults,...raw};
 values.mode=z.enum(["ml","3d"]).parse(values.mode);values.ad_type=z.enum(["classico","premium"]).parse(values.ad_type);values.logistics=z.enum(["standard","flex","full","full_super"]).parse(values.logistics);values.machine_mode=z.enum(["direct","derived"]).parse(values.machine_mode);
 for(const key of numericCalculatorKeys){let value=(values[key]??"").trim().replace(",",".");if(value===""){
   if(key==="price"||key==="commission"||(values.mode==="ml"&&key==="cost")||(values.mode==="3d"&&["weight","watts","energy"].includes(key))||(values.mode==="3d"&&!values.filament_id&&key==="filament_kg"))throw new Error("Preencha preço, custo e os parâmetros principais da calculadora.");value="0";
  }if(!/^\d{1,9}(\.\d{1,6})?$/.test(value))throw new Error("Use números sem separador de milhar, com até seis casas decimais.");values[key]=value;
 }
 if(!/^\d{1,9}(\.\d{1,2})?$/.test(values.price))throw new Error("O preço de venda aceita até duas casas decimais.");
 for(const key of ["failure","target_margin"])if(!/^\d{1,3}(\.\d{1,4})?$/.test(values[key]))throw new Error("Falhas e margem alvo aceitam até quatro casas decimais.");
 for(const key of ["commission","tax","ads_share","target_margin","failure","availability"])if(new D(values[key]).gt(100))throw new Error("Percentuais devem estar entre 0 e 100.");
 for(const key of ["monthly_units","batch","printers","days_month"])if(!new D(values[key]).isInteger())throw new Error("Quantidades devem ser inteiras.");
 if(new D(values.hours_day).gt(24)||new D(values.days_month).gt(31)||new D(values.minutes).gte(60))throw new Error("Confira horas por dia, dias por mês e minutos (0–59).");
 if(values.mode==="3d"&&(new D(values.batch).lt(1)||new D(values.batch).gt(999999)||new D(values.failure).gte(100)||new D(values.weight).plus(values.support).plus(values.purge).lte(0)))throw new Error("Informe lote e peso maiores que zero e falhas menores que 100%.");
 return values;
}
export function saleEstimate(cost:string,values:Record<string,string>){
 const n=(k:string)=>new D(values[k]||"0");const price=n("price"),rate=n("commission").plus(n("tax")).plus(n("acos").mul(n("ads_share")).div(100)).div(100);
 const logistics=n("shipping").plus(n("outsourced")).plus(n("storage")).plus(n("collection")).minus(n("reimbursement"));
 if(logistics.lt(0))throw new Error("O reembolso de frete não pode superar os custos logísticos informados.");
 const fixed=new D(cost).plus(n("fixed_fee")).plus(n("packaging")).plus(logistics);const total=fixed.plus(price.mul(rate));const profit=price.minus(total);
 const targetDen=new D(1).minus(rate).minus(n("target_margin").div(100));const breakDen=new D(1).minus(rate);
 return {cost:new D(cost).toFixed(6),price:price.toFixed(2),total:total.toFixed(6),profit:profit.toFixed(6),margin:price.gt(0)?profit.div(price).mul(100).toFixed(2):null,roi:new D(cost).gt(0)?profit.div(cost).mul(100).toFixed(2):null,breakEven:breakDen.gt(0)?fixed.div(breakDen).toDecimalPlaces(2,Decimal.ROUND_UP).toFixed(2):null,idealPrice:targetDen.gt(0)?fixed.div(targetDen).toDecimalPlaces(2,Decimal.ROUND_UP).toFixed(2):null,monthlyRevenue:price.mul(n("monthly_units")).toFixed(2),monthlyProfit:profit.mul(n("monthly_units")).minus(n("monthly_fixed")).toFixed(2),lines:[{label:"Custo do produto",amount:new D(cost).toFixed(6)},{label:"Comissão",amount:price.mul(n("commission")).div(100).toFixed(6)},{label:"Tarifa fixa",amount:n("fixed_fee").toFixed(6)},{label:"Impostos",amount:price.mul(n("tax")).div(100).toFixed(6)},{label:"Publicidade (ACOS × participação)",amount:price.mul(n("acos")).mul(n("ads_share")).div(10000).toFixed(6)},{label:"Logística líquida",amount:logistics.toFixed(6)},{label:"Embalagem adicional da venda",amount:n("packaging").toFixed(6)}]};
}
export function machineHourly(values:Record<string,string>){
 if(values.machine_mode!=="derived")return values.machine_hour;
 const basis=new D(values.machine_purchase).minus(values.machine_residual);if(basis.lt(0)||new D(values.machine_lifetime).lte(0))throw new Error("Valor residual deve ser menor que a compra e vida útil maior que zero.");return basis.div(values.machine_lifetime).toFixed(6);
}
export function savedSaleEstimate(attributes:Record<string,unknown>,cost:string|null,price:string){
 if(cost===null)return null;
 try{const settings=z.record(z.string(),z.string()).parse(attributes.calculator);return saleEstimate(cost,parseCalculator({...settings,price}));}catch{return null;}
}
export function productionParameters(values:Record<string,string>){return {filament_id:values.filament_id,quantity_per_batch:values.batch,failed_print_rate:new D(values.failure).div(100).toFixed(),piece_weight_g:values.weight,support_weight_g:values.support,purge_weight_g:values.purge,print_time_minutes:new D(values.hours).mul(60).plus(values.minutes).toFixed(),printer_power_watts:values.watts,electricity_price_kwh:values.energy,machine_hour_cost:machineHourly(values),maintenance_cost_per_hour:values.maintenance,labor_minutes:new D(values.labor_setup).plus(values.labor_post).plus(values.labor_pack).toFixed(),labor_hour_cost:values.labor_hour};}
export function extraUnitCost(values:Record<string,string>){return new D(values.extra_batch).div(values.batch).plus(values.extra_unit).toFixed(6);}
export function capacityEstimate(values:Record<string,string>,profit:string){
 const perUnit=new D(values.hours).plus(new D(values.minutes).div(60)).div(values.batch);if(perUnit.lte(0))return null;
 const available=new D(values.printers).mul(values.hours_day).mul(values.days_month).mul(values.availability).div(100);const capacity=available.div(perUnit).floor();const deliverable=Decimal.min(capacity,values.monthly_units);const contribution=new D(deliverable).mul(profit).minus(values.monthly_fixed);
 return {capacity:capacity.toFixed(0),deliverable:deliverable.toFixed(0),load:available.gt(0)?new D(values.monthly_units).mul(perUnit).div(available).mul(100).toFixed(1):null,monthlyResult:contribution.toFixed(2),goalGap:Decimal.max(new D(values.income_goal).minus(contribution),0).toFixed(2)};
}

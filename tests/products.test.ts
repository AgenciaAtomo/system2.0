import {test} from "node:test";
import assert from "node:assert/strict";
import {calculateProductCost,failureFraction,failurePercent,type Variant} from "../src/lib/products.ts";
const base:Variant={id:"v",name:"Teste",sku:"QA",price:"20",active:true,version:1,attributes:{},production:{},other_direct_costs:"0",overhead_percentage:"0",filament:null,components:[{input_id:"i",name:"Material",quantity:"0.075",unit:"kg",waste_percentage:"10",base_unit:"g",average_cost:"0.075",active:true,input_version:1}]};
test("BOM converte kg para g e aplica desperdício sem arredondar cedo",()=>{assert.equal(calculateProductCost(base).total,"6.187500");});
test("ficha 3D normaliza lote e falhas somente no filamento",()=>{
 const v:Variant={...base,other_direct_costs:"0.2",overhead_percentage:"10",filament:{id:"f",name:"PETG",base_unit:"g",average_cost:"0.075",active:true,version:1},components:[{...base.components[0],quantity:"1",unit:"unidade",base_unit:"unidade",average_cost:"1"}],production:{filament_id:"f",quantity_per_batch:"2",failed_print_rate:"0.1",piece_weight_g:"100",support_weight_g:"10",purge_weight_g:"10",print_time_minutes:"120",printer_power_watts:"200",electricity_price_kwh:"1",machine_hour_cost:"2",maintenance_cost_per_hour:"0.5",labor_minutes:"30",labor_hour_cost:"20"}};
 const cost=calculateProductCost(v,"25");assert.equal(cost.total,"15.400000");assert.equal(cost.grossMargin,"23.00");assert.equal(cost.belowMinimum,true);assert.equal(cost.lines.find(l=>l.label.startsWith("Filamento"))?.amount,"5.000000");
 assert.throws(()=>calculateProductCost({...v,production:{...v.production,quantity_per_batch:"0"}}));assert.throws(()=>calculateProductCost({...v,production:{...v.production,failed_print_rate:"1"}}));assert.throws(()=>calculateProductCost({...v,components:[{...v.components[0],input_id:"f"}]}));
});
test("custo desconhecido e ficha vazia não aparentam custo zero",()=>{
 assert.equal(calculateProductCost({...base,components:[{...base.components[0],average_cost:null}]}).total,null);
 assert.equal(calculateProductCost({...base,components:[]}).grossMargin,null);
 assert.equal(calculateProductCost({...base,components:[{...base.components[0],active:false}]}).total,null);
 assert.equal(calculateProductCost({...base,price:"0"}).grossMargin,null);
});
test("percentual de falhas usa fração e rejeita divisão por zero",()=>{assert.equal(failureFraction("12.5"),"0.125");assert.equal(failurePercent("0.125"),"12.5");assert.throws(()=>failureFraction("100"));assert.throws(()=>failureFraction("-1"));});
test("mudar custo atual altera estimativa sem modificar entradas anteriores",()=>{const prior=calculateProductCost(base);const next=calculateProductCost({...base,components:[{...base.components[0],average_cost:"0.1",input_version:2}]});assert.equal(prior.total,"6.187500");assert.equal(next.total,"8.250000");assert.notEqual(prior.version,next.version);});

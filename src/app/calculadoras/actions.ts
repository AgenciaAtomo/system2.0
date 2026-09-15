"use server";
import {z} from "zod";
import Decimal from "decimal.js";
import {requireAccess} from "@/services/access";
import {calculatorDefaults,parseCalculator,productionParameters,extraUnitCost,saleEstimate,capacityEstimate} from "@/lib/calculators";
import {variantSchema,calculateProductCost,type Variant,type CostLine} from "@/lib/products";
import {inputDecimal,inputUnits} from "@/lib/inputs";
import {revalidatePath} from "next/cache";
import {redirect} from "next/navigation";
import type {Json} from "@/types/database.types";
export type CalculatorResult={sale:ReturnType<typeof saleEstimate>;capacity:ReturnType<typeof capacityEstimate>;lines:CostLine[];warnings:string[]};
export type CalculatorState={message:string;result?:CalculatorResult};
export async function runCalculator(_previous:CalculatorState,form:FormData):Promise<CalculatorState>{
 const {client,organizationId}=await requireAccess("operational.read");const get=(k:string)=>String(form.get(k)??"").trim();let saved:{product_id:string;variant_id:string}|undefined;
 try{
  const values=parseCalculator(Object.fromEntries(Object.keys(calculatorDefaults).map(k=>[k,get(k)||calculatorDefaults[k]])));const requestId=z.uuid().parse(get("request_id"));
  const productId=z.union([z.uuid(),z.literal("")]).parse(get("product_id")),variantId=z.union([z.uuid(),z.literal("")]).parse(get("variant_id"));let existing:Variant|undefined;
  if(variantId){if(!productId)throw new Error("Produto inválido.");const r=await client.rpc("get_product_variants",{org:organizationId,product:productId});if(r.error)throw new Error("Não foi possível consultar o produto.");existing=z.array(variantSchema).parse(r.data).find(v=>v.id===variantId);if(!existing)throw new Error("Versão não encontrada.");if(String(existing.version)!==get("version"))throw new Error("O produto mudou. Atualize a página antes de continuar.");}
  const materialRead=await client.rpc("get_calculator_materials",{org:organizationId});if(materialRead.error)throw new Error("Não foi possível ler os insumos.");
  const materials=z.array(z.object({id:z.uuid(),name:z.string(),sku:z.string(),base_unit:z.string(),average_cost:z.string().nullable(),active:z.boolean(),version:z.number()})).parse(materialRead.data);
  const ids=form.getAll("component_id"),quantities=form.getAll("component_quantity"),units=form.getAll("component_unit"),wastes=form.getAll("component_waste");if(ids.length>100||quantities.length!==ids.length||units.length!==ids.length||wastes.length!==ids.length)throw new Error("Confira os materiais.");
  const components=ids.map((id,i)=>{const m=materials.find(m=>m.id===z.uuid().parse(String(id)));if(!m)throw new Error("Material não encontrado.");return {input_id:m.id,name:m.name,quantity:inputDecimal(String(quantities[i])),unit:z.enum(inputUnits).parse(String(units[i])),waste_percentage:inputDecimal(String(wastes[i])||"0",4,3),base_unit:m.base_unit,average_cost:m.average_cost,active:m.active,input_version:m.version};});
  if(new Set(components.map(c=>c.input_id)).size!==components.length)throw new Error("Não repita o mesmo material na ficha.");
  const variant:Variant={id:variantId||crypto.randomUUID(),name:get("variant_name")||"Padrão",sku:get("sku"),price:values.price,active:existing?.active??true,version:existing?.version??1,attributes:existing?.attributes??{},production:{},other_direct_costs:values.cost,overhead_percentage:"0",filament:null,components};const warnings:string[]=[];
  if(values.mode==="3d"){
   variant.production=productionParameters(values);variant.other_direct_costs=extraUnitCost(values);
   const m=materials.find(m=>m.id===values.filament_id);
   if(values.filament_id&&!m)throw new Error("Filamento não encontrado.");
   if(m){if(!["g","kg"].includes(m.base_unit))throw new Error("Selecione um filamento em g ou kg.");variant.filament=m;}
   else{variant.filament={id:"manual",name:"Filamento informado",base_unit:"g",average_cost:new Decimal(values.filament_kg).div(1000).toFixed(9),active:true,version:0};warnings.push("Filamento com preço manual: sem vínculo de consumo ao estoque. Selecione um insumo para vincular.");}
  }else if(existing&&Object.keys(existing.production).length){variant.production=existing.production;variant.filament=existing.filament;variant.other_direct_costs=existing.other_direct_costs;variant.overhead_percentage=existing.overhead_percentage;}
  if(values.mode==="ml"&&!Object.keys(variant.production).length)variant.attributes={...variant.attributes,manual_cost_confirmed:true};
  if(new Decimal(values.packaging).gt(0))warnings.push("Embalagem em reais é adicional: não inclua novamente uma embalagem já vinculada nos materiais.");
  const cost=calculateProductCost(variant);if(cost.total===null)throw new Error(cost.issues.join(" "));
  const sale=saleEstimate(cost.total,values);const result:CalculatorResult={sale,capacity:values.mode==="3d"?capacityEstimate(values,sale.profit):null,lines:cost.lines,warnings};
  if(get("intent")!=="save")return {message:"Simulação atualizada. Nenhum estoque foi movimentado.",result};
  const name=z.string().min(1).max(200).parse(get("name"));const sku=z.string().regex(/^[A-Z0-9._-]{1,60}$/).parse(get("sku").toUpperCase());
  if(values.mode==="3d"&&!values.filament_id){
   // Keep the complete recipe in calculator parameters; material linkage can be added later.
   const componentOnly=calculateProductCost({...variant,production:{},filament:null,other_direct_costs:"0"});
   const linkedCost=components.length?componentOnly.total??"0":"0";
   variant.other_direct_costs=new Decimal(cost.total).minus(linkedCost).toFixed(6);variant.production={};variant.filament=null;variant.attributes={...variant.attributes,manual_cost_confirmed:true};
  }
  const attrs={...variant.attributes,calculator:values};
  const r=await client.rpc("save_calculator",{org:organizationId,request_id:requestId,product_payload:{id:productId,name,sku,price:new Decimal(values.price).toFixed(2),minimum_margin:values.target_margin,active:true},variant_payload:{id:variantId,version:String(variant.version),name:z.string().min(1).max(100).parse(variant.name),sku:variantId?sku:sku+"-01",price:new Decimal(values.price).toFixed(2),active:variant.active,attributes:attrs as Json,production:variant.production,components:components.map(c=>({input_id:c.input_id,quantity:c.quantity,unit:c.unit,waste_percentage:c.waste_percentage})),other_direct_costs:variant.other_direct_costs,overhead_percentage:variant.overhead_percentage}});
  if(r.error){if(r.error.code==="23505")throw new Error("Esse SKU já existe. Abra o produto existente para ajustar a simulação.");if(r.error.code==="40001")throw new Error("O produto mudou. Atualize a página.");throw new Error("Não foi possível salvar. Confira seu acesso, os insumos ativos e os valores da ficha.");}saved=z.object({product_id:z.uuid(),variant_id:z.uuid()}).parse(r.data);
 }catch(e){return {message:e instanceof z.ZodError?"Confira os campos e informe nome e SKU para salvar.":e instanceof Error?e.message:"Não foi possível calcular."};}
 for(const path of ["/produtos","/calculadoras","/custos","/estoque","/producao","/vendas","/dashboard"])revalidatePath(path);redirect(`/produtos?product=${saved!.product_id}&variant=${saved!.variant_id}&saved=1`);
}


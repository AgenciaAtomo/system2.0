"use server";
import {z} from "zod";
import {requireAccess} from "@/services/access";
import {inputDecimal,inputUnits} from "@/lib/inputs";
import {failureFraction,productionFields} from "@/lib/products";
import {parseMoney} from "@/lib/finance";
import {redirect} from "next/navigation";
import {revalidatePath} from "next/cache";
import type {Json} from "@/types/database.types";
export async function saveProduct(_previous:{message:string},form:FormData):Promise<{message:string}>{
 const {client,organizationId}=await requireAccess("operational.write");const get=(k:string)=>String(form.get(k)??"").trim();
 let payload:Record<string,Json>={};let req="";let parent="";
 try{
  req=z.uuid().parse(get("request_id"));const kind=z.enum(["product","variant"]).parse(get("kind"));const id=z.union([z.uuid(),z.literal("")]).parse(get("id"));
  payload={kind,id,version:z.string().regex(/^[1-9]\d{0,8}$/).parse(get("version")),name:z.string().min(1).max(kind==="product"?200:100).parse(get("name")),sku:z.string().regex(/^[A-Z0-9._-]{1,64}$/).parse(get("sku").toUpperCase()),price:parseMoney(get("price")),active:get("active")==="on"};
  if(kind==="product"){
   payload.category=z.string().max(100).parse(get("category"));payload.description=z.string().max(2000).parse(get("description"));payload.minimum_margin=inputDecimal(get("minimum_margin")||"0",4,3);
  }else{
   parent=z.uuid().parse(get("product_id"));payload.product_id=parent;payload.other_direct_costs=inputDecimal(get("other_direct_costs")||"0",6,9);payload.overhead_percentage=inputDecimal(get("overhead_percentage")||"0",4,3);
   let previousAttributes:Record<string,Json>={};
   if(id){const prior=await client.from("product_variants").select("attributes").eq("id",id).eq("organization_id",organizationId).maybeSingle();if(prior.error)throw new Error("Não foi possível ler os parâmetros da versão.");if(prior.data?.attributes&&typeof prior.data.attributes==="object"&&!Array.isArray(prior.data.attributes))previousAttributes=Object.fromEntries(Object.entries(prior.data.attributes).filter((entry):entry is [string,Json]=>entry[1]!==undefined));}
   payload.attributes={...previousAttributes,color:z.string().max(100).parse(get("color")),size:z.string().max(100).parse(get("size"))};
   const ids=form.getAll("component_id"),quantities=form.getAll("component_quantity"),units=form.getAll("component_unit"),wastes=form.getAll("component_waste");
   if(ids.length>100||ids.length!==quantities.length||ids.length!==units.length||ids.length!==wastes.length)throw new Error("Confira os componentes.");
   payload.components=ids.map((value,i)=>({input_id:z.uuid().parse(String(value)),quantity:inputDecimal(String(quantities[i])),unit:z.enum(inputUnits).parse(String(units[i])),waste_percentage:inputDecimal(String(wastes[i])||"0",4,3)}));
   const sheet:Record<string,string>={};if(get("use_3d")==="on"){
    sheet.filament_id=z.uuid().parse(get("filament_id"));sheet.quantity_per_batch=z.string().regex(/^[1-9]\d{0,5}$/).parse(get("quantity_per_batch"));sheet.failed_print_rate=failureFraction(inputDecimal(get("failed_print_percent")||"0",4,2));
    for(const [key] of productionFields)sheet[key]=inputDecimal(get(key)||"0",6,9);
   }payload.production=sheet;
  }
 }catch(e){return {message:e instanceof z.ZodError?"Confira os campos obrigatórios e use um SKU sem espaços.":e instanceof Error?e.message:"Confira os valores."};}
 const {data,error}=await client.rpc("save_product",{org:organizationId,request_id:req,payload});
 if(error){if(error.code==="23505")return {message:"SKU já usado ou material repetido na ficha. Confira os dados."};if(error.code==="40001")return {message:"O cadastro mudou. Atualize a página e tente novamente."};if(error.code==="22023")return {message:"Confira a ficha: use insumos ativos, unidades compatíveis, lote maior que zero e percentuais válidos. O filamento da ficha 3D não deve ser repetido nos componentes."};return {message:"Não foi possível salvar o produto. Confira seu acesso e tente novamente."};}
 for(const path of ["/produtos","/calculadoras","/custos","/estoque","/producao","/vendas","/dashboard"])revalidatePath(path);redirect("/produtos?product="+(parent||data)+(parent?"&variant="+data:"")+"&saved=1");
}



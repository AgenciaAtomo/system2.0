"use server";
import {requireAccess} from "@/services/access";
import {inputDecimal,inputUnits} from "@/lib/inputs";
import {entryDate,saoPauloToday} from "@/lib/entries";
import {parseMoney} from "@/lib/finance";
import {z} from "zod";
import {revalidatePath} from "next/cache";
import {redirect} from "next/navigation";
export async function saveInput(_previous:{message:string},form:FormData):Promise<{message:string}>{
 const {client,organizationId}=await requireAccess("operational.write");
 const get=(key:string)=>String(form.get(key)??"").trim();
 const base=z.object({request_id:z.uuid(),id:z.union([z.uuid(),z.literal("")]),version:z.string().regex(/^[1-9][0-9]{0,8}$/),operation:z.enum(["save","purchase","adjust"])}).safeParse(Object.fromEntries(["request_id","id","version","operation"].map(k=>[k,get(k)])));
 if(!base.success)return {message:"Atualize a página e tente novamente."};
 const {operation,id,version,request_id}=base.data;
 const payload:Record<string,string|boolean>={operation,version};if(id)payload.id=id;
 try{
  if(operation==="save"){
   payload.name=z.string().min(1).max(200).parse(get("name"));payload.sku=z.string().regex(/^[A-Z0-9._-]{1,64}$/).parse(get("sku").toUpperCase());
   payload.base_unit=z.enum(inputUnits).parse(get("base_unit"));payload.category=z.string().max(100).parse(get("category"));payload.default_supplier=z.string().max(200).parse(get("default_supplier"));
   payload.minimum_stock=inputDecimal(get("minimum_stock"));payload.active=get("active")==="on";
  }else{
   if(!id)throw new Error("Selecione um insumo.");
   payload.date=entryDate.parse(get("date"));if(payload.date>saoPauloToday())throw new Error("A data não pode estar no futuro.");
   if(operation==="purchase"){
    payload.supplier=z.string().min(1).max(200).parse(get("supplier"));payload.quantity=inputDecimal(get("quantity"));payload.purchase_unit=z.enum(inputUnits).parse(get("purchase_unit"));
    for(const key of ["total_price","freight","taxes","other_costs"])payload[key]=parseMoney(get(key)||"0");
   }else{
    payload.counted_quantity=inputDecimal(get("counted_quantity"));payload.unit_cost=inputDecimal(get("unit_cost")||"0",6,14);payload.reason=z.string().min(3).max(500).parse(get("reason"));
   }
  }
 }catch(error){return {message:error instanceof z.ZodError?"Confira os campos. Use um código sem espaços e informe todos os campos obrigatórios.":error instanceof Error?error.message:"Confira os valores."};}
 const {error}=operation==="purchase"?await client.rpc("purchase_input",{org:organizationId,request_id,payload,finance:{status:get("finance_status")||"none",account_id:get("account_id"),category_id:get("category_id"),due_date:get("due_date")}}):await client.rpc("save_input",{org:organizationId,request_id,payload});
 if(error){
  if(error.code==="23505")return {message:"Esse código já está cadastrado. Use outro SKU."};
  if(error.code==="40001")return {message:"Este insumo mudou. Atualize a página antes de salvar novamente."};
  if(["22023","22007","22008","22003"].includes(error.code))return {message:"Confira a quantidade, os custos e a data. A compra precisa ter valor e quantidade maiores que zero; a data não pode preceder o último movimento. No ajuste, informe uma quantidade diferente do estoque atual."};
  return {message:"Não foi possível salvar. Confira seu acesso e tente novamente."};
 }
 for(const path of ["/insumos","/produtos","/custos","/estoque","/calculadoras","/financeiro","/financeiro/lancamentos","/dashboard"])revalidatePath(path);redirect("/insumos?saved="+operation+(operation==="save"?"&q="+encodeURIComponent(String(payload.sku)):""));
}


"use server";
import {requireAccess} from "@/services/access";
import {catalogKind,parseMoney} from "@/lib/finance";
import {z} from "zod";
import {redirect} from "next/navigation";
import {revalidatePath} from "next/cache";
const input=z.object({kind:catalogKind,request_id:z.uuid(),id:z.union([z.uuid(),z.literal("")]),operation:z.enum(["save","archive"]),name:z.string().max(100),type:z.string().max(30),opening_balance:z.string().max(32),parent_id:z.union([z.uuid(),z.literal("")])});
export async function saveCatalog(_previous:{message:string},form:FormData):Promise<{message:string}>{
 const {client,organizationId}=await requireAccess("financial.write");
 const raw=input.safeParse(Object.fromEntries(["kind","request_id","id","operation","name","type","opening_balance","parent_id"].map(key=>[key,String(form.get(key)??"")])));
 if(!raw.success)return {message:"Confira os campos informados."};
 const row=raw.data;
 const payload:Record<string,string>={kind:row.kind,operation:row.operation};
 if(row.id)payload.id=row.id;
 if(row.operation==="save"){
  if(!row.name.trim())return {message:"Informe um nome."};
  payload.name=row.name.trim();
  if(row.kind==="account"&&!row.id){payload.type=row.type;try{payload.opening_balance=parseMoney(row.opening_balance);}catch{return {message:"Informe um saldo válido, como 1.250,90."};}}
  if(row.kind==="category"){payload.type=row.type;if(row.parent_id)payload.parent_id=row.parent_id;}
 }
 const {error}=await client.rpc("save_financial_catalog",{org:organizationId,request_id:row.request_id,payload});
 if(error){
  if(error.code==="23505")return {message:"Já existe um cadastro com esse nome."};
  if(error.code==="22023")return {message:"Confira o tipo e a hierarquia. Categorias não podem formar ciclos; arquive as filhas antes da categoria pai."};
  return {message:"Não foi possível salvar. Confira seu acesso e tente novamente."};
 }
 revalidatePath("/financeiro");revalidatePath("/");
 redirect("/financeiro?kind="+row.kind+"&saved=1");
}

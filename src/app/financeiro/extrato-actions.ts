"use server";
import {createHash} from "node:crypto";
import {redirect} from "next/navigation";
import {revalidatePath} from "next/cache";
import {z} from "zod";
import {requireAccess} from "@/services/access";
import {parseBankStatementFile} from "@/lib/bank-statement";

function hashToUuid(seed:string){
 const hash=createHash("sha256").update(seed).digest("hex");
 return `${hash.slice(0,8)}-${hash.slice(8,12)}-4${hash.slice(13,16)}-a${hash.slice(17,20)}-${hash.slice(20,32)}`;
}
function revalidateFinance(){
 for(const path of ["/financeiro","/financeiro/lancamentos","/financeiro/extrato","/dashboard","/relatorios","/analise"])revalidatePath(path);
}
export async function uploadBankStatement(_previous:{message:string},form:FormData):Promise<{message:string}>{
 const parsed=z.object({request_id:z.uuid(),account_id:z.uuid()}).safeParse(Object.fromEntries([...form].filter(([key])=>key!=="file"&&!key.startsWith("$ACTION_")).map(([key,value])=>[key,String(value)])));
 const file=form.get("file");
 if(!parsed.success||!(file instanceof File))return {message:"Selecione a conta e o arquivo do extrato."};
 if(file.size<=0||file.size>2*1024*1024)return {message:"Envie um arquivo de até 2 MB."};
 if(!/\.(csv|txt|ofx)$/i.test(file.name))return {message:"Por enquanto, envie CSV, TXT ou OFX exportado pelo banco."};
 const {client,organizationId}=await requireAccess("financial.write");
 let rows:ReturnType<typeof parseBankStatementFile>;
 let content:string;
 try{
  content=await file.text();
  rows=parseBankStatementFile(file.name,content);
 }catch(error){
  return {message:error instanceof Error?error.message:"Não foi possível ler o extrato."};
 }
 const fileHash=createHash("sha256").update(content).digest("hex");
 const payload={account_id:parsed.data.account_id,file_name:file.name.slice(0,240),file_hash:fileHash,rows:rows.map((row,index)=>({...row,fingerprint:hashToUuid([organizationId,parsed.data.account_id,row.date,row.type,row.amount,row.description,row.reference||index].join("|"))}))};
 const {data,error}=await (client as any).rpc("import_bank_statement",{org:organizationId,request_id:parsed.data.request_id,payload});
 if(error)return {message:["PGRST202","42883"].includes(error.code??"")?"O leitor de extrato ainda não foi ativado no banco. Aplique a migration e tente novamente.":error.code==="22023"?"Confira o arquivo: há linhas sem data, descrição ou valor válido.":"Não foi possível importar o extrato. Confira seu acesso e tente novamente."};
 revalidateFinance();
 redirect("/financeiro/extrato?import="+encodeURIComponent(String(data?.import_id??""))+"&saved=upload");
}
export async function resolveBankStatementDraft(_previous:{message:string},form:FormData):Promise<{message:string}>{
 const fields=Object.fromEntries([...form].filter(([key])=>!key.startsWith("$ACTION_")).map(([key,value])=>[key,String(value)]));
 const parsed=z.object({request_id:z.uuid(),draft_id:z.uuid(),operation:z.enum(["categorize","ignore"]),category_id:z.union([z.uuid(),z.literal("")]).default("")}).safeParse(fields);
 if(!parsed.success)return {message:"Confira a categoria e tente novamente."};
 if(parsed.data.operation==="categorize"&&!parsed.data.category_id)return {message:"Escolha uma categoria para registrar este lançamento."};
 const {client,organizationId}=await requireAccess("financial.write");
 const payload={operation:parsed.data.operation,draft_id:parsed.data.draft_id,category_id:parsed.data.category_id};
 const {error}=await (client as any).rpc("resolve_bank_statement_draft",{org:organizationId,request_id:parsed.data.request_id,payload});
 if(error)return {message:["PGRST202","42883"].includes(error.code??"")?"O leitor de extrato ainda não foi ativado no banco. Aplique a migration e tente novamente.":error.code==="23505"?"Este item já foi resolvido. Atualize a tela.":"Não foi possível resolver este item. Confira a categoria e tente novamente."};
 revalidateFinance();
 redirect("/financeiro/extrato?saved="+parsed.data.operation);
}

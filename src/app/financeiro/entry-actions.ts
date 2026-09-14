"use server";
import Decimal from "decimal.js";
import {redirect} from "next/navigation";
import {revalidatePath} from "next/cache";
import {requireAccess} from "@/services/access";
import {entryInput,entryFields,entryDate,saoPauloToday,previewInstallments} from "@/lib/entries";
import {parseMoney} from "@/lib/finance";
import {z} from "zod";

export async function reviseEntry(_previous:{message:string},form:FormData):Promise<{message:string}>{
 const {client,organizationId}=await requireAccess("financial.write");
 const parsed=z.object({id:z.uuid(),request_id:z.uuid(),version:z.coerce.number().int().positive(),operation:z.enum(["remove","amend"]),description:z.string().trim().max(500).default(""),notes:z.string().trim().max(2000).default("")}).safeParse(Object.fromEntries(form));
 if(!parsed.success)return {message:"Confira os campos e tente novamente."};
 const {request_id,...payload}=parsed.data;
 if(payload.operation==="amend"&&!payload.description)return {message:"Informe a descrição."};
 const {error}=await client.rpc("revise_financial_entry",{org:organizationId,request_id,payload});
 if(error)return {message:error.code==="40001"?"Este lançamento mudou. Atualize a página antes de tentar novamente.":"Não foi possível concluir. Atualize a página e confira seu acesso."};
 revalidatePath("/financeiro","layout");revalidatePath("/");
 redirect("/financeiro/lancamentos?saved="+payload.operation);
}

export async function saveEntry(_previous:{message:string},form:FormData):Promise<{message:string}>{
 const {client,organizationId}=await requireAccess("financial.write");
 const fields=Object.fromEntries([...form].filter(([key])=>!key.startsWith("$ACTION_")).map(([key,value])=>[key,String(value)]));
 const base=entryInput.safeParse(fields);
 if(!base.success)return {message:"Confira os dados e atualize a página antes de tentar novamente."};
 const {request_id,id,version,operation}=base.data;
 const payload:Record<string,string|number>={operation};
 if(id){payload.id=id;payload.version=version;}
 if(operation==="save"){
  const parsed=entryFields.safeParse(fields);
  if(!parsed.success)return {message:"Confira a descrição, o valor, os cadastros e as datas informadas."};
  Object.assign(payload,parsed.data);
  try{payload.amount=parseMoney(parsed.data.amount);if(new Decimal(payload.amount).lte(0))throw new Error();}
  catch{return {message:"Informe um valor maior que zero, com até duas casas decimais, como 1.250,90."};}
  if(parsed.data.paid_date>saoPauloToday())return {message:"O pagamento não pode ter uma data futura."};
  try{previewInstallments(String(payload.amount),parsed.data.installments,parsed.data.due_date);}catch{return {message:"Confira o parcelamento: de 1 a 120 parcelas, ao menos R$ 0,01 por parcela e vencimentos até 2199."};}
 }else if(operation==="settle"){
  const paid=entryDate.safeParse(fields.paid_date);
  if(!id||!paid.success||paid.data>saoPauloToday())return {message:"Informe uma data de pagamento válida, até hoje."};
  payload.paid_date=paid.data;
  try{payload.settlement_amount=parseMoney(fields.settlement_amount??"");if(new Decimal(payload.settlement_amount).lte(0))throw new Error();}
  catch{return {message:"Informe o valor pago ou recebido, maior que zero e com até duas casas decimais."};}
  if((fields.payment_notes??"").length>2000)return {message:"Use até 2.000 caracteres nas observações do pagamento."};
  payload.payment_notes=fields.payment_notes?.trim()??"";
 }else{
  const reason=fields.reason?.trim();
  if(!id||!reason||reason.length<3||reason.length>500)return {message:"Informe o motivo do cancelamento (3 a 500 caracteres)."};
  payload.reason=reason;
 }
 const {error}=await client.rpc("save_financial_entry",{org:organizationId,request_id,payload});
 if(error){
  if(error.code==="40001")return {message:"Este lançamento mudou. Atualize a página para usar a versão mais recente."};
  if(["22023","22007","22008","23514","22P02"].includes(error.code))return {message:operation==="settle"?"Confira a data e o valor: a baixa não pode superar o saldo em aberto. A conta precisa estar ativa.":"Confira datas, parcelas e cadastros ativos. Valores de parcelas e lançamentos com pagamentos não podem ser alterados."};
  return {message:"Não foi possível salvar. Atualize a página, confira seu acesso e tente novamente."};
 }
 revalidatePath("/financeiro","layout");revalidatePath("/");
 redirect("/financeiro/lancamentos?saved="+operation);
}

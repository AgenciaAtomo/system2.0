"use server";
import {requireAccess} from '@/services/access';
import {revalidatePath} from 'next/cache';
import {z} from 'zod';
import type {Json} from '@/types/database.types';
export type OperationState={message:string;success?:boolean;requestId?:string};
export async function operationAction(_previous:OperationState,form:FormData):Promise<OperationState>{
 const op=String(form.get('operation')??'');
 const {client,organizationId}=await requireAccess(['produce','reverse_production'].includes(op)?'operational.write':'financial.write');
 try{
  const requestId=z.uuid().parse(form.get('request_id'));const payload:Record<string,Json>={};
  for(const [key,value] of form.entries())if(!key.startsWith('$ACTION')&&key!=='request_id'&&typeof value==='string')payload[key]=value.trim();
  for(const key of ['quantity','unit_cost','amount','percentage','fixed','minimum','maximum','fees','taxes','shipping','shipping_income','discount','other','expected','target'])if(typeof payload[key]==='string')payload[key]=payload[key].replace(',','.');
  if(form.has('items')){const items=z.array(z.object({variant_id:z.string().optional(),sku:z.string().optional(),quantity:z.string(),price:z.string(),unit_cost:z.string().optional()})).min(1).max(100).parse(JSON.parse(String(form.get('items'))));payload.items=items.map(i=>({...i,quantity:i.quantity.replace(',','.'),price:i.price.replace(',','.'),unit_cost:(i.unit_cost??'0').replace(',','.')}));}
  const {error}=await client.rpc('operate',{org:organizationId,request_id:requestId,payload});
  if(error){if(error.code==='23505')return {message:'Este pedido ou cadastro já existe. Nenhuma duplicata foi criada.'};if(error.code==='42501')return {message:'Seu acesso não permite esta operação.'};if(error.code==='P0001')return {message:error.message};return {message:'Confira os campos, valores, datas e cadastros selecionados.'};}
  for(const path of ['/dashboard','/estoque','/producao','/custos','/vendas','/recebiveis','/marketplaces','/relatorios','/analise','/financeiro','/financeiro/lancamentos','/insumos','/produtos'])revalidatePath(path);
  return {message:'Registrado com sucesso.',success:true,requestId:crypto.randomUUID()};
 }catch{return {message:'Confira os campos obrigatórios e os valores informados.'};}
}

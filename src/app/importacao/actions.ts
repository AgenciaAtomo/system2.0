"use server";
import {createHash} from 'node:crypto';
import {z} from 'zod';
import {requireAccess} from '@/services/access';
import {normalizedDate,normalizedNumber} from '@/lib/tabular';
import {object,text} from '@/lib/operations';
import {revalidatePath} from 'next/cache';
import type {Json} from '@/types/database.types';
export type ImportResult={reference:string;status:'imported'|'duplicate'|'error';message:string};
export async function importBatch(kind:string,rows:Record<string,string>[],options:Record<string,string>):Promise<ImportResult[]>{
 const validKind=z.enum(['sales','inputs','purchases','receipts','statement']).parse(kind);const {client,organizationId}=await requireAccess(['inputs','purchases'].includes(validKind)?'operational.write':'financial.write');
 const input=z.array(z.record(z.string().max(50),z.string().max(2000))).max(200).parse(rows);z.record(z.string(),z.string().max(200)).parse(options);
 const id=(ref:string)=>{const hash=createHash('sha256').update(organizationId+'|import-v1|'+kind+'|'+(options.channel_id??'')+'|'+(options.account_id??'')+'|'+ref).digest('hex').slice(0,32);return hash.slice(0,8)+'-'+hash.slice(8,12)+'-4'+hash.slice(13,16)+'-a'+hash.slice(17,20)+'-'+hash.slice(20);};
 const grouped=new Map<string,Record<string,string>[]>();for(let i=0;i<input.length;i++){const row=input[i];const ref=validKind==='sales'?row.order:validKind==='inputs'?row.sku:row.reference;const key=ref||'__missing_'+i;grouped.set(key,[...(grouped.get(key)??[]),row]);}
 const results:ImportResult[]=[];
 for(const [reference,group] of grouped){try{
  if(reference.startsWith('__missing_'))throw new Error('Informe uma referência única para evitar duplicatas.');
  const normalized=group.map(r=>Object.fromEntries(Object.entries(r).map(([k,v])=>[k,k==='date'||k==='due_date'?normalizedDate(v):['price','unit_cost','quantity','fees','taxes','shipping','amount','minimum','discount','shipping_income','other','expected'].includes(k)?normalizedNumber(v):v.trim()])));const row=normalized[0];let error;let result:unknown;
  if(validKind==='sales'){
   const prior=await client.from('sales_orders').select('id').eq('organization_id',organizationId).eq('channel_id',options.channel_id).eq('external_id',reference).limit(1);if(prior.error)throw new Error('Não foi possível verificar duplicatas.');if(prior.data?.length){results.push({reference,status:'duplicate',message:'Pedido já registrado; não importado novamente.'});continue;}
   for(const other of normalized.slice(1))for(const key of ['date','fees','taxes','shipping','discount','shipping_income','other','expected','due_date'])if((other[key]??'')!==(row[key]??''))throw new Error('As informações totais do pedido devem ser iguais em todas as suas linhas: '+key);
   const payload:Record<string,Json>={...row,operation:'sale',external_id:reference,channel_id:options.channel_id,stock_mode:options.stock_mode||'stock',items:normalized.map(r=>({sku:r.sku,quantity:r.quantity,price:r.price,unit_cost:r.unit_cost||'0'}))};for(const k of ['discount','shipping_income','taxes','shipping','other'])payload[k]=row[k]||'0';
   const response=await client.rpc('operate',{org:organizationId,request_id:id(reference),payload});error=response.error;result=response.data;
  }else{
   if(group.length>1)throw new Error('Referência repetida no arquivo. Cada registro deve ter um identificador único.');
   const response=await client.rpc('import_row',{org:organizationId,request_id:id(reference),payload:{kind:validKind,row,...options,finance:{status:options.purchase_status||'none',account_id:options.account_id||'',category_id:options.category_id||'',due_date:row.date||''}}});error=response.error;result=response.data;
  }
  if(error)results.push({reference,status:error.code==='23505'?'duplicate':'error',message:error.code==='23505'?'Já cadastrado; não importado novamente.':error.code==='P0001'?error.message:'Campos inválidos, cadastro ausente ou acesso insuficiente.'});
  else results.push({reference,status:object(result).duplicate===true?'duplicate':'imported',message:object(result).duplicate===true?'Já importado.':'Importado.'});
 }catch(e){results.push({reference,status:'error',message:e instanceof Error?e.message:'Não foi possível importar.'});}}
 for(const p of ['/vendas','/recebiveis','/insumos','/estoque','/financeiro','/financeiro/lancamentos','/dashboard','/custos','/produtos','/relatorios','/analise'])revalidatePath(p);
 return results;
}

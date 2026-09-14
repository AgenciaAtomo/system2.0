import {z} from "zod";
import Decimal from "decimal.js";

export const entryDate=z.iso.date().refine(value=>value>="1900-01-01"&&value<="2199-12-31");
const optionalId=z.union([z.uuid(),z.literal("")]);
export const entryInput=z.object({
 request_id:z.uuid(),id:optionalId,version:z.coerce.number().int().min(1).max(999999999),
 operation:z.enum(["save","settle","cancel"]),
});
export const entryFields=z.object({
 description:z.string().trim().min(1).max(500),type:z.enum(["receita","despesa"]),
 status:z.enum(["pending","paid"]),amount:z.string().max(32),account_id:z.uuid(),category_id:z.uuid(),
 cost_center_id:optionalId,competence_date:entryDate,due_date:entryDate,
 paid_date:z.union([entryDate,z.literal("")]),notes:z.string().trim().max(2000),
 installments:z.coerce.number().int().min(1).max(120).default(1),
}).superRefine((value,context)=>{
 if(value.status==="paid"&&!value.paid_date)context.addIssue({code:"custom",message:"Informe a data do pagamento.",path:["paid_date"]});
 if(value.status==="pending"&&value.paid_date)context.addIssue({code:"custom",message:"Pendente não tem data de pagamento.",path:["paid_date"]});
 if(value.installments>1&&value.status!=="pending")context.addIssue({code:"custom",message:"Parcelas começam pendentes.",path:["status"]});
});
export const entryFilters=z.object({
 q:z.string().max(100).default(""),type:z.enum(["all","receita","despesa"]).default("all"),
 status:z.enum(["all","open","pending","overdue","partially_paid","paid","cancelled","legacy"]).default("all"),
 account_id:optionalId.default(""),basis:z.enum(["due","competence","paid"]).default("due"),
 from:z.union([entryDate,z.literal("")]).default(""),to:z.union([entryDate,z.literal("")]).default(""),
}).refine(value=>!value.from||!value.to||value.from<=value.to,{message:"A data inicial deve ser anterior à final."});
export const entryRow=z.object({
 id:z.uuid(),type:z.enum(["receita","despesa"]),description:z.string(),amount:z.string(),status:z.string(),
 display_status:z.enum(["pending","overdue","partially_paid","paid","cancelled","legacy"]),
 account_id:z.uuid(),account_name:z.string(),category_id:z.uuid().nullable(),category_name:z.string().nullable(),
 cost_center_id:z.uuid().nullable(),cost_center_name:z.string().nullable(),
 competence_date:z.string().nullable(),due_date:z.string().nullable(),paid_date:z.string().nullable(),legacy_date:z.string(),
 notes:z.string().nullable(),source_type:z.enum(["manual","legacy","sale_receipt","sale_refund","input_purchase","bank_statement"]),source_id:z.uuid().nullable(),version:z.number().int(),cancellation_reason:z.string().nullable(),
 paid_amount:z.string().nullable(),outstanding_amount:z.string().nullable(),
 installment_group:z.uuid().nullable(),installment_number:z.number().int().nullable(),installment_count:z.number().int().nullable(),
});
export const paymentsResult=z.object({total:z.number().int().nonnegative(),items:z.array(z.object({id:z.uuid(),amount:z.string(),paid_date:z.string(),notes:z.string().nullable(),origin:z.string(),account_name:z.string()}))});
export const entriesResult=z.object({items:z.array(entryRow),total:z.number().int().nonnegative(),page:z.number().int().positive()});
export type Entry=z.infer<typeof entryRow>;
export const statusLabels={pending:"Pendente",overdue:"Vencido",partially_paid:"Pago parcialmente",paid:"Pago / recebido",cancelled:"Cancelado",legacy:"Histórico anterior"};
export function saoPauloToday(now=new Date()){
 const parts=new Intl.DateTimeFormat("en-CA",{timeZone:"America/Sao_Paulo",year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(now);
 const part=(type:string)=>parts.find(p=>p.type===type)?.value;
 return `${part("year")}-${part("month")}-${part("day")}`;
}
export function displayDate(date:string|null){return date?date.split("-").reverse().join("/"):"Não informada";}

// Preview only: PostgreSQL independently computes and enforces the saved plan.
export function previewInstallments(total:string,count:number,firstDue:string){
 if(!Number.isInteger(count)||count<1||count>120||!entryDate.safeParse(firstDue).success||!/^\d{1,13}(\.\d{1,2})?$/.test(total))throw new Error("Informe valor, quantidade e primeiro vencimento válidos.");
 const cents=new Decimal(total).times(100);
 if(cents.lt(count))throw new Error("Cada parcela precisa ter pelo menos R$ 0,01.");
 const base=cents.div(count).floor(),remainder=cents.minus(base.times(count));
 const [year,month,day]=firstDue.split("-").map(Number);
 return Array.from({length:count},(_,index)=>{
  const date=new Date(Date.UTC(year,month-1+index,1));
  const lastDay=new Date(Date.UTC(date.getUTCFullYear(),date.getUTCMonth()+1,0)).getUTCDate();
  date.setUTCDate(Math.min(day,lastDay));
  const due=date.toISOString().slice(0,10);
  if(due>"2199-12-31")throw new Error("O último vencimento deve ser até 2199.");
  return {number:index+1,amount:base.plus(remainder.gt(index)?1:0).div(100).toFixed(2),due_date:due};
 });
}


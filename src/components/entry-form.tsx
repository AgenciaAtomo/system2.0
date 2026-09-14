"use client";
import {useActionState,useState} from "react";
import {saveEntry,reviseEntry} from "@/app/financeiro/entry-actions";
import {Button} from "@/components/ui/button";
import {previewInstallments,displayDate,type Entry} from "@/lib/entries";
import {parseMoney,formatMoney} from "@/lib/finance";

const input="mt-1.5 block min-h-11 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm";
export function DeleteEntry({record,requestId}:{record:Entry;requestId:string}){
 const [state,action,pending]=useActionState(reviseEntry,{message:""});
 return <form action={action} onSubmit={e=>{if(!window.confirm(`Excluir “${record.description}”? O lançamento e suas baixas sairão dos totais. O registro será preservado no histórico.`))e.preventDefault();}}>
  <input type="hidden" name="id" value={record.id}/><input type="hidden" name="version" value={record.version}/><input type="hidden" name="request_id" value={requestId}/><input type="hidden" name="operation" value="remove"/>
  <Button type="submit" size="sm" variant="outline" disabled={pending} className="text-red-700">{pending?"Excluindo…":"Excluir"}</Button>
  {state.message&&<p role="alert" className="mt-2 text-xs text-red-700">{state.message}</p>}
 </form>;
}
export function AmendEntry({record,requestId}:{record:Entry;requestId:string}){
 const [state,action,pending]=useActionState(reviseEntry,{message:""});
 return <form action={action} className="grid gap-4">
  <input type="hidden" name="id" value={record.id}/><input type="hidden" name="version" value={record.version}/><input type="hidden" name="request_id" value={requestId}/><input type="hidden" name="operation" value="amend"/>
  <p className="m-0 text-xs text-zinc-500">Você pode corrigir a descrição e as observações. Os valores do histórico e das baixas ficam preservados.</p>
  <label className="text-sm font-medium">Descrição<input name="description" required maxLength={500} defaultValue={record.description} className={input}/></label>
  <label className="text-sm font-medium">Observações<textarea name="notes" maxLength={2000} defaultValue={record.notes??""} rows={3} className={input}/></label>
  <Button disabled={pending}>{pending?"Salvando…":"Salvar alterações"}</Button>
  {state.message&&<p className="notice" role="alert">{state.message}</p>}
 </form>;
}
type Option={id:string;name:string};
type Props={requestId:string;today:string;record?:Entry;accounts:Option[];categories:(Option&{type:string})[];centers:Option[]};
export function EntryForm({requestId,today,record,accounts,categories,centers}:Props){
 const [state,action,pending]=useActionState(saveEntry,{message:""});
 const [type,setType]=useState(record?.type??"despesa");
 const [status,setStatus]=useState("pending");
 const [installments,setInstallments]=useState("1");
 const [amount,setAmount]=useState(record?.amount.replace(".",",")??"");
 const [due,setDue]=useState(record?.due_date??today);
 let preview:ReturnType<typeof previewInstallments>=[],previewError="";
 if(Number(installments)>1){try{preview=previewInstallments(parseMoney(amount),Number(installments),due);}catch(error){previewError=error instanceof Error?error.message:"Confira os valores do parcelamento.";}}
 return <form action={action} className="grid gap-4">
  <input type="hidden" name="request_id" value={requestId}/><input type="hidden" name="id" value={record?.id??""}/><input type="hidden" name="version" value={record?.version??1}/><input type="hidden" name="operation" value="save"/>
  <label className="text-sm font-medium">Tipo<select name="type" value={type} onChange={e=>setType(e.target.value as "receita"|"despesa")} className={input}><option value="despesa">Saída / despesa</option><option value="receita">Entrada / receita</option></select></label>
  <label className="text-sm font-medium">Descrição<input name="description" required maxLength={500} defaultValue={record?.description} className={input} placeholder="Ex.: conta de energia"/></label>
  <label className="text-sm font-medium">{Number(installments)>1?"Valor total (R$)":"Valor (R$)"}<input name="amount" inputMode="decimal" required maxLength={32} value={amount} onChange={e=>setAmount(e.target.value)} readOnly={!!record?.installment_group} className={input} placeholder="0,00"/></label>
  {record?.installment_group&&<p className="m-0 text-xs text-zinc-500">Parcela {record.installment_number} de {record.installment_count}. O valor fica preservado para manter o total do parcelamento.</p>}
  {!record?<details className="rounded-lg border border-zinc-200 px-3 py-2"><summary className="cursor-pointer text-sm text-zinc-600">Parcelar (opcional){Number(installments)>1?` · ${installments} parcelas`:""}</summary><label className="mt-3 block text-sm font-medium">Quantidade de parcelas<input type="number" name="installments" min={1} max={120} step={1} required value={installments} onChange={e=>{setInstallments(e.target.value);if(Number(e.target.value)>1)setStatus("pending");}} className={input}/></label><p className="mt-2 text-xs text-zinc-500">Use 1 para um lançamento único. As parcelas são mensais, sem juros.</p></details>:<input type="hidden" name="installments" value="1"/>}
  <label className="text-sm font-medium">Conta<select name="account_id" required defaultValue={record?.account_id??""} className={input}><option value="" disabled>Selecione a conta</option>{accounts.map(a=><option value={a.id} key={a.id}>{a.name}</option>)}</select></label>
  <label className="text-sm font-medium">Categoria<select key={type} name="category_id" required defaultValue={record?.type===type?record.category_id??"":""} className={input}><option value="" disabled>Selecione a categoria</option>{categories.filter(c=>c.type===type||c.type==="ambos").map(c=><option value={c.id} key={c.id}>{c.name}</option>)}</select></label>
  <label className="text-sm font-medium">Centro de custo<select name="cost_center_id" defaultValue={record?.cost_center_id??""} className={input}><option value="">Sem centro de custo</option>{centers.map(c=><option value={c.id} key={c.id}>{c.name}</option>)}</select></label>
  <div className="grid grid-cols-2 gap-3"><label className="text-sm font-medium">Competência<input name="competence_date" type="date" required min="1900-01-01" max="2199-12-31" defaultValue={record?.competence_date??today} className={input}/></label><label className="text-sm font-medium">{Number(installments)>1?"1º vencimento":"Vencimento"}<input name="due_date" type="date" required min="1900-01-01" max="2199-12-31" value={due} onChange={e=>setDue(e.target.value)} className={input}/></label></div>
  {Number(installments)>1&&<p className="m-0 text-xs text-zinc-500" role="status">{previewError||`${installments} parcelas mensais. Primeira: ${formatMoney(preview[0]?.amount??"0")} em ${displayDate(preview[0]?.due_date??null)}. Os centavos são distribuídos sem alterar o total.`}</p>}
  <p className="m-0 text-xs text-zinc-500">Competência é a data da receita ou despesa. Vencimento é o prazo para pagar ou receber.</p>
  {!record?<label className="text-sm font-medium">Situação<select name="status" value={status} onChange={e=>setStatus(e.target.value)} className={input}><option value="pending">Pendente</option><option value="paid" disabled={Number(installments)>1}>Já {type==="receita"?"recebido":"pago"}</option></select></label>:<input type="hidden" name="status" value="pending"/>}
  {status==="paid"?<><label className="text-sm font-medium">Data do {type==="receita"?"recebimento":"pagamento"}<input name="paid_date" type="date" min="1900-01-01" max={today} defaultValue={today} required className={input}/></label><p className="m-0 text-xs text-zinc-500">Confira os dados: lançamentos liquidados ficam preservados e não podem ser editados.</p></>:<input type="hidden" name="paid_date" value=""/>}
  <label className="text-sm font-medium">Observações<textarea name="notes" maxLength={2000} defaultValue={record?.notes??""} className={input} rows={3}/></label>
  <Button disabled={pending||!accounts.length||!categories.some(c=>c.type===type||c.type==="ambos")} type="submit">{pending?"Salvando…":record?"Salvar alterações":"Registrar lançamento"}</Button>
  {state.message&&<p className="notice" role="alert">{state.message}</p>}
 </form>;
}
export function EntryOperation({record,requestId,today,operation}:{record:Entry;requestId:string;today:string;operation:"settle"|"cancel"}){
 const [state,action,pending]=useActionState(saveEntry,{message:""});
 return <form action={action} className="grid gap-3" onSubmit={event=>{if(!window.confirm(operation==="settle"?"Confirmar a baixa com o valor e a data informados?":"Cancelar este lançamento? O histórico será preservado."))event.preventDefault();}}>
  <input type="hidden" name="request_id" value={requestId}/><input type="hidden" name="id" value={record.id}/><input type="hidden" name="version" value={record.version}/><input type="hidden" name="operation" value={operation}/>
  {operation==="settle"?<><p className="m-0 text-sm">Em aberto: <strong>{formatMoney(record.outstanding_amount??"0")}</strong></p><label className="text-sm font-medium">Valor {record.type==="receita"?"recebido":"pago"} agora (R$)<input name="settlement_amount" inputMode="decimal" required maxLength={32} defaultValue={record.outstanding_amount?.replace(".",",")} className={input}/></label><p className="m-0 text-xs text-zinc-500">Informe uma parte do saldo ou o total restante. Cada baixa fica registrada separadamente.</p><label className="text-sm font-medium">Data do {record.type==="receita"?"recebimento":"pagamento"}<input type="date" name="paid_date" required min="1900-01-01" max={today} defaultValue={today} className={input}/></label><label className="text-sm font-medium">Observações da baixa<textarea name="payment_notes" maxLength={2000} className={input} rows={2}/></label></>:<label className="text-sm font-medium">Motivo do cancelamento<textarea name="reason" required minLength={3} maxLength={500} className={input}/></label>}
  <Button disabled={pending} variant={operation==="cancel"?"outline":"default"}>{pending?"Salvando…":operation==="cancel"?"Confirmar cancelamento":"Confirmar baixa"}</Button>
  {state.message&&<p className="notice" role="alert">{state.message}</p>}
 </form>;
}

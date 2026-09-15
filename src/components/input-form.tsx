"use client";
import {useActionState} from "react";
import {saveInput} from "@/app/insumos/actions";
import {Button} from "@/components/ui/button";
import {compatibleUnits,inputUnits,type InputRecord,displayQuantity} from "@/lib/inputs";
const field="mt-1.5 block min-h-11 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm";
export function InputForm({record,operation,requestId,today,accounts=[],categories=[]}:{record?:InputRecord;operation:"save"|"purchase"|"adjust";requestId:string;today:string;accounts?:{id:string;nome:string}[];categories?:{id:string;nome:string}[]}){
 const [state,action,pending]=useActionState(saveInput,{message:""});
 return <form action={action} className="grid gap-4">
  <input type="hidden" name="request_id" value={requestId}/><input type="hidden" name="id" value={record?.id??""}/><input type="hidden" name="version" value={record?.version??1}/><input type="hidden" name="operation" value={operation}/>
  {operation==="save"?<>
   <label className="text-sm font-medium">Nome do insumo<input className={field} name="name" required maxLength={200} defaultValue={record?.name} placeholder="Ex.: PETG Preto"/></label>
   <label className="text-sm font-medium">Código interno (SKU)<input className={field} name="sku" required maxLength={64} pattern="[A-Za-z0-9._\-]+" defaultValue={record?.sku} placeholder="PETG-PRETO"/></label>
   <label className="text-sm font-medium">Categoria<input className={field} name="category" maxLength={100} defaultValue={record?.category} placeholder="Ex.: Filamentos"/></label>
   <label className="text-sm font-medium">Unidade do estoque{record?<><input type="hidden" name="base_unit" value={record.base_unit}/><input className={field} readOnly value={record.base_unit}/></>:<select className={field} name="base_unit" defaultValue="g">{inputUnits.map(u=><option key={u}>{u}</option>)}</select>}</label>
   <p className="m-0 text-xs text-zinc-500">A unidade fica fixa após o cadastro. Você pode comprar em unidades compatíveis, como kg para um estoque em g.</p>
   <label className="text-sm font-medium">Estoque mínimo<input className={field} name="minimum_stock" inputMode="decimal" required maxLength={20} defaultValue={record?.minimum_stock.replace(".",",")??"0"}/></label>
   <label className="text-sm font-medium">Fornecedor padrão<input className={field} name="default_supplier" maxLength={200} defaultValue={record?.default_supplier}/></label>
   <label className="flex gap-2 text-sm"><input type="checkbox" name="active" defaultChecked={record?.active??true}/>Insumo ativo</label>
  </>:record?<>
   <p className="m-0 text-sm">Estoque atual: <strong>{displayQuantity(record.stock_quantity)} {record.base_unit}</strong></p>
   <label className="text-sm font-medium">Data<input className={field} type="date" name="date" required min={record.last_movement_date??"1900-01-01"} max={today} defaultValue={today}/></label>
   {operation==="purchase"?<>
    <label className="text-sm font-medium">Fornecedor<input className={field} name="supplier" required maxLength={200} defaultValue={record.default_supplier}/></label>
    <div className="grid grid-cols-2 gap-3"><label className="text-sm font-medium">Quantidade<input className={field} name="quantity" inputMode="decimal" maxLength={20} required placeholder="1"/></label><label className="text-sm font-medium">Unidade da compra<select className={field} name="purchase_unit" defaultValue={record.base_unit}>{compatibleUnits(record.base_unit).map(u=><option key={u}>{u}</option>)}</select></label></div>
    <label className="text-sm font-medium">Valor total dos materiais (R$)<input className={field} name="total_price" inputMode="decimal" maxLength={32} required placeholder="75,00"/></label>
    <details className="rounded-lg border border-zinc-200 p-3"><summary className="cursor-pointer text-sm">Frete e outros custos (opcional)</summary>{[["freight","Frete"],["taxes","Impostos"],["other_costs","Outros custos"]].map(([key,label])=><label key={key} className="mt-3 block text-sm font-medium">{label} (R$)<input className={field} name={key} inputMode="decimal" maxLength={32} defaultValue="0,00"/></label>)}</details>
        <details className="rounded-lg border border-zinc-200 p-3"><summary className="cursor-pointer text-sm">Pagamento / conta a pagar</summary><label className="mt-3 block text-sm">Registro financeiro<select className={field} name="finance_status" defaultValue="none"><option value="none">Somente estoque</option><option value="pending">Gerar conta a pagar</option><option value="paid">Compra já paga</option></select></label><label className="mt-3 block text-sm">Conta<select className={field} name="account_id"><option value="">Selecione</option>{accounts.map(a=><option key={a.id} value={a.id}>{a.nome}</option>)}</select></label><label className="mt-3 block text-sm">Categoria<select className={field} name="category_id"><option value="">Selecione</option>{categories.map(c=><option key={c.id} value={c.id}>{c.nome}</option>)}</select></label><label className="mt-3 block text-sm">Vencimento<input className={field} type="date" name="due_date" defaultValue={today}/></label></details><p className="m-0 text-xs text-zinc-500">A compra atualiza estoque, custo dos produtos e, quando selecionado, o financeiro na mesma operação.</p>
   </>:<>
    <label className="text-sm font-medium">Quantidade total contada ({record.base_unit})<input className={field} name="counted_quantity" inputMode="decimal" required maxLength={20} placeholder="Estoque correto após a contagem"/></label>
    <label className="text-sm font-medium">Custo por {record.base_unit} adicionado (R$)<input className={field} name="unit_cost" inputMode="decimal" required maxLength={22} defaultValue={record.average_cost?.replace(".",",")??"0"}/></label>
    <p className="m-0 text-xs text-zinc-500">O custo informado vale para aumentos de estoque. Reduções usam o custo médio atual. Informe números sem separador de milhar, com até 6 casas decimais.</p>
    <label className="text-sm font-medium">Motivo<textarea className={field} name="reason" required minLength={3} maxLength={500} rows={3} placeholder="Ex.: diferença na contagem ou perda de material"/></label>
   </>}
  </>:null}
  <Button disabled={pending}>{pending?"Salvando…":operation==="purchase"?"Registrar compra":operation==="adjust"?"Salvar ajuste":record?"Salvar alterações":"Cadastrar insumo"}</Button>
  {state.message&&<p className="notice" role="alert">{state.message}</p>}
 </form>;
}


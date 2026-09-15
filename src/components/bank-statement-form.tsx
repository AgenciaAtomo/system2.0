"use client";
import {useActionState} from "react";
import {Ban,Check,Upload} from "lucide-react";
import {uploadBankStatement,resolveBankStatementDraft} from "@/app/financeiro/extrato-actions";
import {Button} from "@/components/ui/button";
import {formatMoney} from "@/lib/finance";
import {displayDate} from "@/lib/entries";

const input="mt-1.5 block min-h-11 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm";
type Option={id:string;name:string;type?:string};
type Draft={id:string;transaction_date:string;description:string;amount:string;type:"receita"|"despesa";is_recurring:boolean;import_name:string};

export function BankStatementUpload({accounts}:{accounts:Option[]}){
 const [state,action,pending]=useActionState(uploadBankStatement,{message:""});
 return <form action={action} className="grid gap-4">
  <input type="hidden" name="request_id" value={crypto.randomUUID()}/>
  <label className="text-sm font-medium">Conta do extrato<select name="account_id" required className={input} defaultValue=""><option value="" disabled>Selecione a conta</option>{accounts.map(account=><option key={account.id} value={account.id}>{account.name}</option>)}</select></label>
  <label className="text-sm font-medium">Arquivo do banco<input name="file" type="file" required accept=".csv,.txt,.ofx,text/csv,application/x-ofx" className={input}/></label>
  <Button disabled={pending||!accounts.length} type="submit"><Upload size={16}/>{pending?"Lendo extrato...":"Enviar extrato"}</Button>
  <p className="m-0 text-xs text-zinc-500">Aceita CSV, TXT e OFX. Linhas já conhecidas entram automaticamente; linhas novas ficam abaixo para categorizar.</p>
  {state.message&&<p className="notice" role="alert">{state.message}</p>}
 </form>;
}
export function BankStatementDrafts({drafts,categories,canWrite}:{drafts:Draft[];categories:Option[];canWrite:boolean}){
 if(!drafts.length)return <p className="py-10 text-center text-zinc-500">Nenhum lançamento novo aguardando categoria.</p>;
 return <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="border-b border-zinc-200 text-zinc-500"><tr><th className="pb-3 font-medium">Lançamento</th><th className="pb-3 font-medium">Valor</th><th className="pb-3 font-medium">Categoria</th></tr></thead><tbody className="divide-y divide-zinc-100">{drafts.map(draft=><tr key={draft.id}>
  <td className="py-4 pr-4"><strong className="block max-w-xl break-words font-medium">{draft.description}</strong><span className="mt-1 block text-xs text-zinc-500">{displayDate(draft.transaction_date)} · {draft.import_name}</span>{draft.is_recurring&&<span className="mt-1 inline-block rounded bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700">Recorrente</span>}</td>
  <td className="py-4 pr-4 whitespace-nowrap"><span className={draft.type==="receita"?"text-emerald-700":"text-zinc-900"}>{draft.type==="receita"?"+":"-"} {formatMoney(draft.amount)}</span><span className="block text-xs text-zinc-500">{draft.type==="receita"?"Entrada":"Saída"}</span></td>
  <td className="min-w-72 py-4">{canWrite?<ResolveDraft draft={draft} categories={categories.filter(category=>category.type===draft.type||category.type==="ambos")}/>:<span className="text-zinc-500">Seu perfil permite consultar.</span>}</td>
 </tr>)}</tbody></table></div>;
}
function ResolveDraft({draft,categories}:{draft:Draft;categories:Option[]}){
 const [state,action,pending]=useActionState(resolveBankStatementDraft,{message:""});
 return <div className="grid gap-2"><form action={action} className="flex flex-wrap items-end gap-2">
  <input type="hidden" name="request_id" value={crypto.randomUUID()}/><input type="hidden" name="draft_id" value={draft.id}/><input type="hidden" name="operation" value="categorize"/>
  <label className="min-w-48 flex-1 text-xs font-medium">Categoria<select name="category_id" required className={input} defaultValue=""><option value="" disabled>Selecionar</option>{categories.map(category=><option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
  <Button size="sm" disabled={pending||!categories.length} type="submit"><Check size={15}/>Registrar</Button>
 </form><form action={action}>
  <input type="hidden" name="request_id" value={crypto.randomUUID()}/><input type="hidden" name="draft_id" value={draft.id}/><input type="hidden" name="operation" value="ignore"/><input type="hidden" name="category_id" value=""/>
  <Button size="sm" variant="outline" disabled={pending} type="submit"><Ban size={15}/>Ignorar</Button>
 </form>{state.message&&<p className="notice" role="alert">{state.message}</p>}</div>;
}

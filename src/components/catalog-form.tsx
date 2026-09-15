"use client";
import {useActionState} from "react";
import {saveCatalog} from "@/app/financeiro/actions";
import {Button} from "@/components/ui/button";
import type {CatalogKind,CatalogRow} from "@/lib/finance";
import {Trash2} from "lucide-react";
type Props={kind:CatalogKind;requestId:string;record?:CatalogRow;parents:{id:string;nome:string}[]};
const style="mt-2 block h-11 w-full rounded-lg border border-zinc-300 bg-white px-3 text-sm";
export function CatalogForm({kind,requestId,record,parents}:Props){
 const [state,action,pending]=useActionState(saveCatalog,{message:""});
 return <form action={action} className="grid gap-4">
 <input type="hidden" name="kind" value={kind}/><input type="hidden" name="request_id" value={requestId}/><input type="hidden" name="id" value={record?.id??""}/><input type="hidden" name="operation" value="save"/>
 <label className="text-sm font-medium">Nome<input name="name" required maxLength={100} defaultValue={record?.name} className={style} disabled={pending}/></label>
 {kind==="account"&&<><label className="text-sm font-medium">Tipo<select name="type" className={style} defaultValue={record?.type??"bancaria"} disabled={pending}><option value="bancaria">Conta bancária</option><option value="carteira">Carteira</option><option value="caixa">Caixa</option><option value="marketplace">Marketplace</option><option value="digital">Conta digital</option></select></label>{!record&&<><label className="text-sm font-medium">Saldo inicial (R$)<input name="opening_balance" inputMode="decimal" defaultValue="0,00" required className={style} disabled={pending}/></label><p className="m-0 text-xs text-zinc-500">O saldo inicial é informado uma única vez. Moeda: real brasileiro.</p></>}</>}
 {kind==="category"&&<><label className="text-sm font-medium">Tipo<select name="type" defaultValue={record?.type??"despesa"} className={style}><option value="receita">Receita</option><option value="despesa">Despesa</option><option value="ambos">Receita e despesa</option></select></label><label className="text-sm font-medium">Categoria superior<select name="parent_id" defaultValue={record?.parent_id??""} className={style}><option value="">Sem categoria superior</option>{parents.filter(p=>p.id!==record?.id).map(p=><option key={p.id} value={p.id}>{p.nome}</option>)}</select></label></>}
 <Button disabled={pending} type="submit">{pending?"Salvando…":record?"Salvar alterações":"Cadastrar"}</Button>
 {state.message&&<p className="notice" role="alert">{state.message}</p>}
 </form>;
}
export function ArchiveCatalog({kind,record,requestId}:{kind:CatalogKind;record:CatalogRow;requestId:string}){
 const [state,action,pending]=useActionState(saveCatalog,{message:""});
 const isAccount=kind==="account";
 return <form action={action} onSubmit={event=>{const message=isAccount?`Excluir ${record.name}? Os lançamentos, baixas e extratos ligados a esta conta também serão apagados.`:`Arquivar ${record.name}? O histórico será preservado.`;if(!window.confirm(message))event.preventDefault();}}>
 <input type="hidden" name="kind" value={kind}/><input type="hidden" name="request_id" value={requestId}/><input type="hidden" name="id" value={record.id}/><input type="hidden" name="operation" value="archive"/>
 <Button variant="outline" size="sm" disabled={pending} type="submit"><Trash2 size={14} aria-hidden="true"/>{isAccount?"Excluir":"Arquivar"}</Button>{state.message&&<p role="alert" className="mt-2 text-sm text-red-700">{state.message}</p>}
 </form>;
}

import Link from "next/link";
import {z} from "zod";
import {requireAccess} from "@/services/access";
import {inputsResult,inputHistory,displayQuantity,displayUnitCost} from "@/lib/inputs";
import {saoPauloToday,displayDate} from "@/lib/entries";
import {formatMoney} from "@/lib/finance";
import {InputForm} from "@/components/input-form";
import {Button} from "@/components/ui/button";
export const dynamic="force-dynamic";
export default async function Inputs({searchParams}:{searchParams:Promise<Record<string,string|undefined>>}){
 const params=await searchParams;const q=(params.q??"").slice(0,100);
 const page=Math.min(100000,Math.max(1,parseInt(params.page??"1",10)||1));const historyPage=Math.min(100000,Math.max(1,parseInt(params.history_page??"1",10)||1));
 const {client,user,organizationId}=await requireAccess("operational.read");
 const [list,roles]=await Promise.all([client.rpc("get_inputs",{org:organizationId,search:q,page}),client.from("user_roles").select("role_id").eq("organization_id",organizationId).eq("user_id",user.id)]);
 if(list.error||roles.error)throw new Error("Não foi possível carregar os insumos.");
 const {data:grants,error:grantError}=await client.from("role_permissions").select("permission_id").in("role_id",(roles.data??[]).map(r=>r.role_id)).eq("permission_id","operational.write").limit(1);
 if(grantError)throw new Error("Não foi possível verificar seu acesso.");
 const canWrite=!!grants?.length;const result=inputsResult.parse(list.data);let selected=result.items.find(r=>r.id===params.input);
 if(!selected&&z.uuid().safeParse(params.input).success){
  const {data,error}=await client.from("inputs").select("sku").eq("organization_id",organizationId).eq("id",params.input!).maybeSingle();
  if(error)throw new Error("Não foi possível consultar o insumo.");
  if(data){const exact=await client.rpc("get_inputs",{org:organizationId,search:data.sku,page:1});if(exact.error)throw new Error("Não foi possível consultar o insumo.");selected=inputsResult.parse(exact.data).items.find(row=>row.id===params.input);}
 }
 let history=inputHistory.parse({total:0,items:[]});
 if(selected){const {data,error}=await client.rpc("get_input_history",{org:organizationId,input:selected.id,page:historyPage});if(error)throw new Error("Não foi possível carregar o histórico.");history=inputHistory.parse(data);}
  const [accounts,categories]=await Promise.all([client.from('contas_bancarias').select('id,nome').eq('empresa_id',organizationId).eq('ativa',true).is('deletada_em',null).eq('moeda','BRL'),client.from('categorias').select('id,nome').eq('empresa_id',organizationId).in('tipo',['despesa','ambos']).is('deletada_em',null)]);
 const operation=selected&&["purchase","adjust"].includes(params.action??"")?params.action as "purchase"|"adjust":"save";
 const href=(extra:Record<string,string>={})=>"/insumos?"+new URLSearchParams({q,page:String(page),...extra});
 const success:Record<string,string>={save:"Insumo salvo.",purchase:"Compra registrada. Estoque e custo médio atualizados.",adjust:"Ajuste registrado. Estoque atualizado."};
 return <main className="content finance-content">
  <p className="eyebrow">INSUMOS</p><h1>Materiais e estoque</h1><p className="text-zinc-500">Cadastre seus materiais, registre compras e acompanhe o custo por unidade.</p>
  {params.saved&&success[params.saved]&&<p className="notice" role="status">{success[params.saved]}</p>}
  {params.input&&!selected&&<p className="notice" role="alert">Insumo não encontrado.</p>}
  <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
   <section className="min-w-0 rounded-xl border border-zinc-200 bg-white p-5 sm:p-6">
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3"><div><h2 className="mb-1">Seus insumos</h2><span className="text-sm text-zinc-500">{result.total} cadastrados</span></div>{canWrite&&<Button asChild variant="outline"><Link href={href()+"#input-form"}>Novo insumo</Link></Button>}</div>
    <form className="mb-6 flex flex-wrap items-end gap-3"><label className="grow text-sm">Buscar por nome ou código<input name="q" defaultValue={q} maxLength={100} placeholder="Ex.: PETG" className="mt-1 block min-h-11 w-full rounded-lg border border-zinc-300 px-3 py-2"/></label><Button>Buscar</Button><Link className="pb-3 text-sm underline" href="/insumos">Limpar</Link></form>
    {!result.items.length?<p className="py-12 text-center text-zinc-500">Nenhum insumo encontrado. Cadastre seu primeiro material ao lado.</p>:<div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="border-b border-zinc-200 text-zinc-500"><tr><th className="pb-3 font-medium">Material</th><th className="pb-3 font-medium">Estoque</th><th className="pb-3 font-medium">Custo médio</th><th className="pb-3 font-medium">Ações</th></tr></thead><tbody className="divide-y divide-zinc-100">{result.items.map(row=><tr key={row.id}>
     <td className="py-4 pr-4"><strong className="block max-w-60 break-words font-medium">{row.name}</strong><span className="block text-xs text-zinc-500">{row.sku}{row.category&&" · "+row.category}</span>{!row.active&&<span className="text-xs text-zinc-500">Inativo</span>}</td>
     <td className="py-4 pr-4 whitespace-nowrap">{displayQuantity(row.stock_quantity)} {row.base_unit}<span className="block text-xs text-zinc-500">Mín.: {displayQuantity(row.minimum_stock)}</span>{row.active&&row.low_stock&&<span className="block text-xs font-medium text-amber-700">Abaixo do mínimo</span>}</td>
     <td className="py-4 pr-4 whitespace-nowrap">{displayUnitCost(row.average_cost)}<span className="block text-xs text-zinc-500">por {row.base_unit}</span></td>
     <td className="py-4"><div className="flex flex-wrap gap-3"><Link className="underline" href={href({input:row.id})+"#input-form"}>{canWrite?"Editar":"Consultar"}</Link>{canWrite&&row.active&&<Link className="underline" href={href({input:row.id,action:"purchase"})+"#input-form"}>Comprar</Link>}</div></td>
    </tr>)}</tbody></table></div>}
    <div className="mt-6 flex justify-between gap-3 text-sm"><span>Página {page} · 25 por página</span><div className="flex gap-4">{page>1&&<Link href={href({page:String(page-1)})}>Anterior</Link>}{page*25<result.total&&<Link href={href({page:String(page+1)})}>Próxima</Link>}</div></div>
   </section>
   <aside id="input-form" className="h-fit scroll-mt-6 rounded-xl border border-zinc-200 bg-white p-5 sm:p-6">
    <h2>{selected?operation==="purchase"?"Registrar compra":operation==="adjust"?"Ajustar estoque":canWrite?"Editar insumo":"Consultar insumo":"Novo insumo"}</h2>
    {selected&&<><p className="break-words text-sm font-medium">{selected.name} · {selected.sku}</p><p className="text-xs text-zinc-500">Custo médio: {displayUnitCost(selected.average_cost)}/{selected.base_unit}<br/>Última compra: {displayUnitCost(selected.last_cost)}/{selected.base_unit}</p><nav className="mb-5 flex flex-wrap gap-3 text-sm">{canWrite&&<><Link className="underline" href={href({input:selected.id})+"#input-form"}>Cadastro</Link>{selected.active&&<><Link className="underline" href={href({input:selected.id,action:"purchase"})+"#input-form"}>Compra</Link><Link className="underline" href={href({input:selected.id,action:"adjust"})+"#input-form"}>Ajustar estoque</Link></>}</>}<Link className="underline" href={href()}>Fechar</Link></nav></>}
    {canWrite&&(!selected||selected.active||operation==="save")?<InputForm key={(selected?.id??"new")+operation+(selected?.version??0)} record={selected} operation={operation} requestId={crypto.randomUUID()} today={saoPauloToday()} accounts={accounts.data??[]} categories={categories.data??[]}/>:<p className="text-sm text-zinc-500">{selected&&!selected.active?"Reative o insumo no cadastro para movimentar o estoque.":"Seu perfil permite consultar os insumos."}</p>}
    {selected&&<section className="mt-6 border-t border-zinc-200 pt-5"><h3>Histórico ({history.total})</h3>{!history.items.length?<p className="text-sm text-zinc-500">Nenhuma compra ou ajuste registrado.</p>:<ul className="space-y-3">{history.items.map(item=><li key={item.id} className="rounded-lg bg-zinc-50 p-3 text-sm"><strong>{item.type==="purchase"?"Compra":item.type==="production_consumption"?"Consumo na produção":item.type==="return"?"Devolução":"Ajuste"}</strong> · {displayDate(item.movement_date)}<p className="mt-1 mb-1">{displayQuantity(item.quantity)} {selected.base_unit} · Estoque: {displayQuantity(item.stock_after)}</p>{item.supplier&&<p className="mb-1 break-words text-xs">{item.supplier} · {displayQuantity(item.purchased_quantity)} {item.purchase_unit} · {formatMoney(item.final_cost??"0")}<br/>Custo da compra: {displayUnitCost(item.unit_cost)}/{selected.base_unit}</p>}<p className="m-0 break-words text-xs text-zinc-500">{item.reason}<br/>Média após movimento: {displayUnitCost(item.average_cost_after)}/{selected.base_unit}</p></li>)}</ul>}<div className="mt-4 flex gap-4 text-xs">{historyPage>1&&<Link className="underline" href={href({input:selected.id,action:operation,history_page:String(historyPage-1)})+"#input-form"}>Mais recentes</Link>}{historyPage*25<history.total&&<Link className="underline" href={href({input:selected.id,action:operation,history_page:String(historyPage+1)})+"#input-form"}>Mais antigos</Link>}</div></section>}
   </aside>
  </div>
 </main>;
}


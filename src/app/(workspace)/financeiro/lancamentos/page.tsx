import Link from "next/link";
import {requireAccess} from "@/services/access";
import {entriesResult,paymentsResult,entryFilters,displayDate,saoPauloToday,statusLabels} from "@/lib/entries";
import {formatMoney} from "@/lib/finance";
import {EntryForm,EntryOperation,DeleteEntry,AmendEntry} from "@/components/entry-form";
import {FinanceNav} from "@/components/finance-nav";
import {Button} from "@/components/ui/button";

export const dynamic="force-dynamic";
const input="mt-1 block min-h-10 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm";
export default async function Entries({searchParams}:{searchParams:Promise<Record<string,string|undefined>>}){
 const params=await searchParams;
 const parsed=entryFilters.safeParse(params);
 const filters=parsed.success?parsed.data:entryFilters.parse({});
 const page=Math.min(100000,Math.max(1,Number.parseInt(params.page??"1",10)||1));
 const {client,user,organizationId}=await requireAccess("financial.read");
 const [list,accounts,categories,centers,roles]=await Promise.all([
  client.rpc("get_financial_entries",{org:organizationId,filters,page}),
  client.from("contas_bancarias").select("id,nome,ativa,deletada_em,moeda").eq("empresa_id",organizationId).order("nome").limit(201),
  client.from("categorias").select("id,nome,tipo").eq("empresa_id",organizationId).is("deletada_em",null).order("nome").limit(201),
  client.from("cost_centers").select("id,name").eq("organization_id",organizationId).eq("active",true).order("name").limit(201),
  client.from("user_roles").select("role_id").eq("organization_id",organizationId).eq("user_id",user.id),
 ]);
 if(list.error||accounts.error||categories.error||centers.error||roles.error)throw new Error("Não foi possível carregar os lançamentos.");
 const {data:grants,error:grantError}=await client.from("role_permissions").select("permission_id").in("role_id",roles.data.map(r=>r.role_id)).eq("permission_id","financial.write").limit(1);
 if(grantError)throw new Error("Não foi possível verificar seu acesso.");
 const canWrite=!!grants?.length;
 const result=entriesResult.parse(list.data);
 const selected=result.items.find(row=>row.id===params.entry);
 const operation=params.action==="settle"||params.action==="cancel"?params.action:"edit";
 const paymentPage=Math.min(100000,Math.max(1,Number.parseInt(params.payment_page??"1",10)||1));
 let payments:ReturnType<typeof paymentsResult.parse>={items:[],total:0};
 if(selected&&selected.source_type!=="legacy"){
  const history=await client.rpc("get_financial_payments",{org:organizationId,entry:selected.id,page:paymentPage});
  if(history.error)throw new Error("Não foi possível carregar o histórico de pagamentos.");
  payments=paymentsResult.parse(history.data);
 }
 const payable=selected&&["manual","input_purchase"].includes(selected.source_type)&&["pending","partially_paid"].includes(selected.status);
 const editable=selected?.source_type==="manual"&&selected.status==="pending";
 const today=saoPauloToday();
 const href=(p=page,extra:Record<string,string>={})=>"/financeiro/lancamentos?"+new URLSearchParams({...filters,page:String(p),...extra});
 const activeAccounts=accounts.data.filter(a=>a.ativa&&!a.deletada_em&&a.moeda==="BRL").map(a=>({id:a.id,name:a.nome}));
 const activeCategories=categories.data.map(c=>({id:c.id,name:c.nome,type:c.tipo}));
 const limited=[accounts.data,categories.data,centers.data].some(rows=>rows.length>200);
 const success:Record<string,string>={save:"Lançamento salvo.",settle:"Baixa registrada. O valor em aberto foi atualizado.",cancel:"Lançamento cancelado. O histórico foi preservado.",remove:"Lançamento excluído da lista e dos totais. O histórico foi preservado.",amend:"Lançamento atualizado."};
 return <main className="content finance-content">
  <p className="eyebrow">FINANCEIRO</p><h1>{filters.status==="open"&&filters.type==="despesa"?"Contas a pagar":filters.status==="open"&&filters.type==="receita"?"Contas a receber":"Entradas e saídas, em ordem"}</h1>
  <p className="text-zinc-500">Registre receitas e despesas e acompanhe o que falta pagar ou receber.</p>
  <FinanceNav active="entries"/>
  <nav aria-label="Visões dos lançamentos" className="mb-5 flex flex-wrap gap-3 text-sm"><Link className="underline" href="/financeiro/lancamentos">Todos</Link><Link className="underline" href="/financeiro/lancamentos?type=despesa&status=open">Contas a pagar</Link><Link className="underline" href="/financeiro/lancamentos?type=receita&status=open">Contas a receber</Link></nav>
  {params.saved&&success[params.saved]&&<p className="notice" role="status">{success[params.saved]} A operação está no histórico de auditoria.</p>}
  {!parsed.success&&<p className="notice" role="alert">Os filtros informados são inválidos. Exibindo todos os lançamentos; confira o período e tente novamente.</p>}
  {limited&&<p className="notice">Os seletores mostram até 201 cadastros em ordem alfabética. Cadastros fora desse limite ainda não estão disponíveis neste formulário.</p>}
  <div className="grid gap-6 2xl:grid-cols-[minmax(0,1fr)_360px]">
   <section className="min-w-0 rounded-xl border border-zinc-200 bg-white p-5 sm:p-6">
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3"><div><h2 className="mb-1">Lançamentos</h2><span className="text-sm text-zinc-500">{result.total} registros · mais recentes primeiro</span></div>{canWrite&&<Button asChild variant="outline"><Link href={href(page)+"#entry-form"}>Novo lançamento</Link></Button>}</div>
    <form className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-3">
     <label className="col-span-2 text-xs font-medium lg:col-span-1">Buscar descrição<input name="q" defaultValue={filters.q} maxLength={100} placeholder="Buscar lançamento" className={input}/></label>
     <label className="text-xs font-medium">Tipo<select name="type" defaultValue={filters.type} className={input}><option value="all">Entradas e saídas</option><option value="receita">Entradas</option><option value="despesa">Saídas</option></select></label>
     <label className="text-xs font-medium">Situação<select name="status" defaultValue={filters.status} className={input}><option value="all">Todas</option><option value="open">Em aberto</option>{Object.entries(statusLabels).map(([value,label])=><option value={value} key={value}>{label}</option>)}</select></label>
     <label className="text-xs font-medium">Conta<select name="account_id" defaultValue={filters.account_id} className={input}><option value="">Todas as contas</option>{accounts.data.map(a=><option key={a.id} value={a.id}>{a.nome}{!a.ativa||a.deletada_em?" (arquivada)":""}</option>)}</select></label>
     <label className="text-xs font-medium">Filtrar período por<select name="basis" defaultValue={filters.basis} className={input}><option value="due">Vencimento</option><option value="competence">Competência</option><option value="paid">Pagamento / recebimento</option></select></label>
     <div className="flex items-end gap-3"><Button type="submit">Filtrar</Button><Link href="/financeiro/lancamentos" className="pb-2 text-sm underline">Limpar</Link></div>
     <label className="text-xs font-medium">De<input type="date" name="from" min="1900-01-01" max="2199-12-31" defaultValue={filters.from} className={input}/></label>
     <label className="text-xs font-medium">Até<input type="date" name="to" min="1900-01-01" max="2199-12-31" defaultValue={filters.to} className={input}/></label>
    </form>
    {!result.items.length?<p className="py-12 text-center text-zinc-500">Nenhum lançamento encontrado. Ajuste os filtros ou registre uma entrada ou saída.</p>:<div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="border-b border-zinc-200 text-zinc-500"><tr><th className="pb-3 font-medium">Descrição / conta</th><th className="pb-3 font-medium">Valor</th><th className="pb-3 font-medium">Vencimento / situação</th><th className="pb-3 font-medium">Ações</th></tr></thead><tbody className="divide-y divide-zinc-100">{result.items.map(row=><tr key={row.id}>
     <td className="py-4 pr-4"><strong className="block max-w-72 break-words font-medium">{row.description}</strong><span className="mt-1 block text-xs text-zinc-500">{row.account_name} · {row.category_name??"Sem categoria"}</span>{row.installment_number&&<span className="block text-xs font-medium text-zinc-600">Parcela {row.installment_number}/{row.installment_count}</span>}{row.cost_center_name&&<span className="block text-xs text-zinc-500">{row.cost_center_name}</span>}</td>
     <td className="py-4 pr-4 whitespace-nowrap"><span className={row.type==="receita"?"text-emerald-700":"text-zinc-900"}>{row.type==="receita"?"+":"−"} {formatMoney(row.amount)}</span><span className="block text-xs text-zinc-500">{row.type==="receita"?"Entrada":"Saída"}</span>{row.paid_amount!==null&&<span className="mt-1 block text-xs text-zinc-500">Baixado: {formatMoney(row.paid_amount)}<br/>Em aberto: {formatMoney(row.outstanding_amount??"0")}</span>}</td>
     <td className="py-4 pr-4"><span className="whitespace-nowrap">{displayDate(row.due_date)}</span><span className={"mt-1 block text-xs "+(row.display_status==="overdue"?"font-medium text-red-700":"text-zinc-500")}>{row.display_status==="paid"?(row.type==="receita"?"Recebido":"Pago"):statusLabels[row.display_status]}</span>{row.status==="partially_paid"&&row.display_status==="overdue"&&<span className="block text-xs text-zinc-500">Pago parcialmente</span>}</td>
     <td className="py-4"><div className="flex flex-wrap gap-2"><Link className="underline" href={href(page,{entry:row.id})+"#entry-form"}>{canWrite&&row.source_type==="manual"?"Editar":"Consultar"}</Link>{canWrite&&row.source_type==="manual"&&<DeleteEntry record={row} requestId={crypto.randomUUID()}/>}{canWrite&&["manual","input_purchase"].includes(row.source_type)&&["pending","partially_paid"].includes(row.status)&&<Link className="underline" href={href(page,{entry:row.id,action:"settle"})+"#entry-form"}>Dar baixa</Link>}</div></td>
    </tr>)}</tbody></table></div>}
    <div className="mt-6 flex justify-between text-sm"><span>Página {page} · 25 por página</span><div className="flex gap-4">{page>1&&<Link href={href(page-1)}>Anterior</Link>}{page*25<result.total&&<Link href={href(page+1)}>Próxima</Link>}</div></div>
   </section>
   <aside id="entry-form" className="h-fit scroll-mt-6 rounded-xl border border-zinc-200 bg-white p-5 sm:p-6">
    <h2>{selected?(operation==="settle"?"Dar baixa":operation==="cancel"?"Cancelar lançamento":canWrite?"Editar lançamento":"Detalhes do lançamento"):"Novo lançamento"}</h2>
    {selected&&<div className="mb-5 space-y-2 text-sm"><p className="break-words font-medium">{selected.description} · {formatMoney(selected.amount)}</p><p>Competência: {displayDate(selected.competence_date)}<br/>Vencimento: {displayDate(selected.due_date)}<br/>Quitação: {displayDate(selected.paid_date)}</p>{selected.paid_amount!==null&&<p>Baixado: {formatMoney(selected.paid_amount)}<br/>Em aberto: <strong>{formatMoney(selected.outstanding_amount??"0")}</strong></p>}{selected.installment_number&&<p>Parcela {selected.installment_number} de {selected.installment_count}</p>}<p>Origem: {({legacy:"Histórico anterior",manual:"Manual",input_purchase:"Compra de insumos",sale_receipt:"Recebimento de venda",sale_refund:"Devolução de venda",bank_statement:"Extrato bancário"}[selected.source_type])}</p>{selected.source_type==="legacy"&&<p className="text-zinc-500">Data original: {displayDate(selected.legacy_date)}. As datas de competência, vencimento e pagamento não foram informadas no sistema anterior.</p>}{selected.cancellation_reason&&<p className="break-words">Motivo: {selected.cancellation_reason}</p>}{(!editable||!canWrite)&&selected.notes&&<p className="break-words whitespace-pre-wrap">{selected.notes}</p>}</div>}
    {canWrite&&selected&&selected.source_type==="manual"&&!editable&&operation==="edit"&&<AmendEntry key={selected.id+selected.version} record={selected} requestId={crypto.randomUUID()}/>}
    {canWrite&&(!selected||editable||(payable&&operation==="settle"))?operation!=="edit"&&selected?<EntryOperation key={selected.id+operation+selected.version} record={selected} operation={operation} requestId={crypto.randomUUID()} today={today}/>:<><EntryForm key={selected?.id??"new"} requestId={crypto.randomUUID()} today={today} record={selected} accounts={activeAccounts} categories={activeCategories} centers={centers.data}/>{(!activeAccounts.length||!activeCategories.length)&&<p className="mt-3 text-sm text-zinc-500">Cadastre uma conta e uma categoria nas abas acima para começar.</p>}</>:!selected?<p className="text-sm text-zinc-500">Seu perfil permite consultar os lançamentos.</p>:null}
    {selected&&selected.source_type!=="legacy"&&<section className="mt-6 border-t border-zinc-200 pt-5"><h3 className="text-sm font-semibold">Histórico de pagamentos ({payments.total})</h3>{payments.items.length?<ul className="mt-3 space-y-3">{payments.items.map(payment=><li key={payment.id} className="rounded-lg bg-zinc-50 p-3 text-sm"><strong>{formatMoney(payment.amount)}</strong> · {displayDate(payment.paid_date)}<span className="block text-xs text-zinc-500">{payment.account_name}</span>{payment.notes&&<p className="mt-1 break-words whitespace-pre-wrap text-xs">{payment.notes}</p>}</li>)}</ul>:<p className="mt-2 text-sm text-zinc-500">Nenhuma baixa registrada.</p>}<div className="mt-3 flex gap-3 text-xs">{paymentPage>1&&<Link className="underline" href={href(page,{entry:selected.id,action:operation,payment_page:String(paymentPage-1)})+"#entry-form"}>Pagamentos anteriores</Link>}{paymentPage*25<payments.total&&<Link className="underline" href={href(page,{entry:selected.id,action:operation,payment_page:String(paymentPage+1)})+"#entry-form"}>Mais pagamentos</Link>}</div></section>}
    {selected&&<div className="mt-5 flex flex-wrap gap-4 text-sm"><Link className="underline" href={href()}>Fechar edição</Link>{canWrite&&editable&&operation!=="cancel"&&<Link className="text-red-700 underline" href={href(page,{entry:selected.id,action:"cancel"})+"#entry-form"}>Cancelar lançamento</Link>}</div>}
   </aside>
  </div>
  <p className="mt-6 text-sm text-zinc-500">Atrasos usam a data de São Paulo. O valor em aberto desconta as baixas registradas. O filtro por pagamento considera cada baixa, inclusive parcial; o valor da linha continua sendo o total do lançamento. Histórico anterior fica separado por falta dessas datas.</p>
 </main>;
}


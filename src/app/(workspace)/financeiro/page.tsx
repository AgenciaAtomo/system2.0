import Link from "next/link";
import {FinanceNav} from "@/components/finance-nav";
import {FinancialSummary} from "@/components/financial-summary";
import {requireAccess} from "@/services/access";
import {catalogKind,catalogResult,formatMoney} from "@/lib/finance";
import {CatalogForm,ArchiveCatalog} from "@/components/catalog-form";
import {Button} from "@/components/ui/button";
export const dynamic="force-dynamic";
const labels={account:"Contas financeiras",category:"Categorias",cost_center:"Centros de custo"};
const types:Record<string,string>={bancaria:"Conta bancária",corrente:"Conta corrente",poupanca:"Poupança",cartao_prepago:"Cartão pré-pago",carteira:"Carteira",caixa:"Caixa",marketplace:"Marketplace",digital:"Conta digital",receita:"Receita",despesa:"Despesa",ambos:"Receita e despesa"};
export default async function Finance({searchParams}:{searchParams:Promise<Record<string,string|undefined>>}){
 const params=await searchParams;const kind=catalogKind.catch("account").parse(params.kind);
 const page=Math.min(100000,Math.max(1,Number.parseInt(params.page??"1",10)||1)),search=(params.q??"").slice(0,100);
 if(!params.kind)return <FinancialSummary page={page}/>;
 const {client,organizationId}=await requireAccess("financial.read");
 const [{data,error},parents,roles]=await Promise.all([
 client.rpc("get_financial_catalog",{org:organizationId,kind,search,page}),
 client.from("categorias").select("id,nome").eq("empresa_id",organizationId).is("deletada_em",null).order("nome").limit(200),
 client.from("user_roles").select("role_id").eq("organization_id",organizationId)]);
 if(error||parents.error||roles.error)throw new Error("Não foi possível carregar o Financeiro.");
 const result=catalogResult.parse(data);
 const {data:grants,error:grantsError}=await client.from("role_permissions").select("permission_id").in("role_id",(roles.data??[]).map(r=>r.role_id)).eq("permission_id","financial.write").limit(1);
 if(grantsError)throw new Error("Não foi possível verificar permissões.");
 const canWrite=!!grants?.length;
 const edit=result.items.find(item=>item.id===params.edit&&item.active);
 const href=(p:number)=>"/financeiro?"+new URLSearchParams({kind,q:search,page:String(p)});
 return <main className="content finance-content"><p className="eyebrow">FINANCEIRO</p><h1>Organize as bases da operação</h1><p className="text-zinc-500">Contas, categorias e centros de custo para seus lançamentos.</p><FinanceNav active={kind}/>{params.saved==="1"&&<p className="notice" role="status">Cadastro salvo. A alteração foi registrada no histórico.</p>}<div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_300px]"><section className="min-w-0 rounded-xl border border-zinc-200 bg-white p-6"><div className="mb-5 flex flex-wrap items-center justify-between gap-4"><h2 className="mb-0">{labels[kind]}</h2><span className="text-sm text-zinc-500">{result.total} registros</span></div><form className="mb-5 flex gap-2"><input type="hidden" name="kind" value={kind}/><input aria-label="Buscar por nome" name="q" defaultValue={search} maxLength={100} placeholder="Buscar por nome" className="min-w-0 flex-1 rounded-lg border border-zinc-300 px-3 text-sm"/><Button variant="outline">Buscar</Button></form>{!result.items.length?<p className="py-10 text-center text-zinc-500">{search?"Nenhum resultado para esta busca.":"Nenhum cadastro nesta lista. Use o formulário para começar."}</p>:<div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="border-b border-zinc-200 text-zinc-500"><tr><th className="pb-3 font-medium">Nome · A–Z</th><th className="pb-3 font-medium">{kind==="account"?"Saldo inicial":kind==="category"?"Tipo":"Situação"}</th><th className="pb-3 font-medium">Ações</th></tr></thead><tbody className="divide-y divide-zinc-100">{result.items.map(row=><tr key={row.id}><td className="py-4 pr-4"><strong className="font-medium">{row.name}</strong><small className="mt-1 block text-zinc-500">{!row.active?"Arquivado":kind==="account"?types[row.type??""]??row.type:row.parent_id?"Subcategoria":"Ativo"}</small></td><td className="py-4 pr-4 whitespace-nowrap">{kind==="account"?formatMoney(row.opening_balance??"0"):kind==="category"?types[row.type??""]:row.active?"Ativo":"Arquivado"}</td><td className="py-4">{canWrite&&row.active?<div className="flex flex-wrap gap-2"><Button asChild variant="outline" size="sm"><Link href={href(page)+"&edit="+row.id}>Editar</Link></Button><ArchiveCatalog kind={kind} record={row} requestId={crypto.randomUUID()}/></div>:<span className="text-zinc-400">—</span>}</td></tr>)}</tbody></table></div>}<div className="mt-6 flex items-center justify-between text-sm"><span>Página {page} · 25 por página</span><div className="flex gap-3">{page>1&&<Link href={href(page-1)}>Anterior</Link>}{page*25<result.total&&<Link href={href(page+1)}>Próxima</Link>}</div></div></section>{canWrite&&<aside className="h-fit rounded-xl border border-zinc-200 bg-white p-6"><h2>{edit?"Editar cadastro":"Novo cadastro"}</h2><CatalogForm key={kind+":"+edit?.id} kind={kind} requestId={crypto.randomUUID()} record={edit} parents={parents.data??[]}/>{edit&&<Link className="mt-4 block text-sm underline" href={href(page)}>Cancelar edição</Link>}</aside>}</div><p className="mt-6 text-sm text-zinc-500">Registre entradas e saídas em Lançamentos. Vendas e compras vinculadas alimentam o financeiro automaticamente.</p></main>;
}


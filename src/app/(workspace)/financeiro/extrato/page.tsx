import Link from "next/link";
import {z} from "zod";
import {FinanceNav} from "@/components/finance-nav";
import {BankStatementDrafts,BankStatementUpload} from "@/components/bank-statement-form";
import {Button} from "@/components/ui/button";
import {requireAccess} from "@/services/access";
import {displayDate} from "@/lib/entries";

export const dynamic="force-dynamic";
const workspace=z.object({
 pending_total:z.number().int().nonnegative(),
 page:z.number().int().positive(),
 items:z.array(z.object({
  id:z.uuid(),transaction_date:z.string(),description:z.string(),amount:z.string(),type:z.enum(["receita","despesa"]),
  is_recurring:z.boolean(),import_name:z.string(),
 })),
 imports:z.array(z.object({
  id:z.uuid(),file_name:z.string(),created_at:z.string(),imported_count:z.number().int().nonnegative(),
  pending_count:z.number().int().nonnegative(),duplicate_count:z.number().int().nonnegative(),
 })),
});
export default async function BankStatementPage({searchParams}:{searchParams:Promise<Record<string,string|undefined>>}){
 const params=await searchParams;
 const page=Math.min(100000,Math.max(1,Number.parseInt(params.page??"1",10)||1));
 const {client,user,organizationId}=await requireAccess("financial.read");
 const [data,accounts,categories,roles]=await Promise.all([
  (client as any).rpc("get_bank_statement_workspace",{org:organizationId,page}),
  client.from("contas_bancarias").select("id,nome,ativa,deletada_em,moeda").eq("empresa_id",organizationId).order("nome").limit(201),
 client.from("categorias").select("id,nome,tipo").eq("empresa_id",organizationId).is("deletada_em",null).order("nome").limit(201),
  client.from("user_roles").select("role_id").eq("organization_id",organizationId).eq("user_id",user.id),
 ]);
 if(accounts.error||categories.error||roles.error)throw new Error("Não foi possível carregar o leitor de extrato.");
 const {data:grants,error:grantError}=await client.from("role_permissions").select("permission_id").in("role_id",roles.data.map(r=>r.role_id)).eq("permission_id","financial.write").limit(1);
 if(grantError)throw new Error("Não foi possível verificar seu acesso.");
 const setupPending=!!data.error;
 const result=setupPending?workspace.parse({pending_total:0,page,items:[],imports:[]}):workspace.parse(data.data);
 const canWrite=!!grants?.length;
 const canUseStatement=canWrite&&!setupPending;
 const activeAccounts=accounts.data.filter(a=>a.ativa&&!a.deletada_em&&a.moeda==="BRL").map(a=>({id:a.id,name:a.nome}));
 const activeCategories=categories.data.map(c=>({id:c.id,name:c.nome,type:c.tipo??"ambos"}));
 const success:Record<string,string>={upload:"Extrato processado. O que já tinha regra foi registrado; novidades ficaram pendentes.",categorize:"Lançamento registrado e regra aprendida para os próximos extratos.",ignore:"Item ignorado."};
 const href=(p:number)=>"/financeiro/extrato?"+new URLSearchParams({page:String(p)});
 return <main className="content finance-content">
  <p className="eyebrow">FINANCEIRO</p><h1>Leitor de extrato bancário</h1>
  <p className="text-zinc-500">Envie o extrato do banco para registrar entradas e saídas pagas. O sistema aprende categorias pela descrição do lançamento.</p>
  <FinanceNav active="statement"/>
  {params.saved&&success[params.saved]&&<p className="notice" role="status">{success[params.saved]}</p>}
  {setupPending&&<p className="notice" role="alert">O leitor de extrato ainda não foi ativado no banco. Aplique a migration <code>supabase/migrations/20260914134000_bank_statement_imports.sql</code> e atualize esta tela.</p>}
  <div className="grid gap-6 2xl:grid-cols-[minmax(0,1fr)_360px]">
   <section className="min-w-0 rounded-xl border border-zinc-200 bg-white p-5 sm:p-6">
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3"><div><h2 className="mb-1">Novas transações para categorizar</h2><span className="text-sm text-zinc-500">{result.pending_total} pendentes</span></div><Button asChild variant="outline"><Link href="/financeiro/lancamentos">Ver lançamentos</Link></Button></div>
    <BankStatementDrafts drafts={result.items} categories={activeCategories} canWrite={canUseStatement}/>
    <div className="mt-6 flex justify-between text-sm"><span>Página {page} · 25 por página</span><div className="flex gap-4">{page>1&&<Link href={href(page-1)}>Anterior</Link>}{page*25<result.pending_total&&<Link href={href(page+1)}>Próxima</Link>}</div></div>
   </section>
   <aside className="h-fit rounded-xl border border-zinc-200 bg-white p-5 sm:p-6">
   <h2>Enviar extrato</h2>
    {setupPending?<p className="text-sm text-zinc-500">Depois que a migration for aplicada, o envio de CSV, TXT e OFX ficará disponível aqui.</p>:canWrite?<BankStatementUpload accounts={activeAccounts}/>:<p className="text-sm text-zinc-500">Seu perfil permite consultar os extratos processados.</p>}
    {(!activeAccounts.length||!activeCategories.length)&&canUseStatement&&<p className="mt-3 text-sm text-zinc-500">Cadastre uma conta e categorias antes de importar.</p>}
   </aside>
  </div>
  <section className="mt-6 rounded-xl border border-zinc-200 bg-white p-5 sm:p-6">
   <h2>Últimos envios</h2>
   {!result.imports.length?<p className="py-8 text-center text-zinc-500">Nenhum extrato enviado ainda.</p>:<div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="border-b border-zinc-200 text-zinc-500"><tr><th className="pb-3 font-medium">Arquivo</th><th className="pb-3 font-medium">Resultado</th></tr></thead><tbody className="divide-y divide-zinc-100">{result.imports.map(item=><tr key={item.id}><td className="py-4 pr-4"><strong className="block break-words font-medium">{item.file_name}</strong><span className="text-xs text-zinc-500">{displayDate(item.created_at.slice(0,10))}</span></td><td className="py-4 pr-4">{item.imported_count} registrados · {item.pending_count} para categorizar · {item.duplicate_count} duplicados</td></tr>)}</tbody></table></div>}
  </section>
  <p className="mt-6 text-sm text-zinc-500">Use esta importação para movimentos bancários já efetivados. Compras com estoque e repasses de vendas continuam nos módulos próprios para evitar duplicidade.</p>
 </main>;
}

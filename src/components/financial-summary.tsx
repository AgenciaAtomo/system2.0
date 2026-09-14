import Link from "next/link";
import {z} from "zod";
import {requireAccess} from "@/services/access";
import {FinanceNav} from "@/components/finance-nav";
import {Button} from "@/components/ui/button";
import {formatMoney} from "@/lib/finance";
import {displayDate} from "@/lib/entries";

const summarySchema=z.object({
 as_of:z.string(),month_start:z.string(),month_end:z.string(),balance:z.string(),
 received:z.string(),paid:z.string(),receivable:z.string(),payable:z.string(),
 unknown_opening_count:z.number().int(),legacy_count:z.number().int(),account_count:z.number().int(),
 accounts:z.array(z.object({id:z.uuid(),name:z.string(),active:z.boolean(),opening_balance:z.string().nullable(),balance:z.string().nullable()})),
});

export async function FinancialSummary({page}:{page:number}){
 const {client,organizationId}=await requireAccess("financial.read");
 const {data,error}=await client.rpc("get_financial_summary",{org:organizationId,page});
 if(error)throw new Error("Não foi possível carregar o resumo financeiro.");
 const summary=summarySchema.parse(data);
 const month=new Intl.DateTimeFormat("pt-BR",{month:"long",year:"numeric",timeZone:"UTC"}).format(new Date(summary.month_start+"T12:00:00Z"));
 const cards=[
  {label:"Recebido no mês",value:summary.received,note:month},
  {label:"Pago no mês",value:summary.paid,note:month},
  {label:"Falta receber",value:summary.receivable,note:"Todos os vencimentos em aberto"},
  {label:"Falta pagar",value:summary.payable,note:"Todos os vencimentos em aberto"},
 ];
 return <main className="content finance-content">
  <p className="eyebrow">FINANCEIRO</p><h1>Seu dinheiro, de forma simples</h1>
  <p className="text-zinc-500">Saldos e movimentações registrados até {displayDate(summary.as_of)}.</p>
  <FinanceNav active="summary"/>
  <section className="mb-5 flex flex-wrap items-center justify-between gap-5 rounded-xl bg-zinc-900 p-6 text-white" aria-label="Saldo registrado">
   <div><p className="mb-2 text-sm text-zinc-300">{summary.unknown_opening_count?"Saldo conhecido das contas":"Saldo registrado nas contas"}</p><p className="m-0 text-3xl font-semibold tracking-tight">{formatMoney(summary.balance)}</p><p className="mt-2 mb-0 text-xs text-zinc-400">Saldo inicial + entradas − saídas · BRL</p></div>
   <Button asChild variant="outline" className="border-zinc-500 bg-transparent text-white hover:bg-zinc-800 hover:text-white"><Link href="/financeiro/lancamentos">Ver lançamentos</Link></Button>
  </section>
  <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{cards.map(card=><section key={card.label} className="rounded-xl border border-zinc-200 bg-white p-5"><h2 className="mb-3 text-sm font-medium text-zinc-600">{card.label}</h2><p className="m-0 break-words text-2xl font-semibold tracking-tight">{formatMoney(card.value)}</p><p className="mt-2 mb-0 text-xs text-zinc-500">{card.note}</p></section>)}</div>
  <section className="rounded-xl border border-zinc-200 bg-white p-5 sm:p-6">
   <div className="mb-5 flex flex-wrap items-center justify-between gap-3"><h2 className="mb-0">Saldo por conta</h2><Link href="/financeiro?kind=account" className="text-sm underline">Gerenciar contas</Link></div>
   {!summary.accounts.length?<p className="py-8 text-center text-zinc-500">{summary.account_count?"Nenhuma conta nesta página.":"Cadastre uma conta financeira para começar."}</p>:<div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="border-b border-zinc-200 text-zinc-500"><tr><th className="pb-3 font-medium">Conta</th><th className="pb-3 font-medium">Saldo inicial</th><th className="pb-3 font-medium">Saldo registrado</th><th className="pb-3 font-medium"><span className="sr-only">Ações</span></th></tr></thead><tbody className="divide-y divide-zinc-100">{summary.accounts.map(account=><tr key={account.id}><td className="py-4 pr-4 font-medium">{account.name}{!account.active&&<span className="mt-1 block text-xs font-normal text-zinc-500">Arquivada</span>}</td><td className="py-4 pr-4 whitespace-nowrap">{account.opening_balance===null?"Não informado":formatMoney(account.opening_balance)}</td><td className="py-4 pr-4 whitespace-nowrap font-medium">{account.balance===null?"Saldo inicial pendente":formatMoney(account.balance)}</td><td className="py-4 text-right"><Link href={"/financeiro/lancamentos?account_id="+account.id} className="underline">Lançamentos</Link></td></tr>)}</tbody></table></div>}
   {summary.account_count>25&&<div className="mt-5 flex justify-between text-sm"><span>Página {page}</span><div className="flex gap-4">{page>1&&<Link href={"/financeiro?page="+(page-1)}>Anterior</Link>}{page*25<summary.account_count&&<Link href={"/financeiro?page="+(page+1)}>Próxima</Link>}</div></div>}
  </section>
  <p className="mt-5 text-xs text-zinc-500">Os valores refletem os registros do sistema, sem consulta ao banco. Baixas parciais entram pelo valor efetivamente pago ou recebido. Contas arquivadas continuam no total.</p>
  {summary.legacy_count>0&&<p className="mt-2 text-xs text-zinc-500">O saldo inclui {summary.legacy_count} lançamentos antigos confirmados. Eles ficam fora dos totais do mês porque não têm data de pagamento informada.</p>}
  {summary.unknown_opening_count>0&&<p className="notice" role="status">{summary.unknown_opening_count} conta(s) sem saldo inicial informado não entram no saldo total conhecido.</p>}
 </main>;
}

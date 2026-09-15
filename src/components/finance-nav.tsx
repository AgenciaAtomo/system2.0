import Link from "next/link";
import {Button} from "@/components/ui/button";
const links=[['summary','Resumo','/financeiro'],['entries','Lançamentos','/financeiro/lancamentos'],['statement','Extrato bancário','/financeiro/extrato'],['receivables','Recebíveis de vendas','/recebiveis'],['account','Contas financeiras','/financeiro?kind=account'],['category','Categorias','/financeiro?kind=category'],['cost_center','Centros de custo','/financeiro?kind=cost_center']] as const;
export function FinanceNav({active}:{active:string}){
 return <nav className="my-7 flex flex-wrap gap-2" aria-label="Seções do Financeiro">{links.map(([key,label,href])=><Button asChild key={key} variant={active===key?"default":"outline"}><Link href={href} aria-current={active===key?"page":undefined}>{label}</Link></Button>)}</nav>;
}


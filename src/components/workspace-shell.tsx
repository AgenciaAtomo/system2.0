"use client";

import Link from "next/link";
import {usePathname} from "next/navigation";
import {logout} from "@/app/auth/actions";
import {Button} from "@/components/ui/button";
import {LayoutDashboard,Wallet,ShoppingBag,Package,Layers,Boxes,Calculator,ChartNoAxesCombined,MessageSquare,Settings} from "lucide-react";

const navigation=[["Dashboard","/dashboard",LayoutDashboard],["Financeiro","/financeiro",Wallet],["Vendas","/vendas",ShoppingBag],["Recebíveis","/recebiveis",Wallet],["Produtos","/produtos",Package],["Insumos","/insumos",Layers],["Custos","/custos",Layers],["Produção","/producao",Boxes],["Estoque","/estoque",Boxes],["Calculadoras","/calculadoras",Calculator],["Canais e taxas","/marketplaces",ShoppingBag],["Importação","/importacao",Layers],["Relatórios","/relatorios",ChartNoAxesCombined],["Análise","/analise",MessageSquare]] as const;
export function WorkspaceShell({children}:{children:React.ReactNode}){
 const pathname=usePathname();const current=navigation.find(([,href])=>pathname.startsWith(href));
 return <div className="workspace"><aside className="sidebar"><div className="brand"><span className="mark">B.</span><span>BUENO<br/>EXPRESS</span></div><p className="nav-label">ÁREA DE TRABALHO</p><nav aria-label="Menu principal">{navigation.map(([name,href,Icon])=><Link href={href} className="nav-item" aria-current={pathname.startsWith(href)?'page':undefined} key={href}><Icon size={18}/>{name}</Link>)}</nav><div className="sidebar-bottom"><Link href="/" className="nav-item" aria-current={pathname==='/'?'page':undefined}><Settings size={18}/>Configurações</Link><div className="organization">BE <div>Bueno Express<small>Área de trabalho</small></div></div></div></aside><div className="main-area"><header><span>{current?.[0]??'Configurações'}</span><form action={logout}><Button variant="outline" size="sm">Sair</Button></form></header><nav className="mobile-workspace-nav" aria-label="Navegação da área de trabalho">{navigation.map(([name,href])=><Link key={href} href={href} aria-current={pathname.startsWith(href)?'page':undefined}>{name}</Link>)}<Link href="/">Configurações</Link></nav>{children}</div></div>;
}

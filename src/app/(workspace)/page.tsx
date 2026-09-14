import {requireAccess} from "@/services/access";
import {confirmDocument} from "@/app/documents/actions";
import {DocumentForm} from "@/components/document-form";
import {Button} from "@/components/ui/button";
import {LockKeyhole} from "lucide-react";
export const dynamic="force-dynamic";
export default async function Home(){
 const {client,user,organizationId}=await requireAccess();
 const [organization,profile,files,audit]=await Promise.all([
 client.from("organizations").select("name").eq("id",organizationId).single(),
 client.from("profiles").select("display_name").eq("id",user.id).single(),
 client.from("attachments").select("id,original_name,state,created_at").eq("organization_id",organizationId).order("created_at",{ascending:false}).limit(10),
 client.from("audit_logs").select("id,action,entity,created_at").eq("organization_id",organizationId).order("created_at",{ascending:false}).limit(10)
 ]);
 if(organization.error||profile.error||files.error||audit.error)throw new Error("Não foi possível carregar as configurações.");
 const date=(value:string)=>new Intl.DateTimeFormat("pt-BR",{dateStyle:"short",timeStyle:"short",timeZone:"America/Sao_Paulo"}).format(new Date(value));
 const entities:Record<string,string>={organizations:"Empresa",organization_members:"Acesso à empresa",user_roles:"Perfil de acesso",attachments:"Documento",contas_bancarias:"Conta financeira",categorias:"Categoria",cost_centers:"Centro de custo"};
 const actions:Record<string,string>={INSERT:"Cadastro",UPDATE:"Atualização",DELETE:"Remoção"};
 return <main className="content"><p className="eyebrow">CONFIGURAÇÕES</p><h1>Seu ambiente de trabalho</h1><p className="intro">{organization.data.name} · {profile.data.display_name}</p><section className="foundation-card"><div className="card-icon"><LockKeyhole size={24}/></div><div><span className="badge">ADMINISTRADOR · ACESSO ATIVO</span><h2>Acesso vinculado à sua empresa</h2><p>Você pode consultar os documentos privados e o histórico de alterações. Os módulos de negócio serão liberados nas próximas etapas.</p></div></section><section className="mt-6 rounded-xl border border-zinc-200 bg-white p-6"><h2>Documentos da empresa</h2><DocumentForm/>{files.data.length===0?<p className="mt-6 text-sm text-zinc-500">Nenhum documento guardado ainda.</p>:<ul className="mt-4 divide-y divide-zinc-100">{files.data.map(file=><li className="flex flex-wrap items-center justify-between gap-3 py-4" key={file.id}><div className="min-w-0 break-words"><p className="mb-1 text-sm font-medium">{file.original_name}</p><small className="text-zinc-500">{date(file.created_at)} · {file.state==="confirmed"?"Confirmado":"Envio pendente"}</small></div>{file.state==="confirmed"?<Button asChild variant="outline" size="sm"><a href={"/documents/"+file.id}>Baixar</a></Button>:<form action={confirmDocument}><input type="hidden" name="id" value={file.id}/><Button variant="outline" size="sm">Confirmar envio</Button></form>}</li>)}</ul>}<p className="mt-4 mb-0 text-xs text-zinc-500">Últimos 10 documentos. Os arquivos confirmados são preservados.</p></section><section className="mt-6 rounded-xl border border-zinc-200 bg-white p-6"><h2>Histórico de alterações</h2>{audit.data.length===0?<p className="text-sm text-zinc-500">Nenhuma alteração registrada.</p>:<ul className="divide-y divide-zinc-100">{audit.data.map(event=><li key={event.id} className="flex flex-wrap justify-between gap-3 py-3 text-sm"><span>{entities[event.entity]??"Configuração"} · {actions[event.action]??"Alteração"}</span><time className="text-zinc-500">{date(event.created_at)}</time></li>)}</ul>}<p className="mt-4 mb-0 text-xs text-zinc-500">Últimos 10 eventos, no horário de São Paulo.</p></section><div className="next-step"><div><h3>Financeiro</h3><p>Acesse contas, categorias e centros de custo pelo menu lateral.</p></div></div></main>;
}




import {logout} from "@/app/auth/actions";
import {Button} from "@/components/ui/button";
export default function NoAccess(){return <main className="fallback"><h1>Acesso não autorizado</h1><p>Sua conta não possui uma associação ativa com permissão para esta área.</p><form action={logout}><Button>Sair e trocar de conta</Button></form></main>;}

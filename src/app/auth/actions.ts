"use server";
import {redirect} from "next/navigation";
import {createClient} from "@/lib/supabase/server";
import {credentials} from "@/lib/validation";
import {isConfigured} from "@/lib/config";
export type LoginState={error:string};
export async function login(_previous:LoginState,form:FormData):Promise<LoginState>{
 if(!isConfigured())return {error:"A conexão ainda precisa ser configurada."};
 const parsed=credentials.safeParse({email:form.get("email"),password:form.get("password")});
 if(!parsed.success)return {error:"Confira o e-mail e a senha informados."};
 try{const client=await createClient();const {error}=await client.auth.signInWithPassword(parsed.data);
 if(error)return {error:"Não foi possível entrar. Confira seus dados e a confirmação do e-mail."};
 }catch{return {error:"Não foi possível conectar. Tente novamente em instantes."};}
 redirect("/dashboard");
}
export async function logout(){const client=await createClient();const {error}=await client.auth.signOut();if(error)throw new Error("Não foi possível encerrar a sessão.");redirect("/login");}


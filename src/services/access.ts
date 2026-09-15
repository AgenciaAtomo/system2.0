import "server-only";
import {redirect} from "next/navigation";
import {createClient} from "@/lib/supabase/server";
import {isConfigured} from "@/lib/config";
export async function requireIdentity(){
 if(!isConfigured())redirect("/login");
 const client=await createClient();const {data,error}=await client.auth.getUser();
 if(error||!data.user)redirect("/login");
 return {client,user:data.user};
}
export async function requireAccess(permission="settings.manage"){
 const {client,user}=await requireIdentity();
 const {data:members,error}=await client.from("organization_members").select("organization_id").eq("user_id",user.id).eq("active",true).limit(2);
 if(error)throw new Error("Não foi possível verificar seu acesso.");
 if(!members||members.length!==1)redirect("/sem-acesso");
 const organizationId=members[0].organization_id;
 const {data:roles,error:roleError}=await client.from("user_roles").select("role_id").eq("organization_id",organizationId).eq("user_id",user.id);
 if(roleError)throw new Error("Não foi possível verificar suas permissões.");
 const {data:grants,error:grantError}=await client.from("role_permissions").select("permission_id").in("role_id",(roles??[]).map(r=>r.role_id)).eq("permission_id",permission).limit(1);
 if(grantError)throw new Error("Não foi possível verificar suas permissões.");
 if(!grants?.length)redirect("/sem-acesso");
 return {client,user,organizationId};
}

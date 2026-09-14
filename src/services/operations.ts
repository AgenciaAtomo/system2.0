import 'server-only';
import {requireAccess} from '@/services/access';
import {object} from '@/lib/operations';
export async function operationData(section:string,filters:Record<string,string|undefined>={}){
 const permission=['stock','costs'].includes(section)?'operational.read':'financial.read';
 const {client,organizationId,user}=await requireAccess(permission);
 const {data,error}=await client.rpc('operation_data',{org:organizationId,section,filters:Object.fromEntries(Object.entries(filters).filter((e):e is [string,string]=>typeof e[1]==='string'))});
 if(error)throw new Error(error.code==='P0001'?error.message:'Não foi possível carregar os dados. Tente novamente.');
 const roles=await client.from('user_roles').select('role_id').eq('organization_id',organizationId).eq('user_id',user.id);
 const grants=await client.from('role_permissions').select('permission_id').in('role_id',(roles.data??[]).map(r=>r.role_id));
 if(roles.error||grants.error)throw new Error('Não foi possível verificar seu acesso.');
 return {data:object(data),canWrite:!!grants.data?.some(g=>g.permission_id===permission.replace('.read','.write'))};
}

import {requireAccess} from "@/services/access";
import {z} from "zod";
export async function GET(_request:Request,{params}:{params:Promise<{id:string}>}){
 const {client,organizationId}=await requireAccess();const {id}=await params;
 if(!z.uuid().safeParse(id).success)return new Response("Documento inválido",{status:400});
 const {data,error}=await client.from("attachments").select("bucket_id,object_path,original_name,mime_type").eq("id",id).eq("organization_id",organizationId).eq("state","confirmed").single();
 if(error||!data)return new Response("Documento indisponível",{status:404});
 const {data:blob,error:downloadError}=await client.storage.from(data.bucket_id).download(data.object_path);
 if(downloadError||!blob)return new Response("Não foi possível baixar o documento",{status:503});
 return new Response(blob,{headers:{"Content-Type":data.mime_type,"Content-Disposition":"attachment; filename*=UTF-8''"+encodeURIComponent(data.original_name),"Cache-Control":"private, no-store","X-Content-Type-Options":"nosniff"}});
}

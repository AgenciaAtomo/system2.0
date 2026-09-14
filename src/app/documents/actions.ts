"use server";
import {requireAccess} from "@/services/access";
import {validFile} from "@/lib/files";
import {revalidatePath} from "next/cache";
export async function uploadDocument(_state:{message:string},form:FormData){
 const {client,user,organizationId}=await requireAccess();
 const file=form.get("file");
 if(!(file instanceof File)||!file.name||file.name.length>255||file.size>10*1024*1024)return {message:"Escolha um PDF, PNG ou JPEG de até 10 MB."};
 const bytes=new Uint8Array(await file.arrayBuffer());
 if(!validFile(bytes,file.type))return {message:"Formato inválido. Envie um PDF, PNG ou JPEG."};
 const id=crypto.randomUUID();const path=organizationId+"/"+id;
 const {error:prepareError}=await client.from("attachments").insert({id,organization_id:organizationId,bucket_id:"be-organization-documents",object_path:path,original_name:file.name,mime_type:file.type,size_bytes:file.size,created_by:user.id,entity_type:"organization",entity_id:organizationId});
 if(prepareError)return {message:"Não foi possível preparar o envio. Tente novamente."};
 const {error:uploadError}=await client.storage.from("be-organization-documents").upload(path,bytes,{contentType:file.type,upsert:false});
 if(uploadError)return {message:"O envio não foi concluído. Nenhum arquivo foi confirmado."};
 const {error:confirmError}=await client.rpc("confirm_attachment",{attachment_id:id});
 revalidatePath("/");
 return {message:confirmError?"Arquivo enviado, mas a confirmação está pendente. Use Confirmar na lista.":"Documento guardado com acesso privado."};
}
export async function confirmDocument(form:FormData){
 const {client}=await requireAccess();const id=form.get("id");
 if(typeof id!=="string"||!/^[0-9a-f-]{36}$/i.test(id))throw new Error("Documento inválido.");
 const {error}=await client.rpc("confirm_attachment",{attachment_id:id});
 if(error)throw new Error("Não foi possível confirmar. Verifique se o arquivo terminou de ser enviado.");
 revalidatePath("/");
}

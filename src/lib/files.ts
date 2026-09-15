export const allowedTypes=["application/pdf","image/png","image/jpeg"] as const;
export function validFile(bytes:Uint8Array,mime:string){
 if(bytes.length<8||bytes.length>10*1024*1024)return false;
 if(mime==="application/pdf")return new TextDecoder().decode(bytes.slice(0,5))==="%PDF-";
 if(mime==="image/png")return [137,80,78,71,13,10,26,10].every((v,i)=>bytes[i]===v);
 if(mime==="image/jpeg")return bytes[0]===255&&bytes[1]===216&&bytes[2]===255;
 return false;
}

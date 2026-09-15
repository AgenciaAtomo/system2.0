import {z} from "zod";
export const credentials=z.object({email:z.email().max(254),password:z.string().min(1).max(1024)});
export function safeRedirect(value:string|null){return value && value.startsWith("/") && !value.startsWith("//") && !value.includes("\\") ? value : "/";}

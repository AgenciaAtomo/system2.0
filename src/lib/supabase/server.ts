import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getConfig } from "@/lib/config";
import type { Database } from "@/types/database.types";
export async function createClient() {
 const jar=await cookies();const {url,key}=getConfig();
 return createServerClient<Database>(url,key,{cookies:{
 getAll(){return jar.getAll();},
 setAll(values){try{values.forEach(({name,value,options})=>jar.set(name,value,options));}catch{/* Server Components: the proxy persists refreshed cookies. */}}
 }});
}

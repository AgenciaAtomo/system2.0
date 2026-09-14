import {createServerClient} from "@supabase/ssr";
import {NextResponse,type NextRequest} from "next/server";
import {getConfig,isConfigured} from "@/lib/config";
export async function proxy(request:NextRequest){
 if(!isConfigured()) return NextResponse.next();
 let response=NextResponse.next({request});const {url,key}=getConfig();
 const supabase=createServerClient(url,key,{cookies:{
 getAll:()=>request.cookies.getAll(),
 setAll(values){values.forEach(({name,value})=>request.cookies.set(name,value));response=NextResponse.next({request});values.forEach(({name,value,options})=>response.cookies.set(name,value,options));}
 }});
 const {data,error}=await supabase.auth.getClaims();
 if((error||!data?.claims?.sub)&&(request.nextUrl.pathname==="/"||request.nextUrl.pathname.startsWith("/documents/")||request.nextUrl.pathname.startsWith("/financeiro")||request.nextUrl.pathname.startsWith("/insumos")||request.nextUrl.pathname.startsWith("/produtos")||request.nextUrl.pathname.startsWith("/calculadoras"))){
  const target=NextResponse.redirect(new URL("/login",request.url));
  response.cookies.getAll().forEach(cookie=>target.cookies.set(cookie));
  target.headers.set("Cache-Control","private, no-store");
  return target;
 }
 response.headers.set("Cache-Control","private, no-store");
 return response;
}
export const config={matcher:["/((?!_next/static|_next/image|favicon.ico).*)"]};




import {createServerClient} from '@supabase/ssr';
process.loadEnvFile('.env.local');
const cookies=new Map();
const client=createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,{cookies:{getAll:()=>[...cookies].map(([name,value])=>({name,value})),setAll:items=>items.forEach(c=>cookies.set(c.name,c.value))}});
const {error}=await client.auth.signInWithPassword({email:process.env.BE_TEST_EMAIL,password:process.env.BE_TEST_PASSWORD});
if(error)throw new Error('Login de verificação falhou.');
try{
 const base=process.env.BE_TEST_BASE||'http://127.0.0.1:3002';const cookie=[...cookies].map(([k,v])=>k+'='+v).join('; ');
 const routes=['/dashboard','/producao','/estoque','/custos','/vendas','/recebiveis','/marketplaces','/importacao','/relatorios','/analise','/produtos','/insumos','/financeiro','/financeiro/lancamentos','/calculadoras?mode=3d','/'];
 for(let at=0;at<routes.length;at+=3){await Promise.all(routes.slice(at,at+3).map(async path=>{const r=await fetch(base+path,{headers:{cookie},signal:AbortSignal.timeout(45000)});const html=await r.text();const heading=html.match(/<h1[^>]*>(.*?)<\/h1>/s)?.[1]?.replace(/<[^>]+>/g,'');if(!r.ok||r.url.includes('/login')||!heading||html.includes('Não foi possível concluir esta operação'))throw new Error(path+' não carregou: '+r.status);console.log(path+' OK · '+heading);}));}
 const csv=await fetch(base+'/relatorios/exportar?kind=daily',{headers:{cookie},signal:AbortSignal.timeout(20000)});if(!csv.ok||!csv.headers.get('content-type')?.includes('text/csv'))throw new Error('Exportação falhou');console.log('Exportação CSV OK');
}finally{await client.auth.signOut({scope:'local'});}

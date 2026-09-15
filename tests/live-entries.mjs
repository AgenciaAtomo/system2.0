import {createServerClient} from '@supabase/ssr';
import {createClient} from '@supabase/supabase-js';
import assert from 'node:assert/strict';
const jar=new Map();
const baseUrl=process.env.BE_TEST_BASE_URL??'http://127.0.0.1:3000';
const client=createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,{cookies:{getAll:()=>[...jar].map(([name,value])=>({name,value})),setAll:values=>values.forEach(({name,value})=>jar.set(name,value))}});
const {error}=await client.auth.signInWithPassword({email:process.env.BE_TEST_EMAIL,password:process.env.BE_TEST_PASSWORD});
assert.equal(error,null,'Auth login');
try{
 const cookie=[...jar].map(([name,value])=>name+'='+value).join('; ');
 for(const path of ['/financeiro/lancamentos','/financeiro/lancamentos?status=overdue','/financeiro/lancamentos?type=receita','/financeiro/lancamentos?type=despesa&status=open','/financeiro/lancamentos?type=receita&status=open','/financeiro?kind=account']){
  const response=await fetch(baseUrl+path,{headers:{cookie},redirect:'manual'});
  assert.equal(response.status,200,path);
  const html=await response.text();assert.ok(html.includes('Menu principal'),'shared sidebar');assert.ok(html.includes('Configurações'),'settings navigation');
  if(path.startsWith('/financeiro/lancamentos')){assert.ok(html.includes('Registrar lançamento'),'entry form');assert.ok(html.includes('competence_date'),'competence input');assert.ok(html.includes('due_date'),'due input');assert.ok(html.includes('Contas a pagar'),'payables shortcut');assert.ok(html.includes('Contas a receber'),'receivables shortcut');}
 }
 const {data:org,error:orgError}=await client.from('organizations').select('id').single();assert.equal(orgError,null);
 const list=await client.rpc('get_financial_entries',{org:org.id,filters:{},page:1});assert.equal(list.error,null);
 assert.ok(Array.isArray(list.data.items),'entries list');
 if(list.data.items.length)assert.equal(typeof list.data.items[0].amount,'string','exact transport');
 const invalid=await client.rpc('save_financial_entry',{org:org.id,request_id:crypto.randomUUID(),payload:{operation:'save'}});assert.equal(invalid.error?.code,'22023','write validates data');
 const foreign=await client.rpc('get_financial_entries',{org:crypto.randomUUID(),filters:{},page:1});assert.equal(foreign.error?.code,'42501','foreign organization denied');
 const direct=await client.from('transacoes').update({descricao:'Must not write'}).eq('id',crypto.randomUUID());assert.equal(direct.error?.code,'42501','direct mutation denied');
 const anonymous=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,{auth:{persistSession:false}});
 const anon=await anonymous.rpc('get_financial_entries',{org:org.id,filters:{},page:1});assert.ok(anon.error,'anonymous RPC denied');
 const redirect=await fetch(baseUrl+'/financeiro/lancamentos',{redirect:'manual'});assert.equal(redirect.status,307,'unauthenticated route redirects');
 console.log('PASS: authenticated SSR routes/forms/sidebar, actual read/write RPC validation, decimal transport, foreign organization and anonymous rejection, direct DML denial. No business data written.');
}finally{await client.auth.signOut({scope:'local'});}

import {createServerClient} from '@supabase/ssr';
import assert from 'node:assert/strict';
const jar=new Map();
const client=createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,{cookies:{getAll:()=>[...jar].map(([name,value])=>({name,value})),setAll:values=>values.forEach(({name,value})=>jar.set(name,value))}});
const {error}=await client.auth.signInWithPassword({email:process.env.BE_TEST_EMAIL,password:process.env.BE_TEST_PASSWORD});assert.equal(error,null);
try{
 const cookie=[...jar].map(([name,value])=>name+'='+value).join('; ');
 for(const kind of ['account','category','cost_center']){
  const response=await fetch('http://127.0.0.1:3000/financeiro?kind='+kind,{headers:{cookie},redirect:'manual'});
  assert.equal(response.status,200,kind);
  const body=await response.text();assert.ok(body.includes('Novo cadastro'),kind+' form');assert.ok(body.includes('Cadastrar'),kind+' action');
 }
 const anon=await fetch('http://127.0.0.1:3000/financeiro',{redirect:'manual'});assert.equal(anon.status,307);
 const org=await client.from('organizations').select('id').single();assert.equal(org.error,null);
 const list=await client.rpc('get_financial_catalog',{org:org.data.id,kind:'account',page:1,search:''});assert.equal(list.error,null);
 assert.equal(typeof list.data.items[0].opening_balance,'string');
 console.log('PASS: three authenticated finance routes, forms, anonymous redirect, real catalog API and decimal string transport.');
}finally{await client.auth.signOut({scope:'local'});}


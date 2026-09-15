"use client";
import {useActionState,useState} from "react";
import {saveProduct} from "@/app/produtos/actions";
import {Button} from "@/components/ui/button";
import {compatibleUnits} from "@/lib/inputs";
import {productionFields,failurePercent,type Product,type Variant} from "@/lib/products";
const field="mt-1.5 block min-h-11 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm";
const pt=(s:string|undefined)=>s?.replace(".",",")??"0";
export type MaterialOption={id:string;name:string;sku:string;base_unit:string;active:boolean};
export function ProductForm({record,requestId}:{record?:Product;requestId:string}){
 const [state,action,pending]=useActionState(saveProduct,{message:""});
 return <form action={action} className="grid gap-4">
  <input type="hidden" name="kind" value="product"/><input type="hidden" name="id" value={record?.id??""}/><input type="hidden" name="version" value={record?.version??1}/><input type="hidden" name="request_id" value={requestId}/>
  <label className="text-sm font-medium">Nome do produto<input className={field} name="name" required maxLength={200} defaultValue={record?.name} placeholder="Ex.: Saboneteira"/></label>
  <label className="text-sm font-medium">Código interno<input className={field} name="sku" required maxLength={64} defaultValue={record?.internal_sku} placeholder="SABONETEIRA"/></label>
  <label className="text-sm font-medium">Preço de referência (R$)<input className={field} name="price" inputMode="decimal" required maxLength={32} defaultValue={pt(record?.default_sale_price)}/></label>
  <details className="rounded-lg border border-zinc-200 p-3"><summary className="cursor-pointer text-sm">Categoria, descrição e margem mínima</summary><div className="mt-3 grid gap-4">
   <label className="text-sm">Categoria<input className={field} name="category" maxLength={100} defaultValue={record?.category}/></label>
   <label className="text-sm">Descrição<textarea className={field} name="description" rows={3} maxLength={2000} defaultValue={record?.description}/></label>
   <label className="text-sm">Margem mínima desejada (%)<input className={field} name="minimum_margin" inputMode="decimal" maxLength={8} defaultValue={pt(record?.minimum_margin)}/></label>
  </div></details>
  <label className="flex gap-2 text-sm"><input name="active" type="checkbox" defaultChecked={record?.active??true}/>Produto ativo</label>
  <Button disabled={pending}>{pending?"Salvando…":record?"Salvar produto":"Cadastrar produto"}</Button>{state.message&&<p className="notice" role="alert">{state.message}</p>}
 </form>;
}
export function VariantForm({product,record,materials,requestId}:{product:Product;record?:Variant;materials:MaterialOption[];requestId:string}){
 const [state,action,pending]=useActionState(saveProduct,{message:""});const [use3d,setUse3d]=useState(!!record&&Object.keys(record.production).length>0);
 const [parts,setParts]=useState(()=>record?.components.map((c,i)=>({key:String(i),input_id:c.input_id,quantity:pt(c.quantity),unit:c.unit,waste_percentage:pt(c.waste_percentage)}))??[]);
 const active=materials.filter(m=>m.active);const sheet=record?.production??{};
 return <form action={action} className="grid gap-4">
  <input type="hidden" name="kind" value="variant"/><input type="hidden" name="product_id" value={product.id}/><input type="hidden" name="id" value={record?.id??""}/><input type="hidden" name="version" value={record?.version??1}/><input type="hidden" name="request_id" value={requestId}/>
  <div className="grid gap-3 sm:grid-cols-2"><label className="text-sm font-medium">Nome da versão<input className={field} name="name" required maxLength={100} defaultValue={record?.name??"Padrão"} placeholder="Ex.: Preto ou Kit 3"/></label><label className="text-sm font-medium">SKU da versão<input className={field} name="sku" required maxLength={64} defaultValue={record?.sku??product.internal_sku+"-01"}/></label></div>
  <label className="text-sm font-medium">Preço de venda desta versão (R$)<input className={field} name="price" inputMode="decimal" maxLength={32} required defaultValue={pt(record?.price??product.default_sale_price)}/></label>
  <details className="rounded-lg border border-zinc-200 p-3"><summary className="cursor-pointer text-sm">Cor e tamanho (opcional)</summary><div className="mt-3 grid gap-3 sm:grid-cols-2"><label className="text-sm">Cor<input className={field} name="color" maxLength={100} defaultValue={String(record?.attributes.color??"")}/></label><label className="text-sm">Tamanho<input className={field} name="size" maxLength={100} defaultValue={String(record?.attributes.size??"")}/></label></div></details>
  <section className="border-t border-zinc-200 pt-4"><h3>Materiais por unidade vendida</h3><p className="text-xs text-zinc-500">Inclua embalagem, fita e acessórios. Para um kit, informe o consumo do kit completo. O filamento calculado na ficha 3D fica separado.</p>
   <div className="grid gap-3">{parts.map((part,index)=><div key={part.key} className="rounded-lg border border-zinc-200 p-3">
    <label className="text-sm">Material<select name="component_id" className={field} required value={part.input_id} onChange={e=>setParts(rows=>rows.map((r,i)=>i===index?{...r,input_id:e.target.value,unit:materials.find(m=>m.id===e.target.value)?.base_unit??"unidade"}:r))}><option value="">Selecione</option>{materials.filter(m=>m.active||m.id===part.input_id).map(m=><option key={m.id} value={m.id}>{m.name} · {m.sku}{!m.active?" (inativo)":""}</option>)}</select></label>
    <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3"><label className="text-xs">Quantidade<input name="component_quantity" className={field} inputMode="decimal" maxLength={20} required value={part.quantity} onChange={e=>setParts(rows=>rows.map((r,i)=>i===index?{...r,quantity:e.target.value}:r))}/></label><label className="text-xs">Unidade<select name="component_unit" className={field} value={part.unit} onChange={e=>setParts(rows=>rows.map((r,i)=>i===index?{...r,unit:e.target.value}:r))}>{compatibleUnits(materials.find(m=>m.id===part.input_id)?.base_unit??part.unit).map(u=><option key={u}>{u}</option>)}</select></label><label className="text-xs">Desperdício (%)<input name="component_waste" className={field} inputMode="decimal" maxLength={8} value={part.waste_percentage} onChange={e=>setParts(rows=>rows.map((r,i)=>i===index?{...r,waste_percentage:e.target.value}:r))}/></label></div>
    <button type="button" className="mt-3 text-xs text-red-700 underline" onClick={()=>setParts(rows=>rows.filter((_,i)=>i!==index))}>Remover da ficha</button>
   </div>)}</div>
   <Button className="mt-3" type="button" variant="outline" disabled={!active.length||parts.length>=100} onClick={()=>setParts(rows=>[...rows,{key:crypto.randomUUID(),input_id:"",quantity:"1",unit:"unidade",waste_percentage:"0"}])}>Adicionar material</Button>{!active.length&&<p className="mt-2 text-xs text-zinc-500">Cadastre os materiais em Insumos para montar a ficha.</p>}
  </section>
  <label className="flex items-center gap-2 rounded-lg bg-zinc-50 p-3 text-sm font-medium"><input type="checkbox" name="use_3d" checked={use3d} onChange={e=>setUse3d(e.target.checked)}/>Incluir produção 3D</label>
  {use3d&&<section className="grid gap-4 rounded-lg border border-zinc-200 p-4"><h3 className="mb-0">Ficha do lote de impressão</h3><p className="m-0 text-xs text-zinc-500">Pesos e tempos são do lote inteiro. A quantidade abaixo é o número de unidades vendáveis geradas pelo lote (para kits, número de kits). O sistema divide os custos por essa quantidade.</p>
   <label className="text-sm">Filamento<select className={field} name="filament_id" required defaultValue={sheet.filament_id??""}><option value="">Selecione o filamento</option>{materials.filter(m=>(m.active||m.id===sheet.filament_id)&&["g","kg"].includes(m.base_unit)).map(m=><option key={m.id} value={m.id}>{m.name}{!m.active?" (inativo)":""}</option>)}</select></label>
   <div className="grid gap-3 sm:grid-cols-2"><label className="text-sm">Unidades vendáveis por lote<input className={field} name="quantity_per_batch" type="number" min={1} max={999999} step={1} required defaultValue={sheet.quantity_per_batch??"1"}/></label><label className="text-sm">Falhas de impressão (%)<input className={field} name="failed_print_percent" inputMode="decimal" maxLength={7} required defaultValue={pt(failurePercent(sheet.failed_print_rate??"0"))}/></label></div>
   <p className="m-0 text-xs text-zinc-500">As falhas aumentam o consumo de filamento. Não aumentam automaticamente os tempos e a energia.</p>
   <div className="grid gap-3 sm:grid-cols-2">{productionFields.map(([key,label])=><label key={key} className="text-xs">{label}<input className={field} name={key} inputMode="decimal" maxLength={16} required defaultValue={pt(sheet[key])}/></label>)}</div>
  </section>}
  <details className="rounded-lg border border-zinc-200 p-3"><summary className="cursor-pointer text-sm">Outros custos e rateio (opcional)</summary><div className="mt-3 grid gap-3 sm:grid-cols-2"><label className="text-sm">Outros custos por unidade (R$)<input className={field} name="other_direct_costs" inputMode="decimal" maxLength={16} defaultValue={pt(record?.other_direct_costs)}/></label><label className="text-sm">Indiretos sobre o custo direto (%)<input className={field} name="overhead_percentage" inputMode="decimal" maxLength={8} defaultValue={pt(record?.overhead_percentage)}/></label></div><p className="mt-2 mb-0 text-xs text-zinc-500">Evite incluir custos já informados nos materiais ou na ficha 3D.</p></details>
  <label className="flex gap-2 text-sm"><input type="checkbox" name="active" defaultChecked={record?.active??true}/>Versão ativa</label>
  <p className="m-0 text-xs text-zinc-500">Salvar a ficha calcula uma estimativa atual. Não consome estoque nem registra produção ou venda.</p>
  <Button disabled={pending}>{pending?"Salvando…":"Salvar versão e calcular custo"}</Button>{state.message&&<p className="notice" role="alert">{state.message}</p>}
 </form>;
}

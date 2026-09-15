import {z} from "zod";
export const inputUnits=["g","kg","ml","l","unidade","metro","cm"] as const;
export function compatibleUnits(unit:string){return inputUnits.filter(u=>u===unit||["g,kg","ml,l","metro,cm"].some(group=>group.split(",").includes(unit)&&group.split(",").includes(u)));}
export function inputDecimal(value:string,places=6,digits=12):string{
 const normalized=value.trim().replace(",",".");
 if(!new RegExp(`^[0-9]{1,${digits}}(\\.[0-9]{1,${places}})?$`).test(normalized))throw new Error("Informe um número positivo ou zero, sem separador de milhar.");
 return normalized;
}
export function displayQuantity(value:string|null){if(value===null)return "—";const [whole,fraction]=value.split(".");return whole.replace(/\B(?=(\d{3})+(?!\d))/g,".")+(fraction?.replace(/0+$/,"")?","+fraction.replace(/0+$/,""):"");}
export function displayUnitCost(value:string|null){return value===null?"Sem custo":"R$ "+displayQuantity(value);}
const decimal=z.string().regex(/^-?\d+(\.\d+)?$/);
export const inputRecord=z.object({id:z.uuid(),name:z.string(),sku:z.string(),category:z.string(),base_unit:z.enum(inputUnits),stock_quantity:decimal,minimum_stock:decimal,average_cost:decimal.nullable(),last_cost:decimal.nullable(),default_supplier:z.string(),active:z.boolean(),version:z.number().int(),last_movement_date:z.string().nullable(),low_stock:z.boolean()});
export type InputRecord=z.infer<typeof inputRecord>;
export const inputsResult=z.object({total:z.number(),items:z.array(inputRecord)});
export const inputHistory=z.object({total:z.number(),items:z.array(z.object({id:z.uuid(),type:z.enum(["purchase","manual_adjustment","production_consumption","return"]),quantity:decimal,value_change:decimal,stock_after:decimal,average_cost_after:decimal.nullable(),movement_date:z.string(),reason:z.string(),supplier:z.string().nullable(),final_cost:decimal.nullable(),unit_cost:decimal.nullable(),purchase_unit:z.string().nullable(),purchased_quantity:decimal.nullable()}))});


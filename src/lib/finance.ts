import {z} from "zod";
import Decimal from "decimal.js";
export const catalogKind=z.enum(["account","category","cost_center"]);
export type CatalogKind=z.infer<typeof catalogKind>;
export const catalogRow=z.object({id:z.uuid(),name:z.string(),type:z.string().nullable(),opening_balance:z.string().nullable(),active:z.boolean(),parent_id:z.uuid().nullable()});
export const catalogResult=z.object({items:z.array(catalogRow),total:z.number().int().nonnegative(),page:z.number().int().positive()});
export type CatalogRow=z.infer<typeof catalogRow>;
export function parseMoney(text:string){
 const input=text.trim();
 let canonical:string;
 if(input.includes(",")){
  if(!/^-?(?:\d+|\d{1,3}(?:\.\d{3})+)(?:,\d{1,2})$/.test(input))throw new Error("Valor inválido.");
  canonical=input.replaceAll(".","").replace(",",".");
 }else{
  if(!/^-?\d+(?:\.\d{1,2})?$/.test(input))throw new Error("Valor inválido.");
  canonical=input;
 }
 const value=new Decimal(canonical);
 if(value.abs().greaterThan("9999999999999.99"))throw new Error("Valor acima do limite.");
 return value.toFixed(2);
}
export function formatMoney(value:string){
 const fixed=new Decimal(value).toFixed(2);
 const [whole,cents]=fixed.split(".");
 return "R$ "+whole.replace(/\B(?=(\d{3})+(?!\d))/g,".")+","+cents;
}

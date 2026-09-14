export type Row=Record<string,unknown>;
export function object(value:unknown):Row{return value!==null&&typeof value==='object'&&!Array.isArray(value)?value as Row:{};}
export function list(value:unknown):Row[]{return Array.isArray(value)?value.map(object):[];}
export function text(row:Row,key:string,fallback=''){const value=row[key];return typeof value==='string'||typeof value==='number'?String(value):fallback;}
export function flag(row:Row,key:string){return row[key]===true;}
export type Choice={value:string;label:string;price?:string};
export type Field={name:string;label:string;type?:'text'|'date'|'number'|'select'|'textarea';value?:string;required?:boolean;choices?:Choice[];hint?:string};
export function choices(rows:Row[],label='name'):Choice[]{return rows.map(r=>({value:text(r,'id'),label:text(r,label)}));}


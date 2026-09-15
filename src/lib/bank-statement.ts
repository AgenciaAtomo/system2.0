import {z} from "zod";
import {parseMoney} from "./finance.ts";
import {normalizedDate,parseCSV} from "./tabular.ts";

export const bankStatementRow=z.object({
 date:z.iso.date().refine(value=>value>="1900-01-01"&&value<="2199-12-31"),
 description:z.string().trim().min(1).max(500),
 amount:z.string().regex(/^\d{1,13}(\.\d{1,2})?$/),
 type:z.enum(["receita","despesa"]),
 reference:z.string().trim().max(120).default(""),
});
export type BankStatementRow=z.infer<typeof bankStatementRow>;

const aliases={
 date:["date","data","datamovimento","datadomovimento","posteddate","dtposted","dtmovimento","release_date","releasedate"],
 description:["description","descricao","descrição","historico","histórico","lancamento","lançamento","memo","nome","title","transaction_type","transactiontype"],
 amount:["amount","valor","value","valorlancamento","valorlançamento","valorbruto","transaction_net_amount","transactionnetamount","netamount"],
 debit:["debito","débito","saida","saída","withdrawal","debit"],
 credit:["credito","crédito","entrada","deposit","credit"],
 type:["type","tipo","natureza"],
 reference:["reference","referencia","referência","id","identificador","documento","doc","fitid","reference_id","referenceid"],
};

function normalizeHeader(value:string){
 return value.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]/g,"");
}
export function normalizeStatementDescription(value:string){
 return value.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g," ").replace(/\b\d{2,}\b/g,"").replace(/\s+/g," ").trim();
}
function column(headers:string[],names:string[]){
 const normalized=headers.map(normalizeHeader);
 return names.map(normalizeHeader).map(name=>normalized.indexOf(name)).find(index=>index>=0)??-1;
}
function csvIndexes(headers:string[]){
 return {
  date:column(headers,aliases.date),
  description:column(headers,aliases.description),
  amount:column(headers,aliases.amount),
  debit:column(headers,aliases.debit),
  credit:column(headers,aliases.credit),
  type:column(headers,aliases.type),
  reference:column(headers,aliases.reference),
 };
}
function hasTransactionColumns(indexes:ReturnType<typeof csvIndexes>){
 return indexes.date>=0&&indexes.description>=0&&(indexes.amount>=0||(indexes.debit>=0&&indexes.credit>=0));
}
function directionFromText(value:string):"receita"|"despesa"|null{
 const text=value.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
 if(["receita","entrada","credito","credit","c"].includes(text.trim()))return "receita" as const;
 if(["despesa","saida","debito","debit","d"].includes(text.trim()))return "despesa" as const;
 return null;
}
function cleanAmount(value:string){
 return value.trim().replace(/^R\$\s*/i,"").replace(/\s/g,"").replace(/[()]/g,"");
}
function parseSignedAmount(value:string,typeHint:"receita"|"despesa"|null){
 const original=value.trim();
 const cleaned=cleanAmount(original).replace(/[CD]$/i,"");
 const negative=/^\(|^-/.test(original)||/\bD$/i.test(original);
 const amount=parseMoney(cleaned.replace(/^-/, ""));
 const type=typeHint??(negative?"despesa":"receita");
 return {amount,type};
}
function parseCsvStatement(source:string){
 const table=parseCSV(source);
 if(table.length<2)throw new Error("O arquivo precisa ter cabeçalho e ao menos uma linha de extrato.");
 const headerIndex=table.findIndex(row=>hasTransactionColumns(csvIndexes(row)));
 if(headerIndex<0)throw new Error("Associe colunas de data, descrição e valor. Também aceito débito/crédito separados.");
 const indexes=csvIndexes(table[headerIndex]);
 return table.slice(headerIndex+1).map((cells,index)=>{
  const typeHint=indexes.type>=0?directionFromText(cells[indexes.type]??""):null;
  let parsed:{amount:string;type:"receita"|"despesa"}|null=null;
  if(indexes.amount>=0&&cells[indexes.amount]){
   parsed=parseSignedAmount(cells[indexes.amount],typeHint);
  }else{
   const credit=indexes.credit>=0?cells[indexes.credit]??"":"";
   const debit=indexes.debit>=0?cells[indexes.debit]??"":"";
   if(credit.trim())parsed={amount:parseMoney(cleanAmount(credit)),type:"receita"};
   else if(debit.trim())parsed={amount:parseMoney(cleanAmount(debit)),type:"despesa"};
  }
  if(!parsed)throw new Error(`Linha ${headerIndex+index+2}: informe valor de entrada ou saída.`);
  const row=bankStatementRow.parse({
   date:normalizedDate(cells[indexes.date]??""),
   description:(cells[indexes.description]??"").trim(),
   amount:parsed.amount,
   type:parsed.type,
   reference:indexes.reference>=0?(cells[indexes.reference]??"").trim():"",
  });
  return row;
 });
}
function tag(block:string,name:string){
 const match=block.match(new RegExp(`<${name}>([^<\\r\\n]+)`,"i"));
 return match?.[1]?.trim()??"";
}
function parseOfxDate(value:string){
 const compact=value.slice(0,8);
 if(!/^\d{8}$/.test(compact))return value;
 return `${compact.slice(0,4)}-${compact.slice(4,6)}-${compact.slice(6,8)}`;
}
function parseOfxStatement(source:string){
 const blocks=source.match(/<STMTTRN>[\s\S]*?(?=<STMTTRN>|<\/BANKTRANLIST>|$)/gi)??[];
 if(!blocks.length)throw new Error("Não encontrei movimentações OFX no arquivo.");
 return blocks.map(block=>{
  const amount=parseMoney(tag(block,"TRNAMT").replace(/^-/, ""));
  const signed=tag(block,"TRNAMT");
  const description=[tag(block,"NAME"),tag(block,"MEMO")].filter(Boolean).join(" · ")||tag(block,"TRNTYPE");
  return bankStatementRow.parse({
   date:parseOfxDate(tag(block,"DTPOSTED")),
   description,
   amount,
   type:signed.trim().startsWith("-")?"despesa":"receita",
   reference:tag(block,"FITID"),
  });
 });
}
export function parseBankStatementFile(fileName:string,source:string){
 const extension=fileName.toLowerCase().split(".").pop()??"";
 const rows=extension==="ofx"||source.includes("<OFX")||source.includes("<STMTTRN>")?parseOfxStatement(source):parseCsvStatement(source);
 if(rows.length>500)throw new Error("Para extrato bancário, envie até 500 linhas por vez.");
 return rows.map(row=>({...row,recurrence_key:normalizeStatementDescription(row.description)}));
}

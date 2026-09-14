import test from 'node:test';
import assert from 'node:assert/strict';
import Decimal from 'decimal.js';
import {previewInstallments,entryFields} from '../src/lib/entries.ts';
test('centavos restantes vão para as primeiras parcelas sem alterar o total',()=>{
 const rows=previewInstallments('100.00',3,'2026-01-31');
 assert.deepEqual(rows.map(r=>r.amount),['33.34','33.33','33.33']);
 assert.equal(rows.reduce((sum,r)=>sum.plus(r.amount),new Decimal(0)).toFixed(2),'100.00');
});
test('vencimentos mantêm o dia original após mês curto e em ano bissexto',()=>{
 assert.deepEqual(previewInstallments('100',3,'2026-01-31').map(r=>r.due_date),['2026-01-31','2026-02-28','2026-03-31']);
 assert.deepEqual(previewInstallments('1',2,'2024-01-31').map(r=>r.due_date),['2024-01-31','2024-02-29']);
});
test('limites de parcelas, centavos, precisão e última data são validados',()=>{
 for(const [total,count,date] of [['0.02',3,'2026-01-01'],['1',121,'2026-01-01'],['1',1.5,'2026-01-01'],['0.001',1,'2026-01-01'],['1',2,'2199-12-31']] as const)assert.throws(()=>previewInstallments(total,count,date));
 const max=previewInstallments('9999999999999.99',120,'2026-01-01');
 assert.equal(max.reduce((sum,r)=>sum.plus(r.amount),new Decimal(0)).toFixed(2),'9999999999999.99');
});
test('parcelas não podem começar pagas',()=>{
 const entry={description:'Compra',type:'despesa',status:'paid',amount:'100',account_id:'8b5067f1-d23c-4067-bc35-eea8fcfcd9b3',category_id:'d8e7a333-04ba-4a92-b37d-a90944a21182',cost_center_id:'',competence_date:'2026-01-01',due_date:'2026-01-01',paid_date:'2026-01-01',notes:'',installments:3};
 assert.equal(entryFields.safeParse(entry).success,false);
});

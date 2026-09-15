import test from 'node:test';
import assert from 'node:assert/strict';
import {entryFields,entryFilters,entryDate,saoPauloToday,displayDate} from '../src/lib/entries.ts';
const fields={description:'Energia',type:'despesa',status:'pending',amount:'123,45',account_id:'8b5067f1-d23c-4067-bc35-eea8fcfcd9b3',category_id:'d8e7a333-04ba-4a92-b37d-a90944a21182',cost_center_id:'',competence_date:'2026-09-01',due_date:'2026-09-10',paid_date:'',notes:''};
test('competência e vencimento são datas reais e independentes',()=>{
 assert.equal(entryFields.safeParse(fields).success,true);
 assert.equal(entryDate.safeParse('2026-02-30').success,false);
 assert.equal(entryDate.safeParse('2024-02-29').success,true);
 assert.equal(entryDate.safeParse('2200-01-01').success,false);
});
test('pagamento exige data e pendência proíbe data de caixa',()=>{
 assert.equal(entryFields.safeParse({...fields,status:'paid'}).success,false);
 assert.equal(entryFields.safeParse({...fields,paid_date:'2026-09-09'}).success,false);
 assert.equal(entryFields.safeParse({...fields,status:'paid',paid_date:'2026-09-09'}).success,true);
});
test('período invertido e UUID inválido são rejeitados',()=>{
 assert.equal(entryFilters.safeParse({from:'2026-09-10',to:'2026-09-01'}).success,false);
 assert.equal(entryFilters.safeParse({account_id:'wrong'}).success,false);
 assert.equal(entryFilters.safeParse({status:'overdue'}).success,true);
});
test('hoje considera São Paulo na virada de UTC sem deslocar datas civis',()=>{
 assert.equal(saoPauloToday(new Date('2026-09-10T01:00:00Z')),'2026-09-09');
 assert.equal(saoPauloToday(new Date('2026-09-10T03:00:00Z')),'2026-09-10');
 assert.equal(displayDate('2026-09-09'),'09/09/2026');
 assert.equal(displayDate(null),'Não informada');
});

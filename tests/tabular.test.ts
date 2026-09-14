import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseCSV,normalizedNumber,normalizedDate,mappedRows} from '../src/lib/tabular.ts';
test('CSV respeita aspas, delimitadores, quebras de linha e mapeamento',()=>{const rows=parseCSV('\uFEFFpedido;sku;valor\r\nA;"SKU;1";"1.234,56"\r\nB;"nome\ncom ""aspas""";10');assert.equal(rows.length,3);assert.equal(rows[1][1],'SKU;1');assert.equal(rows[2][1],'nome\ncom "aspas"');assert.deepEqual(mappedRows(rows,{order:'0',price:'2'}),[{order:'A',price:'1.234,56'},{order:'B',price:'10'}]);assert.throws(()=>parseCSV('a,b\n"incompleto'));});
test('Datas e decimais de importação preservam os valores',()=>{assert.equal(normalizedNumber('R$ 1.234,56'),'1234.56');assert.equal(normalizedNumber('0.000001'),'0.000001');assert.equal(normalizedDate('12/09/2026'),'2026-09-12');assert.equal(normalizedDate('2026-09-12'),'2026-09-12');assert.equal(normalizedDate('45292'),'2024-01-01');});

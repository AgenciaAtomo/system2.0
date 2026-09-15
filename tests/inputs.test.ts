import {test} from "node:test";
import assert from "node:assert/strict";
import {inputDecimal,displayQuantity,displayUnitCost,compatibleUnits} from "../src/lib/inputs.ts";
test("quantidades e custos preservam seis decimais sem números binários",()=>{
 assert.equal(inputDecimal("0,000001"),"0.000001");
 assert.equal(inputDecimal("999999999999,999999"),"999999999999.999999");
 assert.equal(displayQuantity("999999999999.999999"),"999.999.999.999,999999");
 assert.equal(displayUnitCost("0.075000"),"R$ 0,075");
 assert.equal(displayQuantity("-1000.500000"),"-1.000,5");
 assert.equal(displayQuantity("0.000000"),"0");
});
test("rejeita quantidade ambígua, negativa, expoente e precisão excessiva",()=>{
 for(const value of ["1.000,20","-1","1e3","0.0000001","NaN","","1000000000000"]){assert.throws(()=>inputDecimal(value));}
});
test("unidades de compra limitadas à dimensão do material",()=>{
 assert.deepEqual(compatibleUnits("g"),["g","kg"]);
 assert.deepEqual(compatibleUnits("l"),["ml","l"]);
 assert.deepEqual(compatibleUnits("cm"),["metro","cm"]);
 assert.deepEqual(compatibleUnits("unidade"),["unidade"]);
 assert.deepEqual(compatibleUnits("inexistente"),[]);
});

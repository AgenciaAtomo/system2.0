import test from "node:test";
import assert from "node:assert/strict";
import {parseMoney,formatMoney} from "../src/lib/finance.ts";
test("Brazilian amounts preserve decimal precision",()=>{assert.equal(parseMoney("1.250,90"),"1250.90");assert.equal(parseMoney("0,01"),"0.01");assert.equal(parseMoney("-10,50"),"-10.50");assert.equal(formatMoney("9999999999999.99"),"R$ 9.999.999.999.999,99");});
test("ambiguous precision and malformed amounts are rejected",()=>{for(const value of ["1.234","1,001","NaN","1e3","10.00,90","99999999999999.00",""])assert.throws(()=>parseMoney(value));});

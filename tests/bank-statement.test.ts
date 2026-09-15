import test from "node:test";
import assert from "node:assert/strict";
import {normalizeStatementDescription,parseBankStatementFile} from "../src/lib/bank-statement.ts";

test("CSV bancário com valor assinado separa entradas e saídas",()=>{
 const rows=parseBankStatementFile("extrato.csv","Data;Descrição;Valor;Referência\n10/09/2026;PIX CLIENTE;150,90;A1\n11/09/2026;TARIFA BANCO;-12,30;A2");
 assert.equal(rows.length,2);
 assert.equal(rows[0].type,"receita");
 assert.equal(rows[0].amount,"150.90");
 assert.equal(rows[1].type,"despesa");
 assert.equal(rows[1].amount,"12.30");
});
test("CSV com colunas débito e crédito usa o lado preenchido",()=>{
 const rows=parseBankStatementFile("extrato.txt","data,descricao,debito,credito\n2026-09-12,Fornecedor,88.10,\n2026-09-13,Venda,,120.00");
 assert.deepEqual(rows.map(row=>row.type),["despesa","receita"]);
 assert.deepEqual(rows.map(row=>row.amount),["88.10","120.00"]);
});
test("OFX usa FITID, data postada e sinal do valor",()=>{
 const rows=parseBankStatementFile("extrato.ofx","<OFX><BANKTRANLIST><STMTTRN><TRNTYPE>DEBIT<DTPOSTED>20260914000000<TRNAMT>-45.67<FITID>XYZ1<NAME>Conta internet</STMTTRN></BANKTRANLIST></OFX>");
 assert.equal(rows[0].date,"2026-09-14");
 assert.equal(rows[0].type,"despesa");
 assert.equal(rows[0].reference,"XYZ1");
});
test("descrição recorrente ignora acentos, pontuação e números longos",()=>{
 assert.equal(normalizeStatementDescription("PIX Padaria São José 123456"),"pix padaria sao jose");
});

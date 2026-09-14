import test from "node:test";
import assert from "node:assert/strict";
import {validFile} from "../src/lib/files.ts";
test("uploaded content must match supported signature",()=>{
 assert.equal(validFile(new TextEncoder().encode("<script>alert(1)</script>"),"image/png"),false);
 assert.equal(validFile(new TextEncoder().encode("%PDF-1.7\nreport"),"application/pdf"),true);
 assert.equal(validFile(new Uint8Array([137,80,78,71,13,10,26,10]),"image/png"),true);
 assert.equal(validFile(new Uint8Array(10*1024*1024+1),"image/png"),false);
});

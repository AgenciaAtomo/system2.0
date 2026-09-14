import test from "node:test";
import assert from "node:assert/strict";
import {safeRedirect,credentials} from "../src/lib/validation.ts";
import {isConfigured} from "../src/lib/config.ts";
test("redirects cannot leave this origin",()=>{for(const path of ["https://evil.test","//evil.test","/\\evil.test"])assert.equal(safeRedirect(path),"/");assert.equal(safeRedirect("/settings"),"/settings");});
test("invalid login inputs are rejected before Auth",()=>{assert.equal(credentials.safeParse({email:"bad",password:"x"}).success,false);assert.equal(credentials.safeParse({email:"a@b.com",password:""}).success,false);});
test("missing configuration fails closed",()=>{const a=process.env.NEXT_PUBLIC_SUPABASE_URL,b=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;delete process.env.NEXT_PUBLIC_SUPABASE_URL;delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;assert.equal(isConfigured(),false);if(a)process.env.NEXT_PUBLIC_SUPABASE_URL=a;if(b)process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=b;});

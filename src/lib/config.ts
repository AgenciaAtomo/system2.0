import { z } from "zod";
export function getConfig() {
  return z.object({url:z.url(), key:z.string().startsWith("sb_publishable_")}).parse({
    url:process.env.NEXT_PUBLIC_SUPABASE_URL,
    key:process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  });
}
export function isConfigured() { try {getConfig();return true;} catch {return false;} }

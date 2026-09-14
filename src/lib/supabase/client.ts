"use client";
import { createBrowserClient } from "@supabase/ssr";
import { getConfig } from "@/lib/config";
import type { Database } from "@/types/database.types";
export function createClient() {const {url,key}=getConfig();return createBrowserClient<Database>(url,key);}

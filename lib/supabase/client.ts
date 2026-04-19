import { createBrowserClient } from "@supabase/ssr";

function requireEnv() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Supabase environment variables are missing.");
  }

  return { supabaseUrl, supabaseAnonKey };
}

export function createClient() {
  const { supabaseUrl, supabaseAnonKey } = requireEnv();
  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}

export function supabaseBrowser() {
  return createClient();
}

export function createBrowserSupabaseClient() {
  return createClient();
}
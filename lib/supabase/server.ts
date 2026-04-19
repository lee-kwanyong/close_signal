import { cookies } from "next/headers";
import { createServerClient, type CookieMethodsServer } from "@supabase/ssr";

function requireEnv() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Supabase environment variables are missing.");
  }

  return { supabaseUrl, supabaseAnonKey };
}

async function createCookieAdapter(): Promise<CookieMethodsServer> {
  const cookieStore = await cookies();

  return {
    getAll() {
      return cookieStore.getAll();
    },
    setAll(cookiesToSet) {
      try {
        cookiesToSet.forEach(({ name, value, options }) => {
          cookieStore.set(name, value, options);
        });
      } catch {
        // Server Component에서는 쿠키 set이 실패할 수 있으므로 무시
      }
    },
  };
}

export async function createClient() {
  const { supabaseUrl, supabaseAnonKey } = requireEnv();
  const cookieAdapter = await createCookieAdapter();

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: cookieAdapter,
  });
}

export async function supabaseServer() {
  return createClient();
}

export async function createServerSupabaseClient() {
  return createClient();
}

export async function createSupabaseServerClient() {
  return createClient();
}
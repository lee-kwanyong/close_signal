import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

type InternalUser = {
  id: string;
  authUserId: string;
  email: string | null;
  internalUserId: number | null;
  userMetadata: Record<string, unknown>;
};

function getSupabaseUrl() {
  return process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "";
}

function getSupabaseAnonKey() {
  return process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || "";
}

function createServerSupabaseWithCookies(cookieHeader: string) {
  const supabaseUrl = getSupabaseUrl();
  const supabaseAnonKey = getSupabaseAnonKey();

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Supabase environment variables are missing.");
  }

  return createSupabaseClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Cookie: cookieHeader,
      },
      fetch,
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

async function resolveAuthUser() {
  const cookieStore = await cookies();
  const supabase = createServerSupabaseWithCookies(cookieStore.toString());

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    console.error("auth.getUser error:", error);
    return null;
  }

  return { supabase, user };
}

export async function getInternalUserId(): Promise<number | null> {
  const resolved = await resolveAuthUser();
  if (!resolved?.user) return null;

  const { data, error } = await resolved.supabase.rpc("get_internal_user_id");

  if (error) {
    console.error("get_internal_user_id rpc error:", error);
    return null;
  }

  if (data === null || data === undefined) return null;

  const numeric = Number(data);
  return Number.isFinite(numeric) ? numeric : null;
}

export async function getInternalUser(): Promise<InternalUser | null> {
  const resolved = await resolveAuthUser();
  if (!resolved?.user) return null;

  const internalUserId = await getInternalUserId().catch(() => null);

  return {
    id: resolved.user.id,
    authUserId: resolved.user.id,
    email: resolved.user.email ?? null,
    internalUserId,
    userMetadata:
      resolved.user.user_metadata && typeof resolved.user.user_metadata === "object"
        ? (resolved.user.user_metadata as Record<string, unknown>)
        : {},
  };
}
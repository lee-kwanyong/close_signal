import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

function createServerSupabaseWithCookies(cookieHeader: string) {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: {
        headers: {
          Cookie: cookieHeader,
        },
      },
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    }
  );
}

export async function getInternalUserId(): Promise<number | null> {
  const cookieStore = await cookies();
  const supabase = createServerSupabaseWithCookies(cookieStore.toString());

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    console.error("auth.getUser error:", userError);
    return null;
  }

  if (!user) return null;

  const { data, error } = await supabase.rpc("get_internal_user_id");

  if (error) {
    console.error("get_internal_user_id rpc error:", error);
    return null;
  }

  if (data === null || data === undefined) return null;

  return Number(data);
}
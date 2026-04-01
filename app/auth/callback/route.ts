import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") || "/";
  const error = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");

  if (error) {
    const loginUrl = new URL("/auth/login", origin);
    loginUrl.searchParams.set("error", error);

    if (errorDescription) {
      loginUrl.searchParams.set("error_description", errorDescription);
    }

    return NextResponse.redirect(loginUrl);
  }

  if (!code) {
    return NextResponse.redirect(new URL(next, origin));
  }

  const supabase = await createClient();
  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

  if (exchangeError) {
    const loginUrl = new URL("/auth/login", origin);
    loginUrl.searchParams.set("error", "callback_failed");
    loginUrl.searchParams.set("error_description", exchangeError.message);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.redirect(new URL(next, origin));
}
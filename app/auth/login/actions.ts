"use server";

import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";

function normalizeNext(value: FormDataEntryValue | null) {
  if (typeof value !== "string") return "/";
  const next = value.trim();

  if (!next) return "/";
  if (!next.startsWith("/")) return "/";
  if (next.startsWith("//")) return "/";
  if (next === "/auth/login") return "/";

  return next;
}

function buildLoginRedirect(message: string, next: string) {
  const params = new URLSearchParams();

  if (message) params.set("error", message);
  if (next && next !== "/") params.set("next", next);

  return `/auth/login?${params.toString()}`;
}

export async function loginAction(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const next = normalizeNext(formData.get("next"));

  if (!email || !password) {
    redirect(buildLoginRedirect("이메일과 비밀번호를 입력해주세요.", next));
  }

  const supabase = await supabaseServer();

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    redirect(
      buildLoginRedirect(
        "로그인에 실패했습니다. 이메일 또는 비밀번호를 확인해주세요.",
        next
      )
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(
      buildLoginRedirect(
        "로그인은 처리되었지만 세션 확인에 실패했습니다. 다시 시도해주세요.",
        next
      )
    );
  }

  redirect(next || "/");
}
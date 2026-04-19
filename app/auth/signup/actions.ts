"use server";

import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";

function normalizeNext(value: FormDataEntryValue | null) {
  if (typeof value !== "string") return "/";
  if (!value.startsWith("/")) return "/";
  return value;
}

function makeAnonymousNickname() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let suffix = "";
  for (let i = 0; i < 6; i += 1) {
    suffix += chars[Math.floor(Math.random() * chars.length)];
  }
  return `익명_${suffix}`;
}

function extractErrorMessage(error: unknown) {
  if (!error) return "회원가입에 실패했습니다.";

  if (typeof error === "string") return error;

  if (error instanceof Error) {
    return error.message || "회원가입에 실패했습니다.";
  }

  if (typeof error === "object") {
    const maybeMessage =
      "message" in error && typeof (error as { message?: unknown }).message === "string"
        ? (error as { message: string }).message
        : "";

    if (maybeMessage) return maybeMessage;

    try {
      const json = JSON.stringify(error);
      return json && json !== "{}" ? json : "회원가입에 실패했습니다.";
    } catch {
      return "회원가입에 실패했습니다.";
    }
  }

  return "회원가입에 실패했습니다.";
}

function mapSignupErrorMessage(rawMessage: string) {
  const raw = rawMessage.toLowerCase();

  if (raw.includes("email rate limit exceeded")) {
    return "회원가입 요청이 너무 많아 잠시 제한되었습니다. 잠시 후 다시 시도해주세요.";
  }

  if (raw.includes("user already registered")) {
    return "이미 가입된 이메일입니다. 로그인으로 진행해주세요.";
  }

  if (raw.includes("database error saving new user")) {
    return "회원가입 저장 처리 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.";
  }

  if (raw.includes("password")) {
    return "비밀번호 조건을 다시 확인해주세요.";
  }

  if (raw.includes("invalid email")) {
    return "올바른 이메일 형식이 아닙니다.";
  }

  return rawMessage || "회원가입에 실패했습니다.";
}

export async function signupAction(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const passwordConfirm = String(formData.get("password_confirm") ?? "");
  const next = normalizeNext(formData.get("next"));

  if (!email || !password || !passwordConfirm) {
    redirect(
      `/auth/signup?error=${encodeURIComponent(
        "이메일, 비밀번호, 비밀번호 확인을 모두 입력해주세요."
      )}`
    );
  }

  if (password.length < 8) {
    redirect(
      `/auth/signup?error=${encodeURIComponent("비밀번호는 8자 이상이어야 합니다.")}`
    );
  }

  if (password !== passwordConfirm) {
    redirect(
      `/auth/signup?error=${encodeURIComponent("비밀번호 확인이 일치하지 않습니다.")}`
    );
  }

  const supabase = await supabaseServer();
  const nickname = makeAnonymousNickname();

  const result = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        nickname,
        display_name: nickname,
      },
    },
  });

  if (result.error) {
    const rawMessage = extractErrorMessage(result.error);
    const userMessage = mapSignupErrorMessage(rawMessage);

    console.error("[signupAction] signUp error:", result.error);

    redirect(`/auth/signup?error=${encodeURIComponent(userMessage)}`);
  }

  if (!result.data.user) {
    console.error("[signupAction] signUp returned no user:", result.data);

    redirect(
      `/auth/signup?error=${encodeURIComponent(
        "회원가입 응답이 올바르지 않습니다. 잠시 후 다시 시도해주세요."
      )}`
    );
  }

  redirect(
    `/auth/login?message=${encodeURIComponent(
      "회원가입이 완료되었습니다. 로그인해주세요."
    )}${next && next !== "/" ? `&next=${encodeURIComponent(next)}` : ""}`
  );
}
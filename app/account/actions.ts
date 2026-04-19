"use server";

import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";

function clean(value: FormDataEntryValue | null) {
  return String(value ?? "").trim();
}

export async function updateAccountAction(formData: FormData) {
  const supabase = await supabaseServer();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login?next=/account");
  }

  const fullName = clean(formData.get("fullName"));
  const username = clean(formData.get("username"));
  const phone = clean(formData.get("phone"));
  const expertTitle = clean(formData.get("expertTitle"));
  const bio = clean(formData.get("bio"));
  const isPublicExpert = formData.get("isPublicExpert") === "on";

  const nextMetadata = {
    ...(user.user_metadata ?? {}),
    full_name: fullName,
    username,
    phone,
    expert_title: expertTitle,
    bio,
    is_public_expert: isPublicExpert,
  };

  const { error } = await supabase.auth.updateUser({
    data: nextMetadata,
  });

  if (error) {
    redirect(
      `/account?error=${encodeURIComponent("계정 정보를 저장하지 못했습니다.")}`
    );
  }

  redirect(
    `/account?success=${encodeURIComponent("계정 정보가 저장되었습니다.")}`
  );
}
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getInternalUser } from "@/lib/auth/get-internal-user";

function normalizePostType(value: string) {
  if (value === "tip" || value === "report") return value;
  return "discussion";
}

export async function createPostAction(formData: FormData) {
  const internalUser = await getInternalUser();

  if (!internalUser) {
    redirect("/login");
  }

  const title = String(formData.get("title") || "").trim();
  const content = String(formData.get("content") || "").trim();
  const postType = normalizePostType(String(formData.get("post_type") || ""));
  const regionCodeRaw = String(formData.get("region_code") || "").trim();
  const categoryIdRaw = String(formData.get("category_id") || "").trim();

  if (!title || !content) {
    redirect("/community/new?error=missing_required_fields");
  }

  const regionCode = regionCodeRaw || null;
  const categoryId =
    categoryIdRaw && Number.isFinite(Number(categoryIdRaw))
      ? Number(categoryIdRaw)
      : null;

  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("posts")
    .insert({
      author_user_id: internalUser.id,
      region_code: regionCode,
      category_id: categoryId,
      title,
      content,
      post_type: postType,
    })
    .select("id")
    .single();

  if (error || !data) {
    redirect("/community/new?error=insert_failed");
  }

  revalidatePath("/community");
  if (regionCode && categoryId) {
    revalidatePath(`/regions/${regionCode}/${categoryId}`);
  }

  redirect(`/community/${data.id}`);
}

export async function createCommentAction(formData: FormData) {
  const internalUser = await getInternalUser();

  if (!internalUser) {
    redirect("/login");
  }

  const postIdRaw = String(formData.get("post_id") || "").trim();
  const content = String(formData.get("content") || "").trim();

  const postId = Number(postIdRaw);

  if (!Number.isFinite(postId) || postId <= 0 || !content) {
    redirect("/community?error=invalid_comment");
  }

  const supabase = await createSupabaseServerClient();

  const { error } = await supabase.from("post_comments").insert({
    post_id: postId,
    author_user_id: internalUser.id,
    content,
  });

  if (error) {
    redirect(`/community/${postId}?error=comment_insert_failed`);
  }

  revalidatePath(`/community/${postId}`);
  redirect(`/community/${postId}`);
}
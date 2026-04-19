"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";

function normalizeType(value?: string | null) {
  const raw = String(value || "").trim().toLowerCase();
  if (raw === "expert" || raw === "worry" || raw === "success" || raw === "story") {
    return raw;
  }
  return "story";
}

function safeString(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

async function requireOwnedPost(postId: string) {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/auth/login?next=${encodeURIComponent(`/community/post/${postId}/edit`)}`);
  }

  const { data, error } = await supabase
    .from("community_posts")
    .select("id, user_id, region_code, category_l1")
    .eq("id", postId)
    .maybeSingle();

  if (error || !data) {
    redirect("/community");
  }

  const ownerId = String(data.user_id || "");
  if (!ownerId || ownerId !== user.id) {
    redirect(`/community/post/${postId}`);
  }

  return {
    supabase,
    post: data,
  };
}

export async function updateCommunityPostAction(formData: FormData) {
  const postId = safeString(formData.get("post_id"));
  const postType = normalizeType(safeString(formData.get("post_type")));
  const category = safeString(formData.get("category"));
  const title = safeString(formData.get("title"));
  const content = safeString(formData.get("content"));

  if (!postId) {
    redirect("/community");
  }

  if (!title || !content) {
    redirect(`/community/post/${postId}/edit?error=${encodeURIComponent("제목과 내용을 입력해주세요.")}`);
  }

  const { supabase, post } = await requireOwnedPost(postId);

  const { error } = await supabase
    .from("community_posts")
    .update({
      post_type: postType,
      topic: postType,
      category,
      title,
      content,
      updated_at: new Date().toISOString(),
    })
    .eq("id", postId);

  if (error) {
    redirect(
      `/community/post/${postId}/edit?error=${encodeURIComponent(
        `글 수정에 실패했습니다. ${error.message}`,
      )}`,
    );
  }

  revalidatePath("/community");
  revalidatePath(`/community/post/${postId}`);
  revalidatePath(`/community/post/${postId}/edit`);

  const regionCode = String(post.region_code || "").trim();
  const categoryL1 = String(post.category_l1 || "").trim();

  if (regionCode) {
    revalidatePath(`/community/region/${regionCode}`);
  }

  if (regionCode && categoryL1) {
    revalidatePath(`/community/region/${regionCode}/${encodeURIComponent(categoryL1)}`);
  }

  redirect(`/community/post/${postId}`);
}

export async function deleteCommunityPostAction(formData: FormData) {
  const postId = safeString(formData.get("post_id"));

  if (!postId) {
    redirect("/community");
  }

  const { supabase, post } = await requireOwnedPost(postId);

  const { error } = await supabase.from("community_posts").delete().eq("id", postId);

  if (error) {
    redirect(
      `/community/post/${postId}/edit?error=${encodeURIComponent(
        `글 삭제에 실패했습니다. ${error.message}`,
      )}`,
    );
  }

  revalidatePath("/community");

  const regionCode = String(post.region_code || "").trim();
  const categoryL1 = String(post.category_l1 || "").trim();

  if (regionCode) {
    revalidatePath(`/community/region/${regionCode}`);
  }

  if (regionCode && categoryL1) {
    revalidatePath(`/community/region/${regionCode}/${encodeURIComponent(categoryL1)}`);
  }

  redirect("/community");
}
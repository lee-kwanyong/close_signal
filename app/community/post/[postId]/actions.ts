"use server";

import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";

export async function createCommunityCommentAction(formData: FormData) {
  const supabase = await supabaseServer();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const postId = String(formData.get("post_id") ?? "").trim();
  const content = String(formData.get("content") ?? "").trim();

  if (!user) {
    redirect(`/auth/login?next=${encodeURIComponent(`/community/post/${postId}`)}`);
  }

  if (!postId) {
    redirect("/community");
  }

  if (!content) {
    redirect(
      `/community/post/${postId}?error=${encodeURIComponent("댓글 내용을 입력해주세요.")}`
    );
  }

  const nickname =
    (typeof user.user_metadata?.nickname === "string" && user.user_metadata.nickname) ||
    (typeof user.user_metadata?.display_name === "string" && user.user_metadata.display_name) ||
    "익명사용자";

  const { error } = await supabase.from("community_comments").insert({
    post_id: postId,
    author_id: user.id,
    author_nickname: nickname,
    content,
  });

  if (error) {
    redirect(
      `/community/post/${postId}?error=${encodeURIComponent(
        "댓글 등록에 실패했습니다. community_comments 테이블과 RLS를 확인해주세요."
      )}`
    );
  }

  redirect(`/community/post/${postId}?message=${encodeURIComponent("댓글이 등록되었습니다.")}`);
}
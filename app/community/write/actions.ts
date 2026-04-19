"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import {
  buildCommunityComposeHref,
  normalizeCommunityWriteType,
} from "@/app/community/write-link";

function safeString(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

function fallbackCategoryByType(type: string) {
  switch (type) {
    case "expert":
      return "전문가에게 묻기";
    case "worry":
      return "익명 고민";
    case "success":
      return "성공사례";
    case "story":
    default:
      return "고민글";
  }
}

function buildAnonymousName(userId: string) {
  const tail = userId.replace(/-/g, "").slice(-4).toUpperCase();
  return `익명 ${tail}`;
}

export async function createCommunityPostAction(formData: FormData) {
  const postType = normalizeCommunityWriteType(safeString(formData.get("post_type")));
  const categoryInput = safeString(formData.get("category"));
  const category = categoryInput || fallbackCategoryByType(postType);

  const title = safeString(formData.get("title"));
  const content = safeString(formData.get("content"));

  const context = {
    type: postType,
    regionCode: safeString(formData.get("regionCode")),
    regionName: safeString(formData.get("regionName")),
    industryCategory: safeString(formData.get("industryCategory")),

    signalId: safeString(formData.get("signalId")),
    signalType: safeString(formData.get("signalType")),
    signalTitle: safeString(formData.get("signalTitle")),
    signalSummary: safeString(formData.get("signalSummary")),
    recommendedAction: safeString(formData.get("recommendedAction")),
    why: safeString(formData.get("why")),
    personalizedMessage: safeString(formData.get("personalizedMessage")),

    title,
    content,

    businessNumber: safeString(formData.get("businessNumber")),
    businessStatusLabel: safeString(formData.get("businessStatusLabel")),
    externalQuery: safeString(formData.get("externalQuery")),
  };

  if (!title) {
    redirect(
      buildCommunityComposeHref({
        ...context,
        error: "제목을 입력해주세요.",
      }),
    );
  }

  if (!content) {
    redirect(
      buildCommunityComposeHref({
        ...context,
        error: "내용을 입력해주세요.",
      }),
    );
  }

  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/auth/login?next=${encodeURIComponent(buildCommunityComposeHref(context))}`);
  }

  const userMeta = (user.user_metadata ?? {}) as Record<string, unknown>;
  const fullName =
    typeof userMeta.full_name === "string" ? userMeta.full_name.trim() : "";
  const username =
    typeof userMeta.username === "string" ? userMeta.username.trim() : "";
  const expertTitle =
    typeof userMeta.expert_title === "string" ? userMeta.expert_title.trim() : "";
  const isPublicExpert = userMeta.is_public_expert === true;

  const authorName = username || fullName || user.email || "사용자";
  const anonymousName =
    postType === "expert" && isPublicExpert
      ? expertTitle || authorName
      : buildAnonymousName(user.id);

  const insertPayload = {
    user_id: user.id,
    title,
    content,

    category,
    post_type: postType,
    topic: postType,

    region_code: context.regionCode || null,
    category_l1: context.industryCategory || null,

    author_name: authorName,
    anonymous_name: anonymousName,
    is_solved: false,
    popularity_score: 0,
    comment_count: 0,
  };

  const { data, error } = await supabase
    .from("community_posts")
    .insert(insertPayload)
    .select("id")
    .single();

  if (error || !data) {
    redirect(
      buildCommunityComposeHref({
        ...context,
        error: `글 저장에 실패했습니다. ${error?.message || "insert failed"}`,
      }),
    );
  }

  revalidatePath("/community");
  revalidatePath("/community/write");

  if (context.regionCode) {
    revalidatePath(`/community/region/${context.regionCode}`);
  }

  if (context.regionCode && context.industryCategory) {
    revalidatePath(
      `/community/region/${context.regionCode}/${encodeURIComponent(context.industryCategory)}`,
    );
  }

  redirect(`/community/post/${data.id}`);
}
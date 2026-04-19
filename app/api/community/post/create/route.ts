import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { normalizeCommunityWriteType } from "@/lib/community/write-link";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type CreateCommunityPostPayload = {
  title?: unknown;
  content?: unknown;
  category?: unknown;
  postType?: unknown;
  topic?: unknown;
  regionCode?: unknown;
  industryCategory?: unknown;
};

function safeString(value: unknown) {
  return typeof value === "string" ? value.trim() : String(value ?? "").trim();
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

async function readPayload(request: NextRequest): Promise<CreateCommunityPostPayload> {
  const contentType = request.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    return (await request.json()) as CreateCommunityPostPayload;
  }

  const formData = await request.formData();
  return {
    title: formData.get("title"),
    content: formData.get("content"),
    category: formData.get("category"),
    postType: formData.get("postType") ?? formData.get("post_type"),
    topic: formData.get("topic"),
    regionCode: formData.get("regionCode") ?? formData.get("region_code"),
    industryCategory: formData.get("industryCategory") ?? formData.get("category_l1"),
  };
}

export async function POST(request: NextRequest) {
  try {
    const payload = await readPayload(request);
    const postType = normalizeCommunityWriteType(
      safeString(payload.postType) || safeString(payload.topic),
    );
    const categoryInput = safeString(payload.category);
    const category = categoryInput || fallbackCategoryByType(postType);

    const title = safeString(payload.title);
    const content = safeString(payload.content);
    const regionCode = safeString(payload.regionCode);
    const industryCategory = safeString(payload.industryCategory);

    if (!title) {
      return NextResponse.json(
        { ok: false, error: "제목을 입력해주세요." },
        { status: 400 },
      );
    }

    if (!content) {
      return NextResponse.json(
        { ok: false, error: "내용을 입력해주세요." },
        { status: 400 },
      );
    }

    const supabase = await supabaseServer();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { ok: false, error: "로그인이 필요합니다." },
        { status: 401 },
      );
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
      region_code: regionCode || null,
      category_l1: industryCategory || null,
      author_name: authorName,
      anonymous_name: anonymousName,
      is_solved: false,
      popularity_score: 0,
      comment_count: 0,
    };

    const { error, data } = await supabase
      .from("community_posts")
      .insert(insertPayload)
      .select("id")
      .maybeSingle();

    if (error) {
      return NextResponse.json(
        { ok: false, error: `글 저장에 실패했습니다. ${error.message}` },
        { status: 500 },
      );
    }

    revalidatePath("/community");
    revalidatePath("/community/write");
    if (regionCode) {
      revalidatePath(`/community/region/${regionCode}`);
    }

    return NextResponse.json({
      ok: true,
      postId: data?.id ?? null,
      redirectTo: data?.id ? `/community/post/${data.id}` : "/community",
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "커뮤니티 글 생성 중 알 수 없는 오류가 발생했습니다.",
      },
      { status: 500 },
    );
  }
}
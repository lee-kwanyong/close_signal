import type { ReactNode } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { buildMonitorPrefillHref } from "@/lib/monitors/prefill-link";
import {
  buildCommunityWriteHref,
  presentRiskSignal,
  type RawRiskSignalRow,
} from "@/lib/close-signal/intel/presenter";
import { buildCommunityComposeHref } from "@/lib/community/write-link";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{
    regionCode: string;
    categoryL1: string;
  }>;
};

type CommunityPostRow = {
  id?: string | number | null;
  title?: string | null;
  body?: string | null;
  content?: string | null;
  category?: string | null;
  category_l1?: string | null;
  category_code?: string | null;
  topic?: string | null;
  region_code?: string | null;
  region_name?: string | null;
  is_solved?: boolean | null;
  author_name?: string | null;
  anonymous_name?: string | null;
  created_at?: string | null;
  popularity_score?: number | null;
  comment_count?: number | null;
};

type PresentedSignal = ReturnType<typeof presentRiskSignal>;

function text(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === "string") {
      const trimmed = value.trim();
      if (trimmed) return trimmed;
    }
    if (typeof value === "number" && Number.isFinite(value)) {
      return String(value);
    }
  }
  return "";
}

function num(value: unknown, fallback = 0) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() && !Number.isNaN(Number(value))) {
    return Number(value);
  }
  return fallback;
}

function formatNumber(value: unknown) {
  return new Intl.NumberFormat("ko-KR").format(num(value));
}

function formatScore(value: unknown) {
  const score = num(value, Number.NaN);
  if (!Number.isFinite(score)) return "-";
  return String(Math.round(score));
}

function formatDate(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function formatRelativeDate(value?: string | null) {
  if (!value) return "기록 없음";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  const diff = Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));

  if (diff <= 0) return "오늘";
  if (diff === 1) return "1일 전";
  if (diff < 7) return `${diff}일 전`;
  return formatDate(value);
}

function summarizeText(value?: string | null, limit = 140) {
  const raw = String(value || "").replace(/\s+/g, " ").trim();
  if (!raw) return "본문이 없습니다.";
  return raw.length > limit ? `${raw.slice(0, limit).trim()}…` : raw;
}

function topicLabel(value?: string | null) {
  const raw = String(value || "").toLowerCase();

  if (raw.includes("expert")) return "전문가에게 묻기";
  if (raw.includes("success")) return "성공사례";
  if (raw.includes("worry") || raw.includes("question")) return "익명 고민";
  if (raw.includes("story") || raw.includes("start")) return "고민글";

  return value || "커뮤니티";
}

function topicTone(value?: string | null) {
  const raw = String(value || "").toLowerCase();

  if (raw.includes("expert")) {
    return "border-sky-200 bg-sky-50 text-sky-700";
  }
  if (raw.includes("success")) {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }
  if (raw.includes("worry") || raw.includes("question")) {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }
  return "border-slate-200 bg-slate-50 text-slate-700";
}

function signalLabel(signalType?: string | null) {
  const raw = String(signalType || "").toLowerCase();

  if (raw.includes("closure")) return "폐업급증";
  if (raw.includes("short_lived")) return "단기소멸";
  if (raw.includes("shrink")) return "순감소";
  if (raw.includes("overheat")) return "과열진입";
  if (raw.includes("high")) return "고위험";
  if (raw.includes("alert")) return "주의";
  return "관찰";
}

function signalTone(signalType?: string | null) {
  const raw = String(signalType || "").toLowerCase();

  if (raw.includes("closure") || raw.includes("high")) {
    return "border-rose-200 bg-rose-50 text-rose-700";
  }
  if (raw.includes("short_lived") || raw.includes("shrink")) {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }
  if (raw.includes("overheat")) {
    return "border-violet-200 bg-violet-50 text-violet-700";
  }
  return "border-sky-200 bg-sky-50 text-sky-700";
}

function scoreTone(score?: number | null) {
  const value = score ?? null;
  if (value == null || !Number.isFinite(value)) {
    return "border-slate-200 bg-slate-50 text-slate-600";
  }
  if (value >= 80) return "border-rose-200 bg-rose-50 text-rose-700";
  if (value >= 60) return "border-amber-200 bg-amber-50 text-amber-700";
  if (value >= 40) return "border-sky-200 bg-sky-50 text-sky-700";
  return "border-emerald-200 bg-emerald-50 text-emerald-700";
}

function displayPostAuthor(post: CommunityPostRow) {
  return text(post.anonymous_name, post.author_name, "익명 사용자");
}

function categoryText(post: CommunityPostRow) {
  return text(post.category_l1, post.category_code, post.category);
}

function categoryMatches(a?: unknown, b?: unknown) {
  const left = String(a ?? "").trim().toLowerCase();
  const right = String(b ?? "").trim().toLowerCase();

  if (!left || !right) return false;
  return left.includes(right) || right.includes(left);
}

function findMatchedSignal(signals: PresentedSignal[], categoryName: string) {
  return (
    signals.find(
      (signal) =>
        categoryMatches(categoryName, signal.categoryName) ||
        categoryMatches(categoryName, signal.categoryId),
    ) || signals[0] || null
  );
}

function loginAwareHref(href: string, isLoggedIn: boolean) {
  return isLoggedIn ? href : `/auth/login?next=${encodeURIComponent(href)}`;
}

function buildSignalWriteHref(signal: PresentedSignal) {
  return buildCommunityWriteHref(signal);
}

function buildCategoryWriteHref(
  regionCode: string,
  regionName: string,
  categoryName: string,
  signal?: PresentedSignal | null,
) {
  if (signal) return buildSignalWriteHref(signal);

  return buildCommunityComposeHref({
    type: "story",
    regionCode,
    regionName,
    industryCategory: categoryName,
    externalQuery: [regionName, categoryName].filter(Boolean).join(" "),
  });
}

function buildPostFollowupHref(
  post: CommunityPostRow,
  signal: PresentedSignal | null,
  regionName: string,
  categoryName: string,
) {
  return buildCommunityComposeHref({
    topic: post.topic || undefined,
    regionCode: text(post.region_code),
    regionName: text(post.region_name, regionName),
    industryCategory: text(post.category_l1, post.category_code, categoryName),
    title: post.title ? `[후속] ${post.title}` : "",
    signalId: signal?.id == null ? "" : String(signal.id),
    signalType: signal?.signalType || "",
    signalTitle: signal?.title || "",
    signalSummary: signal?.summary || "",
    recommendedAction: signal?.action || "",
    why: signal?.why || "",
    personalizedMessage: signal?.personalization || "",
    externalQuery: [
      text(post.region_name, regionName),
      text(post.category_l1, post.category_code, categoryName),
    ]
      .filter(Boolean)
      .join(" "),
  });
}

function suggestedStage(signal: PresentedSignal | null) {
  if (!signal) return "observe";
  if (signal.riskGrade === "critical") return "urgent";
  if (signal.riskGrade === "high") return "urgent";
  if ((signal.riskScore ?? 0) >= 60) return "caution";
  return "observe";
}

function buildMonitorHref(
  signal: PresentedSignal | null,
  regionCode: string,
  regionName: string,
  categoryName: string,
  isLoggedIn: boolean,
) {
  const href = buildMonitorPrefillHref({
    from: "community_category",
    businessName: signal?.title || `${regionName} ${categoryName}`,
    regionCode: signal?.regionCode || regionCode,
    regionName: signal?.regionName || regionName,
    categoryId: signal?.categoryId || undefined,
    categoryName: signal?.categoryName || categoryName,
    query: [signal?.regionName || regionName, signal?.categoryName || categoryName]
      .filter(Boolean)
      .join(" "),
    stage: suggestedStage(signal),
    reason: signal?.signalType || signal?.riskGrade || "community_category",
    score: signal?.riskScore || undefined,
    trendKeywords: [regionName, categoryName, signal?.signalTypeLabel].filter(
      Boolean,
    ) as string[],
  });

  return loginAwareHref(href, isLoggedIn);
}

function priorityLabel(post: CommunityPostRow, signal: PresentedSignal | null) {
  if (!post.is_solved && (signal?.riskGrade === "critical" || signal?.riskGrade === "high")) {
    return {
      text: "바로 보기",
      tone: "border-rose-200 bg-rose-50 text-rose-700",
    };
  }

  if (!post.is_solved || (signal?.riskScore ?? 0) >= 60) {
    return {
      text: "오늘 확인",
      tone: "border-amber-200 bg-amber-50 text-amber-700",
    };
  }

  return {
    text: "관찰",
    tone: "border-sky-200 bg-sky-50 text-sky-700",
  };
}

function SectionCard({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_12px_30px_rgba(15,23,42,0.04)] sm:p-6">
      <div>
        <div className="text-[11px] font-black uppercase tracking-[0.18em] text-emerald-700">
          {eyebrow}
        </div>
        <h2 className="mt-2 text-xl font-black tracking-[-0.03em] text-slate-950 sm:text-2xl">
          {title}
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function SummaryCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="rounded-[22px] border border-slate-200 bg-white p-4 shadow-sm">
      <div className="text-xs font-semibold text-slate-500">{label}</div>
      <div className="mt-2 text-2xl font-black tracking-[-0.04em] text-slate-950">{value}</div>
      <div className="mt-1 text-xs text-slate-500">{hint}</div>
    </div>
  );
}

function EmptyPanel({ text }: { text: string }) {
  return (
    <div className="rounded-[22px] border border-dashed border-slate-300 bg-slate-50 px-5 py-10 text-center text-sm text-slate-500">
      {text}
    </div>
  );
}

export default async function CategoryCommunityPage({ params }: PageProps) {
  const { regionCode, categoryL1 } = await params;
  const supabase = await supabaseServer();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [postsRes, signalsRes] = await Promise.all([
    supabase
      .from("v_community_posts_latest")
      .select("*")
      .eq("region_code", regionCode)
      .or(`category_l1.eq.${categoryL1},category_code.eq.${categoryL1}`)
      .order("created_at", { ascending: false })
      .limit(60),

    supabase
      .from("v_risk_signals_feed")
      .select("*")
      .eq("region_code", regionCode)
      .or(`category_code.eq.${categoryL1},category_name.eq.${categoryL1}`)
      .order("signal_date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(8),
  ]);

  if (postsRes.error) {
    throw new Error(`v_community_posts_latest 조회 실패: ${postsRes.error.message}`);
  }

  if (signalsRes.error) {
    throw new Error(`v_risk_signals_feed 조회 실패: ${signalsRes.error.message}`);
  }

  const posts = ((postsRes.data ?? []) as CommunityPostRow[]).sort((a, b) => {
    const aSolved = a.is_solved ? 1 : 0;
    const bSolved = b.is_solved ? 1 : 0;
    if (aSolved !== bSolved) return aSolved - bSolved;

    const popGap = num(b.popularity_score) - num(a.popularity_score);
    if (popGap !== 0) return popGap;

    const commentGap = num(b.comment_count) - num(a.comment_count);
    if (commentGap !== 0) return commentGap;

    const aTime = new Date(a.created_at || "").getTime();
    const bTime = new Date(b.created_at || "").getTime();
    return bTime - aTime;
  });

  const signals = ((signalsRes.data ?? []) as RawRiskSignalRow[])
    .map((row) => {
      try {
        return presentRiskSignal(row);
      } catch {
        return null;
      }
    })
    .filter((item): item is PresentedSignal => item !== null);

  const regionName =
    text(posts[0]?.region_name, signals[0]?.regionName, regionCode) || regionCode;

  const categoryName =
    text(
      posts[0]?.category_l1,
      posts[0]?.category_code,
      signals[0]?.categoryName,
      categoryL1,
    ) || categoryL1;

  if (!posts.length && !signals.length) {
    notFound();
  }

  const matchedSignal = findMatchedSignal(signals, categoryName);
  const writeHref = loginAwareHref(
    buildCategoryWriteHref(regionCode, regionName, categoryName, matchedSignal),
    Boolean(user),
  );
  const monitorHref = buildMonitorHref(
    matchedSignal,
    regionCode,
    regionName,
    categoryName,
    Boolean(user),
  );

  const solvedCount = posts.filter((post) => post.is_solved).length;
  const openCount = posts.length - solvedCount;
  const totalComments = posts.reduce((sum, post) => sum + num(post.comment_count), 0);
  const urgentSignalCount = signals.filter(
    (signal) =>
      signal.riskGrade === "critical" ||
      signal.riskGrade === "high" ||
      (signal.riskScore ?? 0) >= 70,
  ).length;

  const whySummary =
    matchedSignal?.why ||
    `${regionName} · ${categoryName}에서 미해결 글과 위험 신호를 함께 보고, 어떤 글부터 읽고 어떤 액션으로 넘길지 바로 판단할 수 있게 정리했습니다.`;

  const actionSummary =
    matchedSignal?.action ||
    "미해결 글부터 확인하고, 필요하면 후속 글을 남기거나 모니터 인테이크로 바로 넘기세요.";

  const solvedPosts = posts.filter((post) => post.is_solved).slice(0, 3);

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(187,247,208,0.24),transparent_32%),linear-gradient(to_bottom,#ffffff,#fbfffd)] text-slate-900">
      <section className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        <div className="space-y-5">
          <section className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-[0_14px_34px_rgba(15,23,42,0.05)] sm:p-6">
            <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px] xl:items-start">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    href={`/community/region/${encodeURIComponent(regionCode)}`}
                    className="inline-flex h-8 items-center rounded-full border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
                  >
                    ← {regionName} 커뮤니티
                  </Link>

                  <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                    CATEGORY COMMUNITY
                  </span>

                  {matchedSignal ? (
                    <span
                      className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${signalTone(
                        matchedSignal.signalType,
                      )}`}
                    >
                      {signalLabel(matchedSignal.signalType)}
                    </span>
                  ) : null}

                  <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-500">
                    {formatRelativeDate(matchedSignal?.createdAt || posts[0]?.created_at)}
                  </span>
                </div>

                <h1 className="mt-4 text-2xl font-black tracking-[-0.05em] text-slate-950 sm:text-4xl">
                  {regionName} · {categoryName}
                </h1>

                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <div className="rounded-[22px] border border-rose-200 bg-rose-50/70 p-4">
                    <div className="text-[11px] font-black uppercase tracking-[0.14em] text-rose-700">
                      왜 지금 봐야 하나
                    </div>
                    <p className="mt-2 text-sm leading-7 text-slate-700">{whySummary}</p>
                  </div>

                  <div className="rounded-[22px] border border-emerald-200 bg-emerald-50/70 p-4">
                    <div className="text-[11px] font-black uppercase tracking-[0.14em] text-emerald-700">
                      바로 할 액션
                    </div>
                    <p className="mt-2 text-sm leading-7 text-slate-700">{actionSummary}</p>
                  </div>
                </div>

                {matchedSignal ? (
                  <div className="mt-3 rounded-[22px] border border-slate-200 bg-slate-50/70 px-4 py-3 text-sm leading-6 text-slate-600">
                    <span className="font-semibold text-slate-900">연결된 대표 시그널</span>
                    <span className="ml-2">
                      {matchedSignal.title || matchedSignal.summary || "최근 위험 시그널이 감지되었습니다."}
                    </span>
                  </div>
                ) : null}
              </div>

              <aside className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <SummaryCard
                    label="글 수"
                    value={formatNumber(posts.length)}
                    hint="전체 업종 글"
                  />
                  <SummaryCard
                    label="미해결"
                    value={formatNumber(openCount)}
                    hint="먼저 볼 글"
                  />
                  <SummaryCard
                    label="댓글"
                    value={formatNumber(totalComments)}
                    hint="누적 댓글 수"
                  />
                  <SummaryCard
                    label="긴급 신호"
                    value={formatNumber(urgentSignalCount)}
                    hint="고위험 연결 신호"
                  />
                </div>

                <div className="grid gap-3">
                  <Link
                    href={writeHref}
                    className="block rounded-[20px] border border-emerald-300 bg-emerald-50 p-4 text-emerald-800 transition hover:bg-emerald-100"
                  >
                    <div className="text-sm font-black">글 쓰기</div>
                    <p className="mt-2 text-sm leading-6 opacity-90">
                      이 업종 문맥과 최근 신호를 담아 바로 질문이나 고민글을 남깁니다.
                    </p>
                  </Link>

                  <Link
                    href={monitorHref}
                    className="block rounded-[20px] border border-slate-200 bg-white p-4 text-slate-800 transition hover:bg-slate-50"
                  >
                    <div className="text-sm font-black">모니터 인테이크</div>
                    <p className="mt-2 text-sm leading-6 opacity-90">
                      커뮤니티에서 본 흐름을 운영 대상으로 바로 넘깁니다.
                    </p>
                  </Link>

                  <Link
                    href={`/signals?q=${encodeURIComponent(`${regionName} ${categoryName}`.trim())}`}
                    className="block rounded-[20px] border border-slate-200 bg-white p-4 text-slate-800 transition hover:bg-slate-50"
                  >
                    <div className="text-sm font-black">관련 시그널 보기</div>
                    <p className="mt-2 text-sm leading-6 opacity-90">
                      같은 지역·업종 조합의 최근 위험 신호를 먼저 확인합니다.
                    </p>
                  </Link>
                </div>
              </aside>
            </div>
          </section>

          <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
            <div className="space-y-5">
              <SectionCard
                eyebrow="Action Queue"
                title="지금 먼저 볼 글"
                description="미해결 여부와 연결된 위험 신호를 기준으로 먼저 볼 글을 위로 올렸습니다."
              >
                <div className="space-y-3">
                  {posts.length > 0 ? (
                    posts.map((post) => {
                      const postSignal =
                        signals.find(
                          (signal) =>
                            categoryMatches(categoryText(post), signal.categoryName) ||
                            categoryMatches(categoryText(post), signal.categoryId),
                        ) || matchedSignal;

                      const priority = priorityLabel(post, postSignal);

                      return (
                        <article
                          key={String(post.id)}
                          className="rounded-[22px] border border-slate-200 bg-slate-50/70 p-4"
                        >
                          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <span
                                  className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${priority.tone}`}
                                >
                                  {priority.text}
                                </span>

                                <span
                                  className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${topicTone(
                                    post.topic,
                                  )}`}
                                >
                                  {topicLabel(post.topic)}
                                </span>

                                {postSignal ? (
                                  <span
                                    className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${signalTone(
                                      postSignal.signalType,
                                    )}`}
                                  >
                                    {signalLabel(postSignal.signalType)}
                                  </span>
                                ) : null}

                                {post.is_solved ? (
                                  <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
                                    해결됨
                                  </span>
                                ) : null}

                                <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-500">
                                  {formatRelativeDate(post.created_at)}
                                </span>
                              </div>

                              <h3 className="mt-3 text-lg font-black tracking-[-0.02em] text-slate-950">
                                {text(post.title, "제목 없음")}
                              </h3>

                              <p className="mt-2 text-sm leading-6 text-slate-600">
                                {summarizeText(text(post.body, post.content))}
                              </p>

                              <div className="mt-3 flex flex-wrap gap-2">
                                <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-600">
                                  {categoryText(post) || categoryName}
                                </span>
                                <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-600">
                                  {displayPostAuthor(post)}
                                </span>
                                <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-600">
                                  댓글 {formatNumber(post.comment_count)}
                                </span>
                                <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-600">
                                  관심도 {formatNumber(post.popularity_score)}
                                </span>
                              </div>

                              {postSignal ? (
                                <div className="mt-3 rounded-2xl border border-emerald-100 bg-emerald-50/70 px-3 py-2 text-sm text-slate-700">
                                  <span className="font-semibold text-emerald-700">연결 신호</span>
                                  <span className="ml-2">
                                    {postSignal.why || postSignal.summary || postSignal.title}
                                  </span>
                                </div>
                              ) : null}
                            </div>

                            <div className="grid grid-cols-2 gap-2 xl:w-[248px] xl:grid-cols-1">
                              <Link
                                href={`/community/post/${encodeURIComponent(String(post.id))}`}
                                className="inline-flex h-10 items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                              >
                                글 보기
                              </Link>

                              <Link
                                href={loginAwareHref(
                                  buildPostFollowupHref(post, postSignal, regionName, categoryName),
                                  Boolean(user),
                                )}
                                className="inline-flex h-10 items-center justify-center rounded-2xl border border-emerald-300 bg-emerald-50 px-4 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100"
                              >
                                후속 글 쓰기
                              </Link>
                            </div>
                          </div>
                        </article>
                      );
                    })
                  ) : (
                    <EmptyPanel text="아직 등록된 글이 없습니다." />
                  )}
                </div>
              </SectionCard>
            </div>

            <aside className="space-y-5">
              <SectionCard
                eyebrow="Linked Signals"
                title="연결된 시그널"
                description="글만 보지 않고 같은 업종에 붙은 최근 위험 신호도 같이 봅니다."
              >
                <div className="space-y-3">
                  {signals.length > 0 ? (
                    signals.map((signal) => (
                      <article
                        key={String(signal.id)}
                        className="rounded-[20px] border border-slate-200 bg-slate-50/70 p-4"
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${signalTone(
                              signal.signalType,
                            )}`}
                          >
                            {signalLabel(signal.signalType)}
                          </span>
                          <span
                            className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${signal.riskGradeTone}`}
                          >
                            {signal.riskGradeLabel}
                          </span>
                          <span
                            className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${scoreTone(
                              signal.riskScore,
                            )}`}
                          >
                            위험 {formatScore(signal.riskScore)}
                          </span>
                        </div>

                        <div className="mt-3 text-sm font-black text-slate-950">
                          {signal.title || signal.summary || "최근 위험 시그널이 감지되었습니다."}
                        </div>

                        <p className="mt-2 text-sm leading-6 text-slate-600">
                          {signal.why || signal.summary}
                        </p>

                        <div className="mt-3 flex flex-wrap gap-2">
                          <Link
                            href={`/signals/${encodeURIComponent(String(signal.id))}`}
                            className="inline-flex h-9 items-center rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                          >
                            상세 보기
                          </Link>
                          <Link
                            href={loginAwareHref(buildSignalWriteHref(signal), Boolean(user))}
                            className="inline-flex h-9 items-center rounded-xl border border-emerald-300 bg-emerald-50 px-3 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100"
                          >
                            질문으로 연결
                          </Link>
                        </div>
                      </article>
                    ))
                  ) : (
                    <EmptyPanel text="연결된 위험 신호가 없습니다." />
                  )}
                </div>
              </SectionCard>

              <SectionCard
                eyebrow="Resolved"
                title="최근 해결된 글"
                description="무엇이 해결됐는지 짧게 보고 재사용할 맥락을 찾습니다."
              >
                <div className="space-y-3">
                  {solvedPosts.length > 0 ? (
                    solvedPosts.map((post) => (
                      <article
                        key={`solved-${String(post.id)}`}
                        className="rounded-[20px] border border-slate-200 bg-slate-50/70 p-4"
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
                            해결됨
                          </span>
                          <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] text-slate-500">
                            {formatRelativeDate(post.created_at)}
                          </span>
                        </div>

                        <div className="mt-3 text-sm font-black text-slate-950">
                          {text(post.title, "제목 없음")}
                        </div>

                        <p className="mt-2 text-sm leading-6 text-slate-600">
                          {summarizeText(text(post.body, post.content), 96)}
                        </p>
                      </article>
                    ))
                  ) : (
                    <EmptyPanel text="해결된 글이 아직 없습니다." />
                  )}
                </div>
              </SectionCard>

              <SectionCard
                eyebrow="Quick Check"
                title="지금 보는 기준"
                description="이 화면도 액션 판단용으로 먼저 보이게 맞췄습니다."
              >
                <div className="space-y-3 text-sm leading-6 text-slate-600">
                  <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3">
                    미해결 글 + 고위험 신호 조합이 가장 먼저 올라옵니다.
                  </div>
                  <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
                    글만 많으면 문맥 확인, 신호까지 있으면 오늘 안에 개입 검토입니다.
                  </div>
                  <div className="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3">
                    후속 글은 같은 지역·업종 키워드를 유지하는 쪽이 이후 연결이 쉽습니다.
                  </div>
                </div>
              </SectionCard>
            </aside>
          </div>
        </div>
      </section>
    </main>
  );
}
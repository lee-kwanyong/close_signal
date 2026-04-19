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
  }>;
};

type CommunityPostRow = {
  id?: string | number | null;
  title?: string | null;
  body?: string | null;
  content?: string | null;
  topic?: string | null;
  category?: string | null;
  category_l1?: string | null;
  category_code?: string | null;
  region_code?: string | null;
  region_name?: string | null;
  author_name?: string | null;
  anonymous_name?: string | null;
  is_solved?: boolean | null;
  created_at?: string | null;
  popularity_score?: number | null;
  comment_count?: number | null;
};

type PresentedSignal = ReturnType<typeof presentRiskSignal>;

type CategoryBucket = {
  key: string;
  name: string;
  postCount: number;
  solvedCount: number;
  unsolvedCount: number;
  signalCount: number;
  latestPost: CommunityPostRow | null;
  matchedSignal: PresentedSignal | null;
  priority: "hot" | "active" | "watch";
};

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

function priorityTone(priority: CategoryBucket["priority"]) {
  if (priority === "hot") return "border-rose-200 bg-rose-50 text-rose-700";
  if (priority === "active") return "border-amber-200 bg-amber-50 text-amber-700";
  return "border-sky-200 bg-sky-50 text-sky-700";
}

function priorityLabel(priority: CategoryBucket["priority"]) {
  if (priority === "hot") return "바로 보기";
  if (priority === "active") return "오늘 확인";
  return "관찰";
}

function displayPostAuthor(post: CommunityPostRow) {
  return text(post.anonymous_name, post.author_name, "익명 사용자");
}

function categoryText(post: CommunityPostRow) {
  return text(post.category_l1, post.category_code, post.category) || "미분류";
}

function normalizeToken(value?: unknown) {
  return String(value ?? "").trim().toLowerCase();
}

function categoryMatches(a?: unknown, b?: unknown) {
  const left = normalizeToken(a);
  const right = normalizeToken(b);

  if (!left || !right) return false;
  return left.includes(right) || right.includes(left);
}

function loginAwareHref(href: string, isLoggedIn: boolean) {
  return isLoggedIn ? href : `/auth/login?next=${encodeURIComponent(href)}`;
}

function buildSignalWriteHref(signal: PresentedSignal) {
  return buildCommunityWriteHref(signal);
}

function buildRegionWriteHref(
  regionCode: string,
  regionName: string,
  signal?: PresentedSignal | null,
) {
  if (signal) return buildSignalWriteHref(signal);

  return buildCommunityComposeHref({
    type: "story",
    regionCode,
    regionName,
    externalQuery: regionName,
  });
}

function buildPostFollowupHref(
  post: CommunityPostRow,
  signal: PresentedSignal | null,
  regionName: string,
) {
  return buildCommunityComposeHref({
    topic: post.topic || undefined,
    regionCode: text(post.region_code),
    regionName: text(post.region_name, regionName),
    industryCategory: categoryText(post),
    title: post.title ? `[후속] ${post.title}` : "",
    signalId: signal?.id == null ? "" : String(signal.id),
    signalType: signal?.signalType || "",
    signalTitle: signal?.title || "",
    signalSummary: signal?.summary || "",
    recommendedAction: signal?.action || "",
    why: signal?.why || "",
    personalizedMessage: signal?.personalization || "",
    externalQuery: [text(post.region_name, regionName), categoryText(post)]
      .filter(Boolean)
      .join(" "),
  });
}

function buildMonitorHref(
  signal: PresentedSignal | null,
  regionCode: string,
  regionName: string,
  isLoggedIn: boolean,
) {
  const href = buildMonitorPrefillHref({
    from: "community_region",
    businessName: signal?.title || regionName,
    regionCode: signal?.regionCode || regionCode,
    regionName: signal?.regionName || regionName,
    categoryId: signal?.categoryId || undefined,
    categoryName: signal?.categoryName || undefined,
    query: [signal?.regionName || regionName, signal?.categoryName]
      .filter(Boolean)
      .join(" "),
    stage:
      signal?.riskGrade === "critical" || signal?.riskGrade === "high"
        ? "urgent"
        : signal?.riskScore && signal.riskScore >= 60
          ? "caution"
          : "observe",
    reason: signal?.signalType || signal?.riskGrade || "community_region",
    score: signal?.riskScore || undefined,
  });

  return loginAwareHref(href, isLoggedIn);
}

function sectionSignalText(signal: PresentedSignal) {
  return signal.title || signal.summary || "최근 위험 시그널이 감지되었습니다.";
}

function sectionSignalWhy(signal: PresentedSignal) {
  return signal.why || signal.summary || "현장 변화 흐름을 더 확인할 필요가 있습니다.";
}

function signalRiskBadge(signal: PresentedSignal) {
  return signal.riskScore != null ? `위험 ${Math.round(signal.riskScore)}` : signal.riskGradeLabel;
}

function categoryRouteHref(regionCode: string, categoryKey: string) {
  return `/community/region/${encodeURIComponent(regionCode)}/${encodeURIComponent(categoryKey)}`;
}

function buildBuckets(
  regionCode: string,
  posts: CommunityPostRow[],
  signals: PresentedSignal[],
): CategoryBucket[] {
  const map = new Map<string, CategoryBucket>();

  function ensureBucket(key: string, name: string) {
    const existing = map.get(key);
    if (existing) return existing;

    const created: CategoryBucket = {
      key,
      name: name || "미분류",
      postCount: 0,
      solvedCount: 0,
      unsolvedCount: 0,
      signalCount: 0,
      latestPost: null,
      matchedSignal: null,
      priority: "watch",
    };

    map.set(key, created);
    return created;
  }

  for (const post of posts) {
    const key = text(post.category_code, post.category_l1, post.category);
    if (!key) continue;

    const bucket = ensureBucket(key, categoryText(post));
    bucket.postCount += 1;
    bucket.solvedCount += post.is_solved ? 1 : 0;
    bucket.unsolvedCount += post.is_solved ? 0 : 1;

    if (!bucket.latestPost) {
      bucket.latestPost = post;
    }
  }

  for (const signal of signals) {
    const key = text(signal.categoryId, signal.categoryName);
    if (!key) continue;

    const bucket = ensureBucket(key, text(signal.categoryName, signal.categoryId, "미분류"));
    bucket.signalCount += 1;

    if (!bucket.matchedSignal) {
      bucket.matchedSignal = signal;
    }
  }

  const buckets = Array.from(map.values()).map((bucket) => {
    let matchedSignal = bucket.matchedSignal;

    if (!matchedSignal) {
      matchedSignal =
        signals.find(
          (signal) =>
            categoryMatches(bucket.name, signal.categoryName) ||
            categoryMatches(bucket.key, signal.categoryId) ||
            categoryMatches(bucket.key, signal.categoryName),
        ) || null;
    }

    const priority: CategoryBucket["priority"] =
      matchedSignal && (matchedSignal.riskGrade === "critical" || matchedSignal.riskGrade === "high")
        ? "hot"
        : bucket.unsolvedCount >= 3 || (matchedSignal?.riskScore ?? 0) >= 70
          ? "hot"
          : bucket.signalCount > 0 || bucket.postCount >= 2
            ? "active"
            : "watch";

    return {
      ...bucket,
      matchedSignal,
      priority,
    };
  });

  return buckets.sort((a, b) => {
    const order = { hot: 0, active: 1, watch: 2 };
    if (order[a.priority] !== order[b.priority]) {
      return order[a.priority] - order[b.priority];
    }

    const aSignalScore = a.matchedSignal?.riskScore ?? -1;
    const bSignalScore = b.matchedSignal?.riskScore ?? -1;
    if (bSignalScore !== aSignalScore) {
      return bSignalScore - aSignalScore;
    }

    if (b.unsolvedCount !== a.unsolvedCount) {
      return b.unsolvedCount - a.unsolvedCount;
    }

    if (b.postCount !== a.postCount) {
      return b.postCount - a.postCount;
    }

    return a.name.localeCompare(b.name, "ko");
  });
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

export default async function CommunityRegionPage({ params }: PageProps) {
  const { regionCode } = await params;
  const supabase = await supabaseServer();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [postsRes, signalsRes] = await Promise.all([
    supabase
      .from("v_community_posts_latest")
      .select("*")
      .eq("region_code", regionCode)
      .order("created_at", { ascending: false })
      .limit(80),
    supabase
      .from("v_risk_signals_feed")
      .select("*")
      .eq("region_code", regionCode)
      .order("signal_date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(16),
  ]);

  if (postsRes.error) {
    throw new Error(`v_community_posts_latest 조회 실패: ${postsRes.error.message}`);
  }

  if (signalsRes.error) {
    throw new Error(`v_risk_signals_feed 조회 실패: ${signalsRes.error.message}`);
  }

  const posts = ((postsRes.data ?? []) as CommunityPostRow[]).sort((a, b) => {
    const aScore = num(a.popularity_score);
    const bScore = num(b.popularity_score);
    if (aScore !== bScore) return bScore - aScore;

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

  if (posts.length === 0 && signals.length === 0) {
    notFound();
  }

  const regionName = text(posts[0]?.region_name, signals[0]?.regionName, regionCode) || regionCode;

  const featuredSignal = signals[0] ?? null;
  const buckets = buildBuckets(regionCode, posts, signals);

  const solvedCount = posts.filter((post) => post.is_solved).length;
  const totalComments = posts.reduce((sum, post) => sum + num(post.comment_count), 0);
  const expertPostCount = posts.filter((post) =>
    String(post.topic || "").toLowerCase().includes("expert"),
  ).length;
  const activeSignalCount = signals.filter(
    (signal) =>
      signal.riskGrade === "high" ||
      signal.riskGrade === "critical" ||
      (signal.riskScore ?? 0) >= 70,
  ).length;

  const whySummary =
    featuredSignal?.why ||
    `${regionName}에서 올라온 질문과 현장 맥락을 한곳에서 보고, 어떤 업종을 먼저 봐야 하는지 판단할 수 있는 지역 커뮤니티입니다.`;

  const actionSummary =
    featuredSignal?.action ||
    "최근 글과 신호를 같이 읽고, 필요한 경우 후속 글을 남기거나 모니터 인테이크로 바로 연결하세요.";

  const writeHref = loginAwareHref(
    buildRegionWriteHref(regionCode, regionName, featuredSignal),
    Boolean(user),
  );

  const monitorHref = buildMonitorHref(featuredSignal, regionCode, regionName, Boolean(user));

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(187,247,208,0.24),transparent_32%),linear-gradient(to_bottom,#ffffff,#fbfffd)] text-slate-900">
      <section className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        <div className="space-y-5">
          <section className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-[0_14px_34px_rgba(15,23,42,0.05)] sm:p-6">
            <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px] xl:items-start">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    href="/community"
                    className="inline-flex h-8 items-center rounded-full border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
                  >
                    ← 전체 커뮤니티
                  </Link>

                  <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                    REGION COMMUNITY
                  </span>

                  {featuredSignal ? (
                    <span
                      className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${signalTone(
                        featuredSignal.signalType,
                      )}`}
                    >
                      {signalLabel(featuredSignal.signalType)}
                    </span>
                  ) : null}

                  <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-500">
                    {formatRelativeDate(featuredSignal?.createdAt || posts[0]?.created_at)}
                  </span>
                </div>

                <h1 className="mt-4 text-2xl font-black tracking-[-0.05em] text-slate-950 sm:text-4xl">
                  {regionName} 지역 커뮤니티
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

                {featuredSignal ? (
                  <div className="mt-3 rounded-[22px] border border-slate-200 bg-slate-50/70 px-4 py-3 text-sm leading-6 text-slate-600">
                    <span className="font-semibold text-slate-900">대표 시그널</span>
                    <span className="ml-2">{sectionSignalText(featuredSignal)}</span>
                  </div>
                ) : null}
              </div>

              <aside className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <SummaryCard
                    label="글 수"
                    value={formatNumber(posts.length)}
                    hint="지역 커뮤니티 전체 글"
                  />
                  <SummaryCard
                    label="해결됨"
                    value={formatNumber(solvedCount)}
                    hint="해결 표시된 글"
                  />
                  <SummaryCard
                    label="댓글"
                    value={formatNumber(totalComments)}
                    hint="누적 댓글 수"
                  />
                  <SummaryCard
                    label="긴급 신호"
                    value={formatNumber(activeSignalCount)}
                    hint="고위험 또는 70점 이상"
                  />
                </div>

                <div className="grid gap-3">
                  <Link
                    href={writeHref}
                    className="block rounded-[20px] border border-emerald-300 bg-emerald-50 p-4 text-emerald-800 transition hover:bg-emerald-100"
                  >
                    <div className="text-sm font-black">지역 글 쓰기</div>
                    <p className="mt-2 text-sm leading-6 opacity-90">
                      지역 맥락과 최근 신호를 담아 바로 질문이나 고민글을 남깁니다.
                    </p>
                  </Link>

                  <Link
                    href={monitorHref}
                    className="block rounded-[20px] border border-slate-200 bg-white p-4 text-slate-800 transition hover:bg-slate-50"
                  >
                    <div className="text-sm font-black">모니터 인테이크</div>
                    <p className="mt-2 text-sm leading-6 opacity-90">
                      커뮤니티에서 본 위험 흐름을 운영 대상으로 바로 넘깁니다.
                    </p>
                  </Link>

                  <Link
                    href={`/regions/${encodeURIComponent(regionCode)}`}
                    className="block rounded-[20px] border border-slate-200 bg-white p-4 text-slate-800 transition hover:bg-slate-50"
                  >
                    <div className="text-sm font-black">지역 상세 보기</div>
                    <p className="mt-2 text-sm leading-6 opacity-90">
                      지역 위험도와 업종 큐를 다시 확인합니다.
                    </p>
                  </Link>
                </div>
              </aside>
            </div>
          </section>

          <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
            <div className="space-y-5">
              <SectionCard
                eyebrow="Recent Posts"
                title="지금 많이 읽히는 글"
                description="질문, 고민, 성공사례를 인기와 최신성 기준으로 먼저 봅니다."
              >
                <div className="space-y-3">
                  {posts.length > 0 ? (
                    posts.map((post) => {
                      const matchedSignal =
                        signals.find(
                          (signal) =>
                            categoryMatches(categoryText(post), signal.categoryName) ||
                            categoryMatches(categoryText(post), signal.categoryId),
                        ) || featuredSignal;

                      return (
                        <article
                          key={String(post.id)}
                          className="rounded-[22px] border border-slate-200 bg-slate-50/70 p-4"
                        >
                          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <span
                                  className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${topicTone(
                                    post.topic,
                                  )}`}
                                >
                                  {topicLabel(post.topic)}
                                </span>

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
                                  {categoryText(post)}
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
                                  buildPostFollowupHref(post, matchedSignal, regionName),
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
                    <div className="rounded-[22px] border border-dashed border-slate-300 bg-slate-50 px-5 py-10 text-center text-sm text-slate-500">
                      아직 등록된 글이 없습니다.
                    </div>
                  )}
                </div>
              </SectionCard>

              <SectionCard
                eyebrow="Category Queue"
                title="먼저 볼 업종 커뮤니티"
                description="질문이 많거나 신호가 붙은 업종을 먼저 올렸습니다."
              >
                <div className="space-y-3">
                  {buckets.length > 0 ? (
                    buckets.slice(0, 8).map((bucket) => (
                      <article
                        key={bucket.key}
                        className="rounded-[22px] border border-slate-200 bg-slate-50/70 p-4"
                      >
                        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span
                                className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${priorityTone(
                                  bucket.priority,
                                )}`}
                              >
                                {priorityLabel(bucket.priority)}
                              </span>

                              {bucket.matchedSignal ? (
                                <span
                                  className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${signalTone(
                                    bucket.matchedSignal.signalType,
                                  )}`}
                                >
                                  {signalLabel(bucket.matchedSignal.signalType)}
                                </span>
                              ) : null}
                            </div>

                            <h3 className="mt-3 text-lg font-black tracking-[-0.02em] text-slate-950">
                              {bucket.name}
                            </h3>

                            <p className="mt-2 text-sm leading-6 text-slate-600">
                              글 {formatNumber(bucket.postCount)} · 미해결 {formatNumber(bucket.unsolvedCount)} ·
                              시그널 {formatNumber(bucket.signalCount)}
                              {bucket.matchedSignal
                                ? ` · ${signalRiskBadge(bucket.matchedSignal)}`
                                : ""}
                            </p>

                            {bucket.latestPost ? (
                              <p className="mt-2 text-sm leading-6 text-slate-500">
                                최근 글: {summarizeText(text(bucket.latestPost.title), 44)}
                              </p>
                            ) : null}
                          </div>

                          <div className="grid grid-cols-2 gap-2 xl:w-[248px] xl:grid-cols-1">
                            <Link
                              href={categoryRouteHref(regionCode, bucket.key)}
                              className="inline-flex h-10 items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                            >
                              업종 커뮤니티
                            </Link>

                            <Link
                              href={loginAwareHref(
                                bucket.matchedSignal
                                  ? buildSignalWriteHref(bucket.matchedSignal)
                                  : buildCommunityComposeHref({
                                      type: "story",
                                      regionCode,
                                      regionName,
                                      industryCategory: bucket.name,
                                      externalQuery: [regionName, bucket.name]
                                        .filter(Boolean)
                                        .join(" "),
                                    }),
                                Boolean(user),
                              )}
                              className="inline-flex h-10 items-center justify-center rounded-2xl border border-emerald-300 bg-emerald-50 px-4 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100"
                            >
                              글 쓰기
                            </Link>
                          </div>
                        </div>
                      </article>
                    ))
                  ) : (
                    <div className="rounded-[22px] border border-dashed border-slate-300 bg-slate-50 px-5 py-10 text-center text-sm text-slate-500">
                      업종별로 묶을 데이터가 없습니다.
                    </div>
                  )}
                </div>
              </SectionCard>
            </div>

            <aside className="space-y-5">
              <SectionCard
                eyebrow="Linked Signals"
                title="지금 연결된 신호"
                description="커뮤니티 글만 보지 않고 같은 지역의 위험 신호도 함께 봅니다."
              >
                <div className="space-y-3">
                  {signals.length > 0 ? (
                    signals.slice(0, 6).map((signal) => (
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
                        </div>

                        <div className="mt-3 text-sm font-black text-slate-950">
                          {sectionSignalText(signal)}
                        </div>

                        <p className="mt-2 text-sm leading-6 text-slate-600">
                          {sectionSignalWhy(signal)}
                        </p>

                        <div className="mt-3 flex flex-wrap gap-2">
                          {signal.categoryName ? (
                            <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-600">
                              {signal.categoryName}
                            </span>
                          ) : null}
                          <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-600">
                            {signalRiskBadge(signal)}
                          </span>
                        </div>

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
                    <div className="rounded-[22px] border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-sm text-slate-500">
                      연결된 위험 신호가 없습니다.
                    </div>
                  )}
                </div>
              </SectionCard>

              <SectionCard
                eyebrow="Quick Check"
                title="지금 보는 기준"
                description="커뮤니티도 액션 판단용으로 먼저 보이게 정리했습니다."
              >
                <div className="space-y-3 text-sm leading-6 text-slate-600">
                  <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3">
                    미해결 질문이 많고 고위험 신호가 붙은 업종이 우선
                  </div>
                  <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
                    글만 많으면 맥락 확인, 신호까지 있으면 바로 개입 검토
                  </div>
                  <div className="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3">
                    질문 작성은 지역명과 업종 문맥을 같이 남기는 쪽이 이후 연결이 쉽습니다
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3">
                  <SummaryCard
                    label="전문가 질문"
                    value={formatNumber(expertPostCount)}
                    hint="전문가에게 묻기 글"
                  />
                  <SummaryCard
                    label="업종 큐"
                    value={formatNumber(buckets.length)}
                    hint="현재 묶인 업종 수"
                  />
                </div>
              </SectionCard>
            </aside>
          </div>
        </div>
      </section>
    </main>
  );
}
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
import { buildCommunityComposeHref } from "@/app/community/write-link";

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

  if (raw.includes("expert")) return "border-sky-200 bg-sky-50 text-sky-700";
  if (raw.includes("success")) return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (raw.includes("worry") || raw.includes("question")) {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }
  return "border-slate-200 bg-slate-50 text-slate-700";
}

function categoryMatches(a?: unknown, b?: unknown) {
  const left = String(a ?? "").trim().toLowerCase();
  const right = String(b ?? "").trim().toLowerCase();

  if (!left || !right) return false;
  return left.includes(right) || right.includes(left);
}

function categoryText(post: CommunityPostRow) {
  return text(post.category_l1, post.category_code, post.category);
}

function regionText(post: CommunityPostRow, fallback: string) {
  return text(post.region_name, post.region_code, fallback) || fallback;
}

function buildCategoryWriteHref(
  regionCode: string,
  regionName: string,
  categoryName: string,
  signal?: PresentedSignal | null,
) {
  if (signal) return buildCommunityWriteHref(signal);

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
    topic: post.topic,
    regionCode: text(post.region_code),
    regionName: regionText(post, regionName),
    industryCategory: text(post.category_l1, post.category_code, categoryName),
    title: post.title ? `[후속] ${post.title}` : "",
    signalId: signal?.id ? String(signal.id) : "",
    signalType: signal?.signalType || "",
    signalTitle: signal?.title || "",
    signalSummary: signal?.summary || "",
    recommendedAction: signal?.action || "",
    why: signal?.why || "",
    personalizedMessage: signal?.personalization || "",
    externalQuery: [regionName, categoryName].filter(Boolean).join(" "),
  });
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

function scorePanelTone(score: number | null) {
  if (score == null) return "border-slate-200 bg-slate-50 text-slate-700";
  if (score >= 80) return "border-rose-200 bg-rose-50 text-rose-700";
  if (score >= 60) return "border-amber-200 bg-amber-50 text-amber-700";
  if (score >= 40) return "border-sky-200 bg-sky-50 text-sky-700";
  return "border-emerald-200 bg-emerald-50 text-emerald-700";
}

function SectionTitle({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <div className="text-[11px] font-black uppercase tracking-[0.18em] text-[#0B5CAB]">
          {eyebrow}
        </div>
        <h2 className="mt-2 text-2xl font-black tracking-[-0.04em] text-slate-950">
          {title}
        </h2>
        <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-600">{description}</p>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

function KpiCard({
  label,
  value,
  description,
  tone = "default",
}: {
  label: string;
  value: string;
  description: string;
  tone?: "default" | "warning" | "success" | "info";
}) {
  const toneClass =
    tone === "warning"
      ? "border-amber-200 bg-amber-50"
      : tone === "success"
        ? "border-emerald-200 bg-emerald-50"
        : tone === "info"
          ? "border-sky-200 bg-sky-50"
          : "border-slate-200 bg-white";

  return (
    <div className={`rounded-[24px] border p-4 ${toneClass}`}>
      <div className="text-sm font-semibold text-slate-700">{label}</div>
      <div className="mt-3 text-3xl font-black tracking-[-0.05em] text-slate-950">{value}</div>
      <div className="mt-2 text-xs leading-6 text-slate-600">{description}</div>
    </div>
  );
}

function EmptyPanel({ text }: { text: string }) {
  return (
    <div className="rounded-[26px] border border-dashed border-slate-300 bg-slate-50 px-5 py-12 text-sm text-slate-500">
      {text}
    </div>
  );
}

export default async function CategoryCommunityPage({ params }: PageProps) {
  const { regionCode, categoryL1 } = await params;
  const supabase = await supabaseServer();

  const [postsRes, signalsRes] = await Promise.all([
    supabase
      .from("v_community_posts_latest")
      .select("*")
      .eq("region_code", regionCode)
      .or(`category_l1.eq.${categoryL1},category_code.eq.${categoryL1},category.eq.${categoryL1}`)
      .order("created_at", { ascending: false })
      .limit(80),
    supabase
      .from("v_risk_signals_feed")
      .select("*")
      .eq("region_code", regionCode)
      .or(`category_code.eq.${categoryL1},category_name.eq.${categoryL1}`)
      .order("signal_date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(16),
  ]);

  const posts = (postsRes.data ?? []) as CommunityPostRow[];
  const signals = ((signalsRes.data ?? []) as RawRiskSignalRow[]).map(presentRiskSignal);

  if (!posts.length && !signals.length) {
    notFound();
  }

  const regionName = text(posts[0]?.region_name, signals[0]?.regionName, regionCode) || regionCode;
  const categoryName =
    text(
      posts[0]?.category_l1,
      posts[0]?.category_code,
      posts[0]?.category,
      signals[0]?.categoryName,
      categoryL1,
    ) || categoryL1;

  const matchedSignal = findMatchedSignal(signals, categoryName);
  const writeHref = buildCategoryWriteHref(regionCode, regionName, categoryName, matchedSignal);
  const monitorHref = matchedSignal
    ? buildMonitorPrefillHref({
        from: "community-category",
        businessName: matchedSignal.title,
        regionCode: matchedSignal.regionCode ?? undefined,
        regionName: matchedSignal.regionName ?? undefined,
        categoryId: matchedSignal.categoryId ?? undefined,
        categoryName: matchedSignal.categoryName ?? undefined,
        query: matchedSignal.query ?? matchedSignal.keyword ?? undefined,
        keyword: matchedSignal.keyword ?? undefined,
        source: matchedSignal.source ?? undefined,
        stage: matchedSignal.stage ?? undefined,
        reason: matchedSignal.reason ?? undefined,
        score: matchedSignal.score ?? undefined,
      })
    : null;

  const solvedCount = posts.filter((post) => Boolean(post.is_solved)).length;
  const unresolvedCount = posts.length - solvedCount;
  const highSignals = signals.filter((signal) => (signal.score ?? 0) >= 60).length;

  return (
    <main className="mx-auto max-w-7xl px-4 pb-14 pt-6 sm:px-6">
      <div className="space-y-6">
        <section className="overflow-hidden rounded-[34px] border border-slate-200 bg-white shadow-[0_18px_54px_rgba(15,23,42,0.06)]">
          <div className="bg-[linear-gradient(135deg,#eef5ff_0%,#f8fbff_46%,#ffffff_100%)] px-6 py-6 sm:px-8">
            <div className="flex flex-wrap items-center gap-3">
              <Link
                href={`/community/region/${encodeURIComponent(regionCode)}`}
                className="inline-flex items-center rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                {regionName} 커뮤니티로
              </Link>
            </div>

            <div className="mt-6 grid gap-8 xl:grid-cols-[1.1fr_0.9fr]">
              <div className="min-w-0">
                <div className="inline-flex items-center rounded-full border border-sky-200 bg-sky-50 px-4 py-1.5 text-[11px] font-black uppercase tracking-[0.18em] text-[#0B5CAB]">
                  Category Community
                </div>

                <h1 className="mt-5 text-[32px] font-black tracking-[-0.05em] text-slate-950 sm:text-[46px]">
                  {regionName} · {categoryName}
                </h1>

                <p className="mt-4 max-w-3xl text-sm leading-8 text-slate-600 sm:text-base">
                  같은 지역·업종에서 올라온 글과 최근 시그널을 함께 보고, 후속 글쓰기와
                  모니터 인테이크까지 바로 이어갈 수 있게 정리했습니다.
                </p>

                <div className="mt-6 flex flex-wrap gap-3">
                  <Link
                    href={writeHref}
                    className="inline-flex h-12 items-center justify-center rounded-2xl border border-[#0B5CAB] bg-[#0B5CAB] px-5 text-sm font-semibold text-white transition hover:border-[#084298] hover:bg-[#084298]"
                  >
                    이 업종 글쓰기
                  </Link>

                  {monitorHref ? (
                    <Link
                      href={monitorHref}
                      className="inline-flex h-12 items-center justify-center rounded-2xl border border-sky-200 bg-sky-50 px-5 text-sm font-semibold text-[#0B5CAB] transition hover:border-sky-300 hover:bg-sky-100"
                    >
                      모니터 인테이크
                    </Link>
                  ) : null}
                </div>
              </div>

              <div className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-[0_14px_36px_rgba(15,23,42,0.05)]">
                <div className="text-[11px] font-black uppercase tracking-[0.18em] text-[#0B5CAB]">
                  Category Snapshot
                </div>

                <div className="mt-5 grid grid-cols-2 gap-3">
                  <KpiCard
                    label="글 수"
                    value={formatNumber(posts.length)}
                    description="같은 지역·업종 글 수"
                    tone="info"
                  />
                  <KpiCard
                    label="해결됨"
                    value={formatNumber(solvedCount)}
                    description="해결 표시된 글 수"
                    tone="success"
                  />
                  <KpiCard
                    label="미해결"
                    value={formatNumber(unresolvedCount)}
                    description="추가 의견이 필요한 글 수"
                    tone={unresolvedCount > 0 ? "warning" : "default"}
                  />
                  <KpiCard
                    label="연관 시그널"
                    value={formatNumber(signals.length)}
                    description={`60점 이상 ${formatNumber(highSignals)}건`}
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.02fr_0.98fr]">
          <section className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-[0_14px_38px_rgba(15,23,42,0.05)] sm:p-7">
            <SectionTitle
              eyebrow="Recent Posts"
              title="최근 글"
              description="같은 지역·업종에서 올라온 최근 질문과 사례입니다."
              action={
                <Link
                  href={writeHref}
                  className="inline-flex h-11 items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  글 쓰기
                </Link>
              }
            />

            <div className="mt-6 space-y-4">
              {posts.length > 0 ? (
                posts.map((post) => {
                  const followupHref = buildPostFollowupHref(
                    post,
                    matchedSignal,
                    regionName,
                    categoryName,
                  );

                  return (
                    <article
                      key={String(post.id)}
                      className="rounded-[24px] border border-slate-200 bg-slate-50 p-5"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold ${topicTone(
                            post.topic,
                          )}`}
                        >
                          {topicLabel(post.topic)}
                        </span>

                        {post.is_solved ? (
                          <span className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
                            해결됨
                          </span>
                        ) : null}
                      </div>

                      <div className="mt-3 text-lg font-black tracking-[-0.03em] text-slate-950">
                        {text(post.title) || "제목 없음"}
                      </div>

                      <div className="mt-3 text-sm leading-7 text-slate-600">
                        {summarizeText(post.content || post.body)}
                      </div>

                      <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                        <span>{displayAuthor(post.author_name, post.anonymous_name)}</span>
                        <span>·</span>
                        <span>{formatDate(post.created_at)}</span>
                        <span>·</span>
                        <span>댓글 {formatNumber(post.comment_count)}</span>
                        <span>·</span>
                        <span>인기 {formatNumber(post.popularity_score)}</span>
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2">
                        <Link
                          href={`/community/post/${post.id}`}
                          className="inline-flex h-10 items-center justify-center rounded-xl border border-[#0B5CAB] bg-[#0B5CAB] px-3 text-xs font-semibold text-white transition hover:border-[#084298] hover:bg-[#084298]"
                        >
                          글 보기
                        </Link>
                        <Link
                          href={followupHref}
                          className="inline-flex h-10 items-center justify-center rounded-xl border border-sky-200 bg-sky-50 px-3 text-xs font-semibold text-[#0B5CAB] transition hover:border-sky-300 hover:bg-sky-100"
                        >
                          후속 글 쓰기
                        </Link>
                      </div>
                    </article>
                  );
                })
              ) : (
                <EmptyPanel text="이 업종에는 아직 글이 없습니다." />
              )}
            </div>
          </section>

          <section className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-[0_14px_38px_rgba(15,23,42,0.05)] sm:p-7">
            <SectionTitle
              eyebrow="Related Signals"
              title="연관 시그널"
              description="같은 지역·업종의 최근 신호를 함께 봅니다."
            />

            <div className="mt-6 space-y-4">
              {signals.length > 0 ? (
                signals.map((signal) => {
                  const intakeHref = buildMonitorPrefillHref({
                    from: "community-category",
                    businessName: signal.title,
                    regionCode: signal.regionCode ?? undefined,
                    regionName: signal.regionName ?? undefined,
                    categoryId: signal.categoryId ?? undefined,
                    categoryName: signal.categoryName ?? undefined,
                    query: signal.query ?? signal.keyword ?? undefined,
                    keyword: signal.keyword ?? undefined,
                    source: signal.source ?? undefined,
                    stage: signal.stage ?? undefined,
                    reason: signal.reason ?? undefined,
                    score: signal.score ?? undefined,
                  });

                  return (
                    <article
                      key={String(signal.id)}
                      className="rounded-[24px] border border-slate-200 bg-slate-50 p-5"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold ${signal.signalTypeTone}`}
                        >
                          {signal.signalTypeLabel}
                        </span>
                        <span
                          className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold ${signal.riskGradeTone}`}
                        >
                          {signal.riskGradeLabel}
                        </span>
                      </div>

                      <div className="mt-4 grid grid-cols-[1fr_96px] items-start gap-4">
                        <div className="min-w-0">
                          <div className="text-base font-black tracking-[-0.02em] text-slate-950">
                            {signal.title}
                          </div>
                          <div className="mt-2 text-sm leading-7 text-slate-600">
                            {summarizeText(signal.summary)}
                          </div>
                          <div className="mt-3 text-xs text-slate-500">
                            {signal.regionName} · {signal.categoryName} · {formatDate(signal.signalDate || signal.createdAt)}
                          </div>
                        </div>

                        <div
                          className={`rounded-[20px] border px-3 py-4 text-center ${scorePanelTone(
                            signal.score,
                          )}`}
                        >
                          <div className="text-[10px] uppercase tracking-[0.14em] opacity-80">
                            score
                          </div>
                          <div className="mt-1 text-2xl font-black tracking-[-0.04em]">
                            {signal.score ?? "-"}
                          </div>
                        </div>
                      </div>

                      {(signal.why || signal.action) && (
                        <div className="mt-4 grid gap-3 md:grid-cols-2">
                          <div className="rounded-[20px] border border-white bg-white/80 p-4">
                            <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                              Why
                            </div>
                            <p className="mt-2 text-sm leading-7 text-slate-700">
                              {signal.why || "자동 해석 없음"}
                            </p>
                          </div>
                          <div className="rounded-[20px] border border-white bg-white/80 p-4">
                            <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                              Action
                            </div>
                            <p className="mt-2 text-sm leading-7 text-slate-700">
                              {signal.action || "자동 액션 없음"}
                            </p>
                          </div>
                        </div>
                      )}

                      <div className="mt-4 flex flex-wrap gap-2">
                        <Link
                          href={`/signals/${encodeURIComponent(String(signal.id))}`}
                          className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                        >
                          시그널 보기
                        </Link>
                        <Link
                          href={buildCommunityWriteHref(signal)}
                          className="inline-flex h-10 items-center justify-center rounded-xl border border-sky-200 bg-sky-50 px-3 text-xs font-semibold text-[#0B5CAB] transition hover:border-sky-300 hover:bg-sky-100"
                        >
                          관련 글 쓰기
                        </Link>
                        <Link
                          href={intakeHref}
                          className="inline-flex h-10 items-center justify-center rounded-xl border border-[#0B5CAB] bg-[#0B5CAB] px-3 text-xs font-semibold text-white transition hover:border-[#084298] hover:bg-[#084298]"
                        >
                          인테이크
                        </Link>
                      </div>
                    </article>
                  );
                })
              ) : (
                <EmptyPanel text="이 업종에 연결된 최근 시그널이 없습니다." />
              )}
            </div>
          </section>
        </section>
      </div>
    </main>
  );
}

function displayAuthor(authorName?: string | null, anonymousName?: string | null) {
  return anonymousName || authorName || "익명 사용자";
}
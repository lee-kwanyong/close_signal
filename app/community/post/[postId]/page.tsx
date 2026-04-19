import Link from "next/link";
import { notFound } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import {
  buildCommunityWriteHref,
  presentRiskSignal,
  type RawRiskSignalRow,
} from "@/lib/close-signal/intel/presenter";
import { buildCommunityComposeHref } from "@/app/community/write-link";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ postId: string }>;
};

type CommunityPostRow = {
  id?: string | number | null;
  title?: string | null;
  content?: string | null;
  topic?: string | null;
  category?: string | null;
  category_l1?: string | null;
  category_code?: string | null;
  region_code?: string | null;
  region_name?: string | null;
  signal_id?: string | number | null;
  author_name?: string | null;
  anonymous_name?: string | null;
  is_solved?: boolean | null;
  created_at?: string | null;
  updated_at?: string | null;
  popularity_score?: number | null;
  comment_count?: number | null;
};

type CommunityCommentRow = {
  id?: string | number | null;
  post_id?: string | number | null;
  content?: string | null;
  author_name?: string | null;
  anonymous_name?: string | null;
  created_at?: string | null;
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

function summarizeText(value?: string | null, limit = 180) {
  const raw = String(value || "").trim();
  if (!raw) return "내용이 없습니다.";
  return raw.length > limit ? `${raw.slice(0, limit).trim()}…` : raw;
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

function formatDateTime(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
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

function displayAuthor(authorName?: string | null, anonymousName?: string | null) {
  return anonymousName || authorName || "익명 사용자";
}

function categoryText(post: CommunityPostRow) {
  return text(post.category_l1, post.category_code, post.category);
}

function regionText(post: CommunityPostRow) {
  return text(post.region_name, post.region_code);
}

function postBody(post: CommunityPostRow) {
  return text(post.content);
}

function normalizeMatchValue(value?: unknown) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\s/_-]+/g, "");
}

function categoryMatches(a?: unknown, b?: unknown) {
  const left = normalizeMatchValue(a);
  const right = normalizeMatchValue(b);

  if (!left || !right) return false;
  return left === right || left.includes(right) || right.includes(left);
}

function buildPostWriteHref(post: CommunityPostRow, signal: PresentedSignal | null) {
  return buildCommunityComposeHref({
    type: post.topic || "story",
    regionCode: text(post.region_code),
    regionName: regionText(post),
    industryCategory: categoryText(post),
    title: post.title ? `[후속] ${post.title}` : "",
    content: "",
    signalId: signal?.id != null ? String(signal.id) : "",
    signalType: signal?.signalType || "",
    signalTitle: signal?.title || "",
    signalSummary: signal?.summary || "",
    recommendedAction: signal?.action || "",
    why: signal?.why || "",
    personalizedMessage: signal?.personalization || "",
    externalQuery: [regionText(post), categoryText(post)].filter(Boolean).join(" "),
  });
}

function isRelatedSignal(post: CommunityPostRow, signal: PresentedSignal) {
  return (
    categoryMatches(categoryText(post), signal.categoryName) ||
    categoryMatches(categoryText(post), signal.categoryId) ||
    text(signal.regionCode) === text(post.region_code)
  );
}

const shellClass = "mx-auto max-w-5xl px-4 sm:px-6 lg:px-8";
const surfaceCard =
  "rounded-[1.75rem] border border-slate-200 bg-white shadow-[0_12px_28px_rgba(15,23,42,0.05)]";
const primaryButton =
  "inline-flex h-11 items-center justify-center rounded-2xl border border-[#0B5CAB] bg-[#0B5CAB] px-4 text-sm font-semibold text-white transition hover:border-[#084298] hover:bg-[#084298]";
const secondaryButton =
  "inline-flex h-11 items-center justify-center rounded-2xl border border-sky-200 bg-sky-50 px-4 text-sm font-semibold text-[#0B5CAB] transition hover:border-sky-300 hover:bg-sky-100";

export default async function CommunityPostDetailPage({ params }: PageProps) {
  const { postId } = await params;
  const supabase = await supabaseServer();

  const { data: postData } = await supabase
    .from("v_community_posts_latest")
    .select("*")
    .eq("id", postId)
    .maybeSingle();

  const post = (postData ?? null) as CommunityPostRow | null;

  if (!post) {
    notFound();
  }

  const [commentsRes, signalsRes] = await Promise.all([
    supabase
      .from("community_comments")
      .select("*")
      .eq("post_id", postId)
      .order("created_at", { ascending: true }),
    supabase
      .from("v_risk_signals_feed")
      .select("*")
      .order("signal_date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(60),
  ]);

  let linkedSignalRow: RawRiskSignalRow | null = null;

  if (post.signal_id != null) {
    const { data } = await supabase
      .from("v_risk_signals_feed")
      .select("*")
      .eq("id", post.signal_id)
      .maybeSingle();

    linkedSignalRow = (data ?? null) as RawRiskSignalRow | null;
  }

  const comments = (commentsRes.data ?? []) as CommunityCommentRow[];

  const recentSignals = ((signalsRes.data ?? []) as RawRiskSignalRow[]).map(presentRiskSignal);
  const linkedSignal = linkedSignalRow ? presentRiskSignal(linkedSignalRow) : null;

  const signalMap = new Map<string, PresentedSignal>();

  if (linkedSignal) {
    signalMap.set(text(linkedSignal.id), linkedSignal);
  }

  for (const signal of recentSignals) {
    const key =
      text(signal.id) ||
      [text(signal.title), text(signal.regionCode), text(signal.categoryName)].join("::");

    if (!signalMap.has(key)) {
      signalMap.set(key, signal);
    }
  }

  const allSignals = Array.from(signalMap.values());

  const matchedSignal =
    linkedSignal ||
    allSignals.find(
      (signal) =>
        categoryMatches(categoryText(post), signal.categoryName) ||
        categoryMatches(categoryText(post), signal.categoryId),
    ) ||
    allSignals.find((signal) => text(signal.regionCode) === text(post.region_code)) ||
    null;

  const orderedSignals = matchedSignal
    ? [
        matchedSignal,
        ...allSignals.filter((signal) => text(signal.id) !== text(matchedSignal.id)),
      ]
    : allSignals;

  const relatedSignals = orderedSignals.filter((signal) => isRelatedSignal(post, signal)).slice(0, 4);

  const writeHref = buildPostWriteHref(post, matchedSignal);

  return (
    <main className="min-h-screen bg-white text-slate-900">
      <div className={`${shellClass} pb-14 pt-6`}>
        <div className="space-y-6">
          <section className={surfaceCard}>
            <div className="bg-[linear-gradient(135deg,#eef5ff_0%,#f8fbff_46%,#ffffff_100%)] px-6 py-8 sm:px-8 sm:py-10">
              <div className="flex flex-wrap items-center gap-3">
                <Link href="/community" className={secondaryButton}>
                  ← 커뮤니티로
                </Link>

                {text(post.region_code) ? (
                  <Link
                    href={`/community/region/${encodeURIComponent(text(post.region_code))}`}
                    className="inline-flex items-center rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
                  >
                    {regionText(post)}
                  </Link>
                ) : null}
              </div>

              <div className="mt-5 flex flex-wrap items-center gap-2">
                <span
                  className={`rounded-full border px-3 py-1 text-xs font-semibold ${topicTone(
                    post.topic,
                  )}`}
                >
                  {topicLabel(post.topic)}
                </span>

                {post.is_solved ? (
                  <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                    해결됨
                  </span>
                ) : null}

                {categoryText(post) ? (
                  <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-600">
                    {categoryText(post)}
                  </span>
                ) : null}
              </div>

              <h1 className="mt-5 text-3xl font-extrabold tracking-[-0.04em] text-slate-950 sm:text-5xl">
                {post.title || "제목 없는 글"}
              </h1>

              <div className="mt-5 flex flex-wrap items-center gap-3 text-sm text-slate-500">
                <span>{displayAuthor(post.author_name, post.anonymous_name)}</span>
                <span>·</span>
                <span>{formatDateTime(post.created_at)}</span>
                <span>·</span>
                <span>댓글 {comments.length || num(post.comment_count)}</span>
                <span>·</span>
                <span>인기 {num(post.popularity_score)}</span>
              </div>

              <div className="mt-6 flex flex-wrap gap-2.5">
                <Link href={writeHref} className={primaryButton}>
                  후속 글 쓰기
                </Link>
              </div>
            </div>
          </section>

          <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
            <article className={`${surfaceCard} p-6`}>
              <h2 className="text-lg font-bold text-slate-950">본문</h2>

              <div className="mt-5 whitespace-pre-wrap text-sm leading-8 text-slate-700">
                {postBody(post) || "내용이 없습니다."}
              </div>

              {matchedSignal ? (
                <section className="mt-8 rounded-[1.5rem] border border-sky-100 bg-[linear-gradient(135deg,#eef5ff_0%,#f8fbff_42%,#ffffff_100%)] p-5 sm:p-6">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${matchedSignal.signalTypeTone}`}
                    >
                      {matchedSignal.signalTypeLabel}
                    </span>

                    <span
                      className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${matchedSignal.riskGradeTone}`}
                    >
                      {matchedSignal.riskGradeLabel}
                    </span>

                    {matchedSignal.regionName ? (
                      <span className="rounded-full border border-white/70 bg-white px-3 py-1 text-xs text-slate-600">
                        {matchedSignal.regionName}
                      </span>
                    ) : null}

                    {matchedSignal.categoryName ? (
                      <span className="rounded-full border border-white/70 bg-white px-3 py-1 text-xs text-slate-600">
                        {matchedSignal.categoryName}
                      </span>
                    ) : null}
                  </div>

                  <div className="mt-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                      CLOSING SIGNAL
                    </p>
                    <h3 className="mt-2 text-xl font-bold text-slate-950">클로징 시그널</h3>
                    <p className="mt-2 text-base font-semibold text-slate-900">
                      {matchedSignal.title}
                    </p>
                  </div>

                  <p className="mt-3 text-sm leading-7 text-slate-700">
                    {summarizeText(matchedSignal.summary, 220)}
                  </p>

                  {text(matchedSignal.why) ? (
                    <p className="mt-2 text-sm leading-7 text-slate-600">
                      왜 중요하냐면 {matchedSignal.why}
                    </p>
                  ) : null}

                  {text(matchedSignal.action) ? (
                    <p className="mt-2 text-sm leading-7 text-slate-600">
                      권장 액션: {matchedSignal.action}
                    </p>
                  ) : null}

                  {text(matchedSignal.personalization) ? (
                    <p className="mt-2 text-sm leading-7 text-slate-600">
                      {matchedSignal.personalization}
                    </p>
                  ) : null}

                  <div className="mt-5 flex flex-wrap gap-2.5">
                    <Link href={writeHref} className={primaryButton}>
                      후속 글 쓰기
                    </Link>

                    <Link href={buildCommunityWriteHref(matchedSignal)} className={secondaryButton}>
                      질문으로 연결
                    </Link>
                  </div>

                  <div className="mt-4 text-xs text-slate-500">
                    {matchedSignal.regionName || "-"} · {matchedSignal.categoryName || "-"} ·{" "}
                    {formatDate(matchedSignal.signalDate || matchedSignal.createdAt)}
                  </div>
                </section>
              ) : null}

              <div className="mt-8 border-t border-slate-100 pt-6">
                <div className="text-sm font-semibold text-slate-900">댓글 {comments.length}</div>

                <div className="mt-4 space-y-3">
                  {comments.length > 0 ? (
                    comments.map((comment, index) => (
                      <div
                        key={String(comment.id ?? `${postId}-comment-${index}`)}
                        className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4"
                      >
                        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                          <span>
                            {displayAuthor(comment.author_name, comment.anonymous_name)}
                          </span>
                          <span>·</span>
                          <span>{formatDateTime(comment.created_at)}</span>
                        </div>

                        <div className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-700">
                          {text(comment.content) || "내용 없음"}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-[1.5rem] border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-500">
                      아직 댓글이 없습니다.
                    </div>
                  )}
                </div>
              </div>
            </article>

            <aside className="space-y-4">
              <div className={`${surfaceCard} p-6`}>
                <h2 className="text-lg font-bold text-slate-950">관련 시그널</h2>

                <div className="mt-4 space-y-3">
                  {relatedSignals.length > 0 ? (
                    relatedSignals.map((signal) => (
                      <article
                        key={String(signal.id)}
                        className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4"
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${signal.signalTypeTone}`}
                          >
                            {signal.signalTypeLabel}
                          </span>
                          <span
                            className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${signal.riskGradeTone}`}
                          >
                            {signal.riskGradeLabel}
                          </span>
                        </div>

                        <h3 className="mt-3 text-sm font-bold text-slate-950">{signal.title}</h3>

                        <p className="mt-2 text-sm leading-6 text-slate-600">
                          {summarizeText(signal.summary, 120)}
                        </p>

                        <div className="mt-3 text-xs text-slate-500">
                          {signal.regionName} · {signal.categoryName} ·{" "}
                          {formatDate(signal.signalDate || signal.createdAt)}
                        </div>

                        <div className="mt-4 flex flex-wrap gap-2">
                          <Link
                            href={`/signals/${encodeURIComponent(String(signal.id))}`}
                            className={secondaryButton}
                          >
                            시그널 보기
                          </Link>
                          <Link href={buildCommunityWriteHref(signal)} className={primaryButton}>
                            관련 글 쓰기
                          </Link>
                        </div>
                      </article>
                    ))
                  ) : (
                    <div className="rounded-[1.5rem] border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-500">
                      연결된 시그널이 없습니다.
                    </div>
                  )}
                </div>
              </div>
            </aside>
          </section>
        </div>
      </div>
    </main>
  );
}
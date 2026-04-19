import type { ReactNode } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { buildMonitorPrefillHref } from "@/lib/monitors/prefill-link";
import {
  buildCommunityWriteHref,
  presentRiskSignal,
  type RawRiskSignalRow,
} from "@/lib/close-signal/intel/presenter";

export const dynamic = "force-dynamic";

type SignalRow = RawRiskSignalRow & {
  risk_signals?: Record<string, unknown> | null;
  id?: string | number | null;
  signal_id?: string | number | null;
  title?: string | null;
  summary?: string | null;
  description?: string | null;
  region_code?: string | null;
  region_name?: string | null;
  category_id?: string | number | null;
  category_name?: string | null;
  query?: string | null;
  keyword?: string | null;
  reason?: string | null;
  stage?: string | null;
  source?: string | null;
  risk_score?: number | null;
  score?: number | null;
  grade?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  signal_date?: string | null;
  score_date?: string | null;
  business_count?: number | null;
  close_risk_count?: number | null;
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

function nullableText(...values: unknown[]) {
  const value = text(...values);
  return value || null;
}

function toNumber(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim() !== "") {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) return parsed;
    }
  }
  return null;
}

function formatNumber(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value)) return "-";
  return new Intl.NumberFormat("ko-KR").format(value);
}

function formatScore(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value)) return "-";
  return String(Math.round(value));
}

function formatDate(value?: string | null) {
  if (!value) return "-";

  const raw = String(value);
  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    return `${match[1]}.${match[2]}.${match[3]}`;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}.${mm}.${dd}`;
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

function scorePanelTone(score: number | null | undefined) {
  if (score == null || !Number.isFinite(score)) {
    return "border-sky-200 bg-white text-slate-700";
  }
  if (score >= 80) return "border-rose-200 bg-rose-50 text-rose-700";
  if (score >= 60) return "border-amber-200 bg-amber-50 text-amber-700";
  if (score >= 40) return "border-sky-200 bg-sky-50 text-sky-700";
  return "border-blue-200 bg-blue-50 text-blue-700";
}

function signalStageTone(stage?: string | null) {
  const raw = String(stage || "").trim().toLowerCase();

  if (raw === "critical" || raw === "last_chance" || raw === "urgent") {
    return "border-rose-200 bg-rose-50 text-rose-700";
  }
  if (raw === "caution") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }
  if (raw === "observe" || raw === "stable") {
    return "border-sky-200 bg-sky-50 text-sky-700";
  }

  return "border-slate-200 bg-slate-50 text-slate-700";
}

function riskBandLabel(score: number | null | undefined) {
  if (score == null || !Number.isFinite(score)) return "미산출";
  if (score >= 80) return "바로 인테이크";
  if (score >= 60) return "오늘 검토";
  if (score >= 40) return "관찰";
  return "보관";
}

function buildSearchRegionHref(regionCode?: string | null, categoryId?: string | number | null) {
  if (!regionCode || categoryId == null) return null;
  return `/regions/${encodeURIComponent(regionCode)}/${encodeURIComponent(String(categoryId))}`;
}

function loginAwareHref(href: string, isLoggedIn: boolean) {
  return isLoggedIn ? href : `/auth/login?next=${encodeURIComponent(href)}`;
}

function uniqueStrings(values: unknown[]) {
  return Array.from(
    new Set(
      values
        .flatMap((value) => {
          if (Array.isArray(value)) return value;
          return [value];
        })
        .map((value) => String(value ?? "").trim())
        .filter(Boolean),
    ),
  );
}

function keywordList(view: Record<string, unknown>) {
  return uniqueStrings([view.query, view.keyword, view.keywords]);
}

function EmptyPanel({ text }: { text: string }) {
  return (
    <div className="rounded-[22px] border border-dashed border-sky-200 bg-white px-4 py-8 text-sm text-slate-500">
      {text}
    </div>
  );
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
    <section className="rounded-[28px] border border-sky-100 bg-sky-50 p-5 shadow-[0_12px_30px_rgba(14,165,233,0.08)] sm:p-6">
      <div>
        <div className="text-[11px] font-black uppercase tracking-[0.18em] text-sky-700">
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

function MetricBox({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string;
  hint: string;
  tone?: string;
}) {
  return (
    <div
      className={`rounded-[20px] border p-4 ${tone ?? "border-sky-200 bg-white text-slate-900"}`}
    >
      <div className="text-[11px] font-black uppercase tracking-[0.14em] opacity-80">{label}</div>
      <div className="mt-2 text-2xl font-black tracking-[-0.05em]">{value}</div>
      <div className="mt-1 text-xs opacity-90">{hint}</div>
    </div>
  );
}

function ActionLink({
  href,
  title,
  body,
  tone = "default",
}: {
  href: string;
  title: string;
  body: string;
  tone?: "default" | "brand" | "subtle";
}) {
  const className =
    tone === "brand"
      ? "border-sky-600 bg-sky-600 text-white hover:bg-sky-700 hover:border-sky-700"
      : tone === "subtle"
        ? "border-sky-200 bg-sky-50 text-sky-800 hover:bg-sky-100"
        : "border-sky-200 bg-white text-slate-800 hover:bg-sky-50";

  return (
    <Link href={href} className={`block rounded-[20px] border p-4 transition ${className}`}>
      <div className="text-sm font-black">{title}</div>
      <p className="mt-2 text-sm leading-6 opacity-90">{body}</p>
    </Link>
  );
}

async function getSignalById(id: string) {
  const supabase = await createServerSupabaseClient();

  const candidates = [
    async () => supabase.from("risk_signals").select("*").eq("id", id).maybeSingle(),
    async () => supabase.from("risk_signals").select("*").eq("signal_id", id).maybeSingle(),
    async () => supabase.from("risk_signal_snapshots").select("*").eq("id", id).maybeSingle(),
    async () =>
      supabase.from("risk_signal_snapshots").select("*").eq("signal_id", id).maybeSingle(),
  ];

  for (const run of candidates) {
    try {
      const result = await run();
      if (!result.error && result.data) {
        return result.data as SignalRow;
      }
    } catch {
      continue;
    }
  }

  return null;
}

export default async function SignalDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const row = await getSignalById(id);

  if (!row) {
    notFound();
  }

  const signal = (() => {
    try {
      return presentRiskSignal(row);
    } catch {
      return presentRiskSignal({
        id: nullableText(row.id, row.signal_id, id),
        title: nullableText(row.title),
        summary: nullableText(row.summary),
        description: nullableText(row.description),
        region_code: nullableText(row.region_code),
        region_name: nullableText(row.region_name),
        category_id: nullableText(row.category_id),
        category_name: nullableText(row.category_name),
        query: nullableText(row.query),
        keyword: nullableText(row.keyword),
        reason: nullableText(row.reason),
        stage: nullableText(row.stage),
        source: nullableText(row.source),
        risk_score: row.risk_score ?? row.score ?? null,
        grade: nullableText(row.grade),
        created_at: nullableText(row.created_at),
        updated_at: nullableText(row.updated_at),
      } as RawRiskSignalRow);
    }
  })();

  const signalView = signal as Record<string, unknown>;

  const title = text(signal.title, "리스크 신호");
  const summary = text(signal.summary, "설명 없음");
  const detail = text(row.description, summary);
  const why = text(signal.why, summary);
  const action = text(signal.action, "모니터 인테이크 후 현장 검증을 시작합니다.");
  const impactText = text(signal.impactText);
  const personalization = text(signal.personalization);

  const regionName = text(signal.regionName, row.region_name, "지역 미지정");
  const categoryName = text(signal.categoryName, row.category_name, "업종 미지정");
  const stage = nullableText(signalView.stage, row.stage);
  const source = nullableText(signalView.source, row.source);
  const reason = nullableText(signalView.reason, row.reason);
  const keywords = keywordList(signalView);

  const searchQuery =
    nullableText(signalView.query, signalView.keyword, keywords[0]) ||
    [regionName, categoryName].filter(Boolean).join(" ");

  const riskScore = toNumber(signal.riskScore, signalView.score, row.risk_score, row.score);
  const businessCount = toNumber(signal.businessCount, row.business_count);
  const closeRiskCount = toNumber(signal.closeRiskCount, row.close_risk_count);

  const activityAt =
    nullableText(
      signal.createdAt,
      signal.signalDate,
      signal.scoreDate,
      row.updated_at,
      row.created_at,
    ) || null;

  const monitorHref = loginAwareHref(
    buildMonitorPrefillHref({
      from: "signal-detail",
      source: source ?? undefined,
      businessName: title,
      regionCode: signal.regionCode ?? undefined,
      regionName: signal.regionName ?? undefined,
      categoryId: signal.categoryId ?? undefined,
      categoryName: signal.categoryName ?? undefined,
      trendKeywords: keywords,
      query: searchQuery || undefined,
      stage: stage ?? undefined,
      reason: reason ?? undefined,
      score: riskScore ?? undefined,
    }),
    Boolean(user),
  );

  const communityHref = loginAwareHref(buildCommunityWriteHref(signal), Boolean(user));
  const regionDetailHref = buildSearchRegionHref(signal.regionCode, signal.categoryId);

  return (
    <main className="mx-auto max-w-7xl bg-white px-4 pb-14 pt-6 sm:px-6">
      <div className="space-y-5">
        <section className="rounded-[30px] border border-sky-100 bg-sky-50 p-5 shadow-[0_14px_34px_rgba(14,165,233,0.08)] sm:p-6">
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px] xl:items-start">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <Link
                  href="/signals"
                  className="inline-flex h-8 items-center rounded-full border border-sky-200 bg-white px-3 text-xs font-semibold text-slate-600 transition hover:bg-sky-50"
                >
                  ← 시그널 목록
                </Link>

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

                <span
                  className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${signal.revenueTone}`}
                >
                  {signal.revenueLabel}
                </span>

                {stage ? (
                  <span
                    className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${signalStageTone(stage)}`}
                  >
                    {stage}
                  </span>
                ) : null}

                <span className="rounded-full border border-sky-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-500">
                  {formatRelativeDate(activityAt)}
                </span>
              </div>

              <h1 className="mt-4 text-2xl font-black tracking-[-0.05em] text-slate-950 sm:text-4xl">
                {title}
              </h1>

              <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-600">
                <span className="rounded-full border border-sky-200 bg-white px-3 py-1">
                  {regionName}
                </span>
                <span className="rounded-full border border-sky-200 bg-white px-3 py-1">
                  {categoryName}
                </span>
                {source ? (
                  <span className="rounded-full border border-sky-200 bg-white px-3 py-1">
                    source · {source}
                  </span>
                ) : null}
                {reason ? (
                  <span className="rounded-full border border-sky-200 bg-white px-3 py-1">
                    reason · {reason}
                  </span>
                ) : null}
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <div className="rounded-[22px] border border-rose-200 bg-rose-50 p-4">
                  <div className="text-[11px] font-black uppercase tracking-[0.14em] text-rose-700">
                    왜 지금 봐야 하나
                  </div>
                  <p className="mt-2 text-sm leading-7 text-slate-700">{why}</p>
                </div>

                <div className="rounded-[22px] border border-sky-200 bg-white p-4">
                  <div className="text-[11px] font-black uppercase tracking-[0.14em] text-sky-700">
                    바로 할 액션
                  </div>
                  <p className="mt-2 text-sm leading-7 text-slate-700">{action}</p>
                </div>
              </div>

              {personalization ? (
                <div className="mt-3 rounded-[22px] border border-sky-200 bg-white px-4 py-3 text-sm leading-6 text-slate-600">
                  {personalization}
                </div>
              ) : null}
            </div>

            <aside className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <MetricBox
                  label="Risk"
                  value={formatScore(riskScore)}
                  hint={riskBandLabel(riskScore)}
                  tone={scorePanelTone(riskScore)}
                />
                <MetricBox
                  label="위험 사업체"
                  value={formatNumber(closeRiskCount)}
                  hint="현재 위험으로 잡힌 수"
                  tone="border-sky-200 bg-white text-slate-900"
                />
                <MetricBox
                  label="전체 사업체"
                  value={formatNumber(businessCount)}
                  hint="기준 집합 규모"
                  tone="border-sky-200 bg-white text-slate-900"
                />
                <MetricBox
                  label="기준일"
                  value={formatDate(activityAt)}
                  hint="최근 신호 시점"
                  tone="border-sky-200 bg-white text-slate-900"
                />
              </div>

              <div className="grid gap-3">
                <ActionLink
                  href={monitorHref}
                  title="모니터 인테이크"
                  body="이 시그널 조건을 그대로 넘겨 추적 가능한 모니터를 만듭니다."
                  tone="brand"
                />
                <ActionLink
                  href={communityHref}
                  title="커뮤니티 연결"
                  body="현장 의견이나 추가 맥락을 질문으로 남겨 후속 탐색을 이어갑니다."
                />
                <ActionLink
                  href={regionDetailHref ?? "/rankings"}
                  title={regionDetailHref ? "지역·업종 상세 보기" : "랭킹 보기"}
                  body={
                    regionDetailHref
                      ? "같은 지역·업종 기준으로 연결된 위험도를 함께 확인합니다."
                      : "연결된 지역 상세가 없으면 랭킹으로 이동합니다."
                  }
                  tone="subtle"
                />
              </div>
            </aside>
          </div>
        </section>

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-5">
            <SectionCard
              eyebrow="Decision Context"
              title="개입 판단 근거"
              description="요약과 상세 설명을 한 번에 보고 바로 인테이크 여부를 결정합니다."
            >
              <div className="space-y-3">
                <div className="rounded-[22px] border border-sky-200 bg-white p-4">
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Summary
                  </div>
                  <p className="mt-2 text-sm leading-7 text-slate-700">{summary}</p>
                </div>

                <div className="rounded-[22px] border border-sky-200 bg-white p-4">
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Detail
                  </div>
                  <p className="mt-2 text-sm leading-7 text-slate-700">{detail}</p>
                </div>

                {impactText ? (
                  <div className="rounded-[22px] border border-sky-200 bg-white p-4">
                    <div className="text-xs font-semibold uppercase tracking-wide text-sky-700">
                      Impact
                    </div>
                    <p className="mt-2 text-sm leading-7 text-slate-700">{impactText}</p>
                  </div>
                ) : null}
              </div>
            </SectionCard>

            <SectionCard
              eyebrow="Intake Payload"
              title="인테이크에 같이 넘길 정보"
              description="모니터 생성 전에 확인해야 할 기준값을 작은 단위로 묶었습니다."
            >
              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-[22px] border border-sky-200 bg-white p-4">
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    기본 정보
                  </div>
                  <div className="mt-3 space-y-2 text-sm text-slate-700">
                    <div>
                      <span className="font-semibold text-slate-500">제목</span>
                      <div className="mt-1">{title}</div>
                    </div>
                    <div>
                      <span className="font-semibold text-slate-500">지역</span>
                      <div className="mt-1">{regionName}</div>
                    </div>
                    <div>
                      <span className="font-semibold text-slate-500">업종</span>
                      <div className="mt-1">{categoryName}</div>
                    </div>
                    <div>
                      <span className="font-semibold text-slate-500">검색 기준</span>
                      <div className="mt-1">{searchQuery || "-"}</div>
                    </div>
                  </div>
                </div>

                <div className="rounded-[22px] border border-sky-200 bg-white p-4">
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    보조 정보
                  </div>
                  <div className="mt-3 space-y-2 text-sm text-slate-700">
                    <div>
                      <span className="font-semibold text-slate-500">위험 단계</span>
                      <div className="mt-1">{stage || "-"}</div>
                    </div>
                    <div>
                      <span className="font-semibold text-slate-500">사유</span>
                      <div className="mt-1">{reason || "-"}</div>
                    </div>
                    <div>
                      <span className="font-semibold text-slate-500">소스</span>
                      <div className="mt-1">{source || "-"}</div>
                    </div>
                    <div>
                      <span className="font-semibold text-slate-500">위험점수</span>
                      <div className="mt-1">{formatScore(riskScore)}</div>
                    </div>
                  </div>
                </div>
              </div>
            </SectionCard>
          </div>

          <aside className="space-y-5">
            <SectionCard
              eyebrow="Keywords"
              title="핵심 키워드"
              description="검색·탐색으로 바로 이어질 수 있는 키워드만 남겼습니다."
            >
              {keywords.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {keywords.map((keyword) => (
                    <span
                      key={keyword}
                      className="rounded-full border border-sky-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700"
                    >
                      {keyword}
                    </span>
                  ))}
                </div>
              ) : (
                <EmptyPanel text="표시할 키워드가 없습니다." />
              )}
            </SectionCard>

            <SectionCard
              eyebrow="Quick Check"
              title="지금 보는 기준"
              description="상세 페이지에서도 액션 판단 기준이 먼저 보이게 맞췄습니다."
            >
              <div className="space-y-3 text-sm leading-6 text-slate-600">
                <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3">
                  위험점수가 높거나 신호 설명이 강하면 바로 인테이크 우선
                </div>
                <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
                  액션 문구가 구체적이면 커뮤니티 질문보다 모니터 생성이 먼저
                </div>
                <div className="rounded-2xl border border-sky-200 bg-white px-4 py-3">
                  지역·업종 연결이 명확하면 지역 상세까지 함께 확인
                </div>
              </div>
            </SectionCard>
          </aside>
        </div>
      </div>
    </main>
  );
}
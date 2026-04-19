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
  }>;
};

type RiskScoreRow = {
  score_date?: string | null;
  region_code?: string | null;
  region_name?: string | null;
  category_id?: string | null;
  category_name?: string | null;
  business_count?: number | null;
  opened_count_30d?: number | null;
  closed_count_30d?: number | null;
  short_lived_count_30d?: number | null;
  reopened_count_30d?: number | null;
  net_change_30d?: number | null;
  closure_rate_30d?: number | null;
  short_lived_rate_30d?: number | null;
  new_entry_rate_30d?: number | null;
  closure_score?: number | null;
  short_lived_score?: number | null;
  shrink_score?: number | null;
  overheat_score?: number | null;
  risk_score?: number | null;
  risk_grade?: string | null;
  personal_priority_label?: string | null;
  sales_trend_status?: string | null;
  top_cause_1?: string | null;
  top_cause_2?: string | null;
  top_cause_3?: string | null;
};

type CommunityRow = {
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

type CategoryAggregate = {
  categoryId: string;
  categoryName: string;
  avgRisk: number;
  businessCount: number;
  signalCount: number;
  netChange30d: number;
  closureScore: number;
  shrinkScore: number;
  shortLivedScore: number;
  overheatScore: number;
  riskGrade: string;
  topCauseLabels: string[];
  priority: "now" | "soon" | "watch";
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

function formatScore(value: unknown) {
  const score = num(value, Number.NaN);
  if (!Number.isFinite(score)) return "-";
  return String(Math.round(score));
}

function formatSigned(value: unknown) {
  const amount = num(value, Number.NaN);
  if (!Number.isFinite(amount)) return "-";
  if (amount > 0) return `+${Math.round(amount)}`;
  if (amount < 0) return `${Math.round(amount)}`;
  return "0";
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

function summarizeText(value?: string | null, limit = 120) {
  const raw = String(value || "").replace(/\s+/g, " ").trim();
  if (!raw) return "본문이 없습니다.";
  return raw.length > limit ? `${raw.slice(0, limit).trim()}…` : raw;
}

function gradeLabel(value?: string | null) {
  const raw = String(value || "").toLowerCase();

  if (raw.includes("critical")) return "치명적";
  if (raw.includes("high")) return "높음";
  if (raw.includes("medium") || raw.includes("moderate")) return "중간";
  if (raw.includes("low")) return "낮음";
  return value || "-";
}

function gradeTone(value?: string | null) {
  const raw = String(value || "").toLowerCase();

  if (raw.includes("critical")) {
    return "border-violet-200 bg-violet-50 text-violet-700";
  }
  if (raw.includes("high")) {
    return "border-rose-200 bg-rose-50 text-rose-700";
  }
  if (raw.includes("medium") || raw.includes("moderate")) {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }
  return "border-sky-200 bg-sky-50 text-sky-700";
}

function signalLabel(signalType?: string | null) {
  const value = (signalType || "").toLowerCase();

  if (value.includes("short_lived")) return "단기소멸";
  if (value.includes("closure")) return "폐업급증";
  if (value.includes("overheat")) return "과열진입";
  if (value.includes("shrink")) return "순감소";
  if (value.includes("high")) return "고위험";
  if (value.includes("alert")) return "주의";
  return "관찰";
}

function signalTone(signalType?: string | null) {
  const value = (signalType || "").toLowerCase();

  if (value.includes("closure") || value.includes("high")) {
    return "border-rose-200 bg-rose-50 text-rose-700";
  }
  if (value.includes("shrink") || value.includes("short_lived")) {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }
  if (value.includes("overheat")) {
    return "border-violet-200 bg-violet-50 text-violet-700";
  }
  return "border-sky-200 bg-sky-50 text-sky-700";
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
    return "border-blue-200 bg-blue-50 text-blue-700";
  }
  if (raw.includes("worry") || raw.includes("question")) {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }
  return "border-sky-200 bg-white text-slate-700";
}

function scorePanelTone(score: number | null) {
  if (score == null) return "border-sky-200 bg-white text-slate-700";
  if (score >= 80) return "border-rose-200 bg-rose-50 text-rose-700";
  if (score >= 60) return "border-amber-200 bg-amber-50 text-amber-700";
  if (score >= 40) return "border-sky-200 bg-sky-50 text-sky-700";
  return "border-blue-200 bg-blue-50 text-blue-700";
}

function buildSignalText(row: PresentedSignal) {
  return row.title || row.summary || "최근 위험 시그널이 감지되었습니다.";
}

function buildRegionWriteHref(
  regionCode: string,
  regionName: string,
  signal?: PresentedSignal | null,
) {
  if (signal) return buildCommunityWriteHref(signal);

  return buildCommunityComposeHref({
    type: "story",
    regionCode,
    regionName,
    externalQuery: regionName || regionCode,
  });
}

function loginAwareHref(href: string, isLoggedIn: boolean) {
  return isLoggedIn ? href : `/auth/login?next=${encodeURIComponent(href)}`;
}

function topCauseLabels(map: Map<string, number>) {
  return Array.from(map.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([label]) => label);
}

function buildInterpretation(input: {
  avgRisk: number;
  dropCount: number;
  riseCount: number;
  nowCount: number;
  reboundCount: number;
}) {
  const { avgRisk, dropCount, riseCount, nowCount, reboundCount } = input;

  if (reboundCount > 0 && dropCount > riseCount) {
    return "하락 구간이 많지만 일부 업종에서 반등 조짐도 보입니다. 급락 업종과 회복 업종을 같이 봐야 합니다.";
  }

  if (dropCount > riseCount && nowCount > 0) {
    return "하락 구간과 즉시 우선순위 업종이 많아 먼저 점검할 필요가 큰 지역입니다.";
  }

  if (riseCount > dropCount) {
    return "상승 흐름이 우세하지만 과열 여부와 유지 가능성을 같이 봐야 하는 지역입니다.";
  }

  if (avgRisk >= 40) {
    return "종합 위험도 기준으로 상대 비교가 필요한 지역입니다.";
  }

  return "현재는 관찰 중심으로 보면 되는 지역입니다.";
}

function buildRegionActionSummary(avgRisk: number, latestSignal: PresentedSignal | null) {
  if (latestSignal?.action) return latestSignal.action;
  if (avgRisk >= 80) return "상위 업종부터 모니터 인테이크를 시작하고 마지막 기회 후보를 먼저 검토하세요.";
  if (avgRisk >= 60) return "상위 위험 업종과 최근 시그널을 함께 보고 오늘 안에 인테이크 여부를 결정하세요.";
  return "신호가 있는 업종부터 확인하고 관찰 대상을 우선 정리하세요.";
}

function categoryPriority(row: CategoryAggregate) {
  if (row.avgRisk >= 80 || row.netChange30d < 0) return "now";
  if (row.avgRisk >= 60 || row.signalCount > 0) return "soon";
  return "watch";
}

function categoryPriorityLabel(value: CategoryAggregate["priority"]) {
  if (value === "now") return "바로 보기";
  if (value === "soon") return "오늘 확인";
  return "관찰";
}

function categoryPriorityTone(value: CategoryAggregate["priority"]) {
  if (value === "now") return "border-rose-200 bg-rose-50 text-rose-700";
  if (value === "soon") return "border-amber-200 bg-amber-50 text-amber-700";
  return "border-sky-200 bg-sky-50 text-sky-700";
}

function suggestedStage(avgRisk: number) {
  if (avgRisk >= 80) return "urgent";
  if (avgRisk >= 60) return "caution";
  return "observe";
}

function buildCategoryMonitorHref(
  regionCode: string,
  regionName: string,
  row: CategoryAggregate,
  isLoggedIn: boolean,
) {
  return loginAwareHref(
    buildMonitorPrefillHref({
      from: "region_detail",
      businessName: `${regionName} ${row.categoryName}`,
      regionCode,
      regionName,
      categoryId: row.categoryId,
      categoryName: row.categoryName,
      query: `${regionName} ${row.categoryName}`.trim(),
      stage: suggestedStage(row.avgRisk),
      reason: `region_${row.priority}`,
      score: row.avgRisk,
      trendKeywords: [regionName, row.categoryName, categoryPriorityLabel(row.priority)],
    }),
    isLoggedIn,
  );
}

function buildCategoryHref(regionCode: string, categoryId: string) {
  return `/regions/${encodeURIComponent(regionCode)}/${encodeURIComponent(categoryId)}`;
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
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <div className="text-[11px] font-black uppercase tracking-[0.18em] text-sky-700">
          {eyebrow}
        </div>
        <h1 className="mt-2 text-2xl font-black tracking-[-0.04em] text-slate-950 sm:text-3xl">
          {title}
        </h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

function StatCard({
  title,
  value,
  description,
  tone = "default",
}: {
  title: string;
  value: string;
  description: string;
  tone?: "default" | "danger" | "warning" | "info";
}) {
  const toneClass =
    tone === "danger"
      ? "border-rose-200 bg-rose-50"
      : tone === "warning"
        ? "border-amber-200 bg-amber-50"
        : tone === "info"
          ? "border-sky-200 bg-sky-50"
          : "border-sky-200 bg-white";

  return (
    <div className={`rounded-[24px] border p-4 shadow-sm ${toneClass}`}>
      <div className="text-xs font-semibold text-slate-600">{title}</div>
      <div className="mt-2 text-2xl font-black tracking-[-0.04em] text-slate-950">{value}</div>
      <div className="mt-1 text-xs leading-5 text-slate-500">{description}</div>
    </div>
  );
}

function EmptyPanel({ text }: { text: string }) {
  return (
    <div className="rounded-[24px] border border-dashed border-sky-200 bg-white px-4 py-8 text-sm text-slate-500">
      {text}
    </div>
  );
}

export default async function RegionDetailPage({ params }: PageProps) {
  const { regionCode } = await params;
  const supabase = await supabaseServer();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: scoreRows }, { data: signalRows }, { data: communityRows }] =
    await Promise.all([
      supabase
        .from("risk_scores")
        .select(
          "score_date, region_code, region_name, category_id, category_name, business_count, opened_count_30d, closed_count_30d, short_lived_count_30d, reopened_count_30d, net_change_30d, closure_rate_30d, short_lived_rate_30d, new_entry_rate_30d, closure_score, short_lived_score, shrink_score, overheat_score, risk_score, risk_grade, personal_priority_label, sales_trend_status, top_cause_1, top_cause_2, top_cause_3",
        )
        .eq("region_code", regionCode)
        .order("score_date", { ascending: false })
        .limit(5000),

      supabase
        .from("risk_signals")
        .select("*")
        .eq("region_code", regionCode)
        .order("signal_date", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(20),

      supabase
        .from("v_community_posts_latest")
        .select("*")
        .eq("region_code", regionCode)
        .order("created_at", { ascending: false })
        .limit(8),
    ]);

  const allScores = (scoreRows ?? []) as RiskScoreRow[];
  const rawSignals = (signalRows ?? []) as RawRiskSignalRow[];
  const community = (communityRows ?? []) as CommunityRow[];

  const signals = rawSignals
    .map((row) => {
      try {
        return presentRiskSignal(row);
      } catch {
        return null;
      }
    })
    .filter((item): item is PresentedSignal => item !== null);

  const latestScoreDate =
    allScores
      .map((row) => row.score_date)
      .filter((value): value is string => Boolean(value))
      .sort((a, b) => (a < b ? 1 : -1))[0] ?? null;

  const latestScores = latestScoreDate
    ? allScores.filter((row) => row.score_date === latestScoreDate)
    : allScores;

  const regionName =
    text(latestScores[0]?.region_name, signals[0]?.regionName, regionCode) || regionCode;

  if (latestScores.length === 0 && signals.length === 0 && community.length === 0) {
    notFound();
  }

  const avgRisk =
    latestScores.length > 0
      ? latestScores.reduce((sum, row) => sum + num(row.risk_score), 0) / latestScores.length
      : 0;

  const totalBusinessCount = latestScores.reduce(
    (sum, row) => sum + num(row.business_count),
    0,
  );

  const nowCount = latestScores.filter(
    (row) => String(row.personal_priority_label || "").toLowerCase() === "now",
  ).length;

  const soonCount = latestScores.filter(
    (row) => String(row.personal_priority_label || "").toLowerCase() === "soon",
  ).length;

  const dropCount = latestScores.filter((row) =>
    ["drop", "sharp_drop"].includes(String(row.sales_trend_status || "").toLowerCase()),
  ).length;

  const riseCount = latestScores.filter((row) =>
    ["rise", "sharp_rise", "rebound"].includes(String(row.sales_trend_status || "").toLowerCase()),
  ).length;

  const reboundCount = latestScores.filter(
    (row) => String(row.sales_trend_status || "").toLowerCase() === "rebound",
  ).length;

  const highRiskCategories = latestScores.filter((row) => num(row.risk_score) >= 60).length;

  const latestSignal = signals[0] ?? null;

  const regionWhy = latestSignal?.why || buildInterpretation({
    avgRisk,
    dropCount,
    riseCount,
    nowCount,
    reboundCount,
  });

  const regionAction = buildRegionActionSummary(avgRisk, latestSignal);

  const topCauseMap = new Map<string, number>();
  for (const row of latestScores) {
    for (const cause of [row.top_cause_1, row.top_cause_2, row.top_cause_3]) {
      const label = text(cause);
      if (!label) continue;
      topCauseMap.set(label, (topCauseMap.get(label) ?? 0) + 1);
    }
  }
  const regionTopCauses = topCauseLabels(topCauseMap);

  const signalMapByCategory = new Map<string, PresentedSignal[]>();
  for (const signal of signals) {
    const key = text(signal.categoryId, signal.categoryName);
    if (!key) continue;
    const bucket = signalMapByCategory.get(key) ?? [];
    bucket.push(signal);
    signalMapByCategory.set(key, bucket);
  }

  const categoryMap = new Map<string, CategoryAggregate>();

  for (const row of latestScores) {
    const key =
      text(row.category_id, row.category_name) ||
      `unknown-${Math.random().toString(36).slice(2)}`;

    const current =
      categoryMap.get(key) ??
      ({
        categoryId: text(row.category_id, row.category_name),
        categoryName: text(row.category_name, row.category_id, "업종 미지정"),
        avgRisk: 0,
        businessCount: 0,
        signalCount: 0,
        netChange30d: 0,
        closureScore: 0,
        shrinkScore: 0,
        shortLivedScore: 0,
        overheatScore: 0,
        riskGrade: text(row.risk_grade, "low"),
        topCauseLabels: [],
        priority: "watch",
      } satisfies CategoryAggregate);

    current.avgRisk = num(row.risk_score);
    current.businessCount = num(row.business_count);
    current.netChange30d = num(row.net_change_30d);
    current.closureScore = num(row.closure_score);
    current.shrinkScore = num(row.shrink_score);
    current.shortLivedScore = num(row.short_lived_score);
    current.overheatScore = num(row.overheat_score);
    current.riskGrade = text(row.risk_grade, current.riskGrade);

    const causes = [row.top_cause_1, row.top_cause_2, row.top_cause_3]
      .map((item) => text(item))
      .filter(Boolean);

    current.topCauseLabels = Array.from(new Set(causes)).slice(0, 3);

    const relatedSignals =
      signalMapByCategory.get(current.categoryId) ??
      signalMapByCategory.get(current.categoryName) ??
      [];

    current.signalCount = relatedSignals.length;
    current.priority = categoryPriority(current);

    categoryMap.set(key, current);
  }

  const categories = Array.from(categoryMap.values()).sort((a, b) => {
    const priorityOrder = { now: 0, soon: 1, watch: 2 };
    if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    }
    if (b.avgRisk !== a.avgRisk) return b.avgRisk - a.avgRisk;
    if (a.netChange30d !== b.netChange30d) return a.netChange30d - b.netChange30d;
    return b.businessCount - a.businessCount;
  });

  const regionMonitorHref = loginAwareHref(
    buildMonitorPrefillHref({
      from: "region_detail",
      businessName: regionName,
      regionCode,
      regionName,
      query: regionName,
      stage: suggestedStage(avgRisk),
      reason: latestSignal?.signalType ?? "region_summary",
      score: avgRisk,
      trendKeywords: [regionName, ...regionTopCauses].filter(Boolean),
    }),
    Boolean(user),
  );

  const regionCommunityHref = loginAwareHref(
    buildRegionWriteHref(regionCode, regionName, latestSignal),
    Boolean(user),
  );

  return (
    <main className="min-h-screen bg-white text-slate-900">
      <section className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        <div className="space-y-5">
          <section className="rounded-[28px] border border-sky-100 bg-sky-50 p-5 shadow-[0_12px_30px_rgba(14,165,233,0.08)] sm:p-6">
            <SectionTitle
              eyebrow="Region Action Board"
              title={`${regionName} 지역 운영 큐`}
              description="지역 소개보다 지금 개입이 필요한 업종과 신호가 먼저 보이도록 구성했습니다."
              action={
                <div className="flex flex-wrap gap-2">
                  <Link
                    href="/regions"
                    className="inline-flex h-10 items-center rounded-2xl border border-sky-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:border-sky-300 hover:bg-sky-50"
                  >
                    지역 전체
                  </Link>
                  <Link
                    href={`/signals?q=${encodeURIComponent(regionName)}`}
                    className="inline-flex h-10 items-center rounded-2xl border border-sky-600 bg-sky-600 px-4 text-sm font-semibold text-white transition hover:bg-sky-700"
                  >
                    관련 시그널
                  </Link>
                </div>
              }
            />

            <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
              <StatCard
                title="평균 위험"
                value={formatScore(avgRisk)}
                description={latestScoreDate ? `${formatDate(latestScoreDate)} 기준` : "기준일 없음"}
                tone={avgRisk >= 80 ? "danger" : avgRisk >= 60 ? "warning" : "info"}
              />
              <StatCard
                title="바로 보기 업종"
                value={formatNumber(nowCount)}
                description="즉시 확인 우선 업종"
                tone={nowCount > 0 ? "danger" : "default"}
              />
              <StatCard
                title="오늘 확인 업종"
                value={formatNumber(soonCount)}
                description="오늘 안에 볼 업종"
                tone={soonCount > 0 ? "warning" : "default"}
              />
              <StatCard
                title="고위험 업종"
                value={formatNumber(highRiskCategories)}
                description="위험 60점 이상"
                tone={highRiskCategories > 0 ? "info" : "default"}
              />
              <StatCard
                title="전체 사업체"
                value={formatNumber(totalBusinessCount)}
                description="최신 집계 기준"
              />
            </div>
          </section>

          <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
            <section className="space-y-5">
              <section className="rounded-[28px] border border-sky-100 bg-sky-50 p-5 shadow-[0_12px_30px_rgba(14,165,233,0.08)] sm:p-6">
                <div className="grid gap-4 lg:grid-cols-2">
                  <div className="rounded-[24px] border border-rose-200 bg-rose-50 p-5">
                    <div className="text-[11px] font-black uppercase tracking-[0.14em] text-rose-700">
                      왜 지금 봐야 하나
                    </div>
                    <p className="mt-3 text-sm leading-7 text-slate-700">{regionWhy}</p>
                  </div>

                  <div className="rounded-[24px] border border-sky-200 bg-white p-5">
                    <div className="text-[11px] font-black uppercase tracking-[0.14em] text-sky-700">
                      바로 할 액션
                    </div>
                    <p className="mt-3 text-sm leading-7 text-slate-700">{regionAction}</p>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {regionTopCauses.map((cause) => (
                    <span
                      key={cause}
                      className="rounded-full border border-sky-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700"
                    >
                      {cause}
                    </span>
                  ))}
                </div>

                <div className="mt-5 grid gap-3 md:grid-cols-3">
                  <Link
                    href={regionMonitorHref}
                    className="rounded-[22px] border border-sky-600 bg-sky-600 p-4 text-white transition hover:bg-sky-700"
                  >
                    <div className="text-sm font-black">지역 모니터 인테이크</div>
                    <p className="mt-2 text-sm leading-6 text-white/90">
                      지역 전체를 운영 대상으로 만들고 추적을 시작합니다.
                    </p>
                  </Link>

                  <Link
                    href={regionCommunityHref}
                    className="rounded-[22px] border border-sky-200 bg-white p-4 text-slate-800 transition hover:border-sky-300 hover:bg-sky-50"
                  >
                    <div className="text-sm font-black">커뮤니티 연결</div>
                    <p className="mt-2 text-sm leading-6">
                      지역 현장 의견이나 추가 맥락을 바로 질문으로 넘깁니다.
                    </p>
                  </Link>

                  <Link
                    href={`/rankings?region=${encodeURIComponent(regionCode)}`}
                    className="rounded-[22px] border border-sky-200 bg-white p-4 text-slate-800 transition hover:border-sky-300 hover:bg-sky-50"
                  >
                    <div className="text-sm font-black">랭킹으로 보기</div>
                    <p className="mt-2 text-sm leading-6">
                      같은 지역의 업종 순위를 다시 비교합니다.
                    </p>
                  </Link>
                </div>
              </section>

              <section className="rounded-[28px] border border-sky-100 bg-sky-50 p-5 shadow-[0_12px_30px_rgba(14,165,233,0.08)] sm:p-6">
                <SectionTitle
                  eyebrow="Category Queue"
                  title="지금 먼저 볼 업종"
                  description="지역 안에서도 액션 우선 업종이 먼저 보이도록 정렬했습니다."
                />

                <div className="mt-5 space-y-3">
                  {categories.length > 0 ? (
                    categories.map((row) => (
                      <article
                        key={`${row.categoryId}-${row.categoryName}`}
                        className="rounded-[24px] border border-sky-200 bg-white p-4"
                      >
                        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span
                                className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${categoryPriorityTone(
                                  row.priority,
                                )}`}
                              >
                                {categoryPriorityLabel(row.priority)}
                              </span>
                              <span
                                className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${gradeTone(
                                  row.riskGrade,
                                )}`}
                              >
                                {gradeLabel(row.riskGrade)}
                              </span>
                              <span
                                className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${scorePanelTone(
                                  row.avgRisk,
                                )}`}
                              >
                                위험 {formatScore(row.avgRisk)}
                              </span>
                            </div>

                            <h3 className="mt-3 text-lg font-black tracking-[-0.02em] text-slate-950">
                              {row.categoryName}
                            </h3>

                            <p className="mt-2 text-sm leading-6 text-slate-600">
                              사업체 {formatNumber(row.businessCount)} · 시그널 {formatNumber(row.signalCount)} ·
                              30일 순변화 {formatSigned(row.netChange30d)}
                            </p>

                            <div className="mt-3 flex flex-wrap gap-2">
                              {row.topCauseLabels.map((cause) => (
                                <span
                                  key={cause}
                                  className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-medium text-slate-600"
                                >
                                  {cause}
                                </span>
                              ))}
                            </div>

                            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                              <div className={`rounded-2xl border px-3 py-2.5 ${scorePanelTone(row.closureScore)}`}>
                                <div className="text-[11px] font-semibold opacity-80">폐업</div>
                                <div className="mt-1 text-base font-black">{formatScore(row.closureScore)}</div>
                              </div>
                              <div className={`rounded-2xl border px-3 py-2.5 ${scorePanelTone(row.shrinkScore)}`}>
                                <div className="text-[11px] font-semibold opacity-80">순감소</div>
                                <div className="mt-1 text-base font-black">{formatScore(row.shrinkScore)}</div>
                              </div>
                              <div className={`rounded-2xl border px-3 py-2.5 ${scorePanelTone(row.shortLivedScore)}`}>
                                <div className="text-[11px] font-semibold opacity-80">단기소멸</div>
                                <div className="mt-1 text-base font-black">{formatScore(row.shortLivedScore)}</div>
                              </div>
                              <div className={`rounded-2xl border px-3 py-2.5 ${scorePanelTone(row.overheatScore)}`}>
                                <div className="text-[11px] font-semibold opacity-80">과열</div>
                                <div className="mt-1 text-base font-black">{formatScore(row.overheatScore)}</div>
                              </div>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-2 xl:w-[240px] xl:grid-cols-1">
                            <Link
                              href={buildCategoryHref(regionCode, row.categoryId)}
                              className="inline-flex h-10 items-center justify-center rounded-2xl border border-sky-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:border-sky-300 hover:bg-sky-50"
                            >
                              업종 상세
                            </Link>

                            <Link
                              href={buildCategoryMonitorHref(regionCode, regionName, row, Boolean(user))}
                              className="inline-flex h-10 items-center justify-center rounded-2xl border border-sky-600 bg-sky-600 px-4 text-sm font-semibold text-white transition hover:bg-sky-700"
                            >
                              모니터 인테이크
                            </Link>
                          </div>
                        </div>
                      </article>
                    ))
                  ) : (
                    <EmptyPanel text="표시할 업종 데이터가 없습니다." />
                  )}
                </div>
              </section>

              <section className="rounded-[28px] border border-sky-100 bg-sky-50 p-5 shadow-[0_12px_30px_rgba(14,165,233,0.08)] sm:p-6">
                <SectionTitle
                  eyebrow="Signals"
                  title="최근 지역 시그널"
                  description="지역 단위로 감지된 최신 신호를 바로 읽을 수 있게 압축했습니다."
                />

                <div className="mt-5 space-y-3">
                  {signals.length > 0 ? (
                    signals.slice(0, 8).map((signal) => (
                      <article
                        key={String(signal.id)}
                        className="rounded-[22px] border border-sky-200 bg-white p-4"
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
                          <span className="rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-[11px] text-slate-500">
                            {formatRelativeDate(signal.createdAt || signal.signalDate || signal.scoreDate)}
                          </span>
                        </div>

                        <div className="mt-3 text-lg font-black tracking-[-0.02em] text-slate-950">
                          {buildSignalText(signal)}
                        </div>

                        <p className="mt-2 text-sm leading-6 text-slate-600">
                          {signal.why || signal.summary}
                        </p>

                        <div className="mt-3 flex flex-wrap gap-2">
                          {signal.categoryName ? (
                            <span className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs text-slate-600">
                              {signal.categoryName}
                            </span>
                          ) : null}
                          {signal.closeRiskCount != null ? (
                            <span className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs text-slate-600">
                              위험 {formatNumber(signal.closeRiskCount)}
                            </span>
                          ) : null}
                        </div>
                      </article>
                    ))
                  ) : (
                    <EmptyPanel text="최근 지역 시그널이 없습니다." />
                  )}
                </div>
              </section>
            </section>

            <aside className="space-y-5">
              <section className="rounded-[28px] border border-sky-100 bg-sky-50 p-5 shadow-[0_12px_30px_rgba(14,165,233,0.08)]">
                <div className="text-[11px] font-black uppercase tracking-[0.18em] text-sky-700">
                  Snapshot
                </div>
                <h2 className="mt-2 text-xl font-black tracking-[-0.03em] text-slate-950">
                  지역 스냅샷
                </h2>

                <div className="mt-4 space-y-3">
                  <div className={`rounded-2xl border p-4 ${scorePanelTone(avgRisk)}`}>
                    <div className="text-xs font-semibold opacity-80">평균 위험</div>
                    <div className="mt-1 text-2xl font-black">{formatScore(avgRisk)}</div>
                  </div>

                  <div className="rounded-2xl border border-sky-200 bg-white p-4">
                    <div className="text-xs font-semibold text-slate-500">하락 업종</div>
                    <div className="mt-1 text-2xl font-black text-slate-950">
                      {formatNumber(dropCount)}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-sky-200 bg-white p-4">
                    <div className="text-xs font-semibold text-slate-500">상승 업종</div>
                    <div className="mt-1 text-2xl font-black text-slate-950">
                      {formatNumber(riseCount)}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-sky-200 bg-white p-4">
                    <div className="text-xs font-semibold text-slate-500">반등 업종</div>
                    <div className="mt-1 text-2xl font-black text-slate-950">
                      {formatNumber(reboundCount)}
                    </div>
                  </div>
                </div>
              </section>

              <section className="rounded-[28px] border border-sky-100 bg-sky-50 p-5 shadow-[0_12px_30px_rgba(14,165,233,0.08)]">
                <div className="text-[11px] font-black uppercase tracking-[0.18em] text-sky-700">
                  Community
                </div>
                <h2 className="mt-2 text-xl font-black tracking-[-0.03em] text-slate-950">
                  최근 커뮤니티
                </h2>

                <div className="mt-4 space-y-3">
                  {community.length > 0 ? (
                    community.map((post) => (
                      <article
                        key={String(post.id)}
                        className="rounded-2xl border border-sky-200 bg-white p-4"
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${topicTone(
                              post.topic,
                            )}`}
                          >
                            {topicLabel(post.topic)}
                          </span>
                          <span className="rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-[11px] text-slate-500">
                            {formatRelativeDate(post.created_at)}
                          </span>
                        </div>

                        <div className="mt-3 text-sm font-black text-slate-950">
                          {text(post.title, "제목 없음")}
                        </div>

                        <p className="mt-2 text-sm leading-6 text-slate-600">
                          {summarizeText(text(post.body, post.content))}
                        </p>

                        <div className="mt-3 text-xs text-slate-500">
                          댓글 {formatNumber(post.comment_count)} · 관심도 {formatNumber(post.popularity_score)}
                        </div>
                      </article>
                    ))
                  ) : (
                    <EmptyPanel text="최근 커뮤니티 글이 없습니다." />
                  )}
                </div>
              </section>
            </aside>
          </div>
        </div>
      </section>
    </main>
  );
}
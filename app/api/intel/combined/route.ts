import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/close-signal/supabase-admin";
import { buildCombinedIntelResult } from "@/lib/close-signal/intel-kosis";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type IntegratedBaselineRow = {
  snapshot_date: string | null;
  region_code: string;
  region_name: string | null;
  category_id: number;
  category_name: string | null;

  smallbiz_risk_score: number | null;
  smallbiz_close_rate_7d: number | null;
  smallbiz_close_rate_30d: number | null;
  smallbiz_open_rate_7d: number | null;
  smallbiz_open_rate_30d: number | null;
  smallbiz_net_change_7d: number | null;
  smallbiz_net_change_30d: number | null;
  smallbiz_risk_delta_7d: number | null;
  smallbiz_risk_delta_30d: number | null;

  kosis_pressure_score: number | null;
  kosis_pressure_grade: string | null;
  kosis_closed_total: number | null;
  kosis_national_share_pct: number | null;
  kosis_yoy_closed_delta_pct: number | null;

  nts_business_score: number | null;

  integrated_market_score: number | null;
  integrated_final_score: number | null;

  summary_text: string | null;
  reason_codes: string[] | null;
  raw_payload: Record<string, unknown> | null;
};

type SignalRow = {
  id?: number | string;
  signal_date?: string | null;
  score_date?: string | null;
  signal_type?: string | null;
  signal_level?: string | null;
  title?: string | null;
  message?: string | null;
  risk_score?: number | null;
};

type CombinedPostBody = {
  groupName?: unknown;
  query?: unknown;
  businessName?: unknown;
  regionName?: unknown;
  categoryName?: unknown;
  address?: unknown;
  keywords?: unknown;
};

function asArray<T = unknown>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

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

  return null;
}

function num(value: number | null | undefined, fallback = 0) {
  return value === null || value === undefined || Number.isNaN(value)
    ? fallback
    : Number(value);
}

function formatPercent(value: number | null | undefined, digits = 1) {
  if (value === null || value === undefined) return "-";
  return `${Number(value).toFixed(digits)}%`;
}

function formatScore(value: number | null | undefined, digits = 0) {
  if (value === null || value === undefined) return "-";
  return Number(value).toFixed(digits);
}

function pressureLabel(grade: string | null | undefined) {
  const value = String(grade || "").toLowerCase();

  if (value === "critical") return "치명";
  if (value === "high") return "높음";
  if (value === "moderate") return "주의";
  return "관찰";
}

function ntsLabel(score: number | null | undefined) {
  const n = num(score, 0);

  if (score === null || score === undefined) return "없음";
  if (n >= 70) return "약화";
  if (n >= 50) return "경계";
  if (n >= 35) return "주의";
  return "양호";
}

function humanReason(code: string) {
  switch (code) {
    case "external_closure_pressure_high":
      return "외부폐업압력 높음";
    case "external_closure_pressure_moderate":
      return "외부폐업압력 주의";
    case "live_closure_rate_rising":
      return "폐업가속";
    case "net_business_decline":
      return "순감소";
    case "close_open_ratio_unfavorable":
      return "폐업/개업비 악화";
    case "competition_density_high":
      return "경쟁과밀";
    case "nts_business_weak":
      return "NTS 약화";
    case "nts_business_moderate":
      return "NTS 경계";
    case "market_risk_high":
      return "시장위험 높음";
    default:
      return code;
  }
}

function deriveRecoveryDirection(row: IntegratedBaselineRow) {
  const reasons = row.reason_codes ?? [];
  const actions: string[] = [];

  if (reasons.includes("nts_business_weak") || reasons.includes("nts_business_moderate")) {
    actions.push("고정비·세무 체력부터 점검");
  }

  if (reasons.includes("external_closure_pressure_high")) {
    actions.push("확장보다 손실 통제와 방어 운영");
  }

  if (reasons.includes("live_closure_rate_rising")) {
    actions.push("폐업가속 원인 차단이 우선");
  }

  if (reasons.includes("net_business_decline")) {
    actions.push("저효율 상품·시간대 정리");
  }

  if (reasons.includes("competition_density_high")) {
    actions.push("차별 포지션 재설계");
  }

  if (reasons.includes("close_open_ratio_unfavorable")) {
    actions.push("신규유입 메시지·전환 개선");
  }

  if (actions.length === 0) {
    return ["기본 운영지표 유지 관찰"];
  }

  return actions.slice(0, 3);
}

function buildSeverity(score: number | null | undefined) {
  const n = num(score, 0);
  if (n >= 80) return "critical";
  if (n >= 65) return "high";
  if (n >= 45) return "moderate";
  return "observe";
}

function buildHeadline(row: IntegratedBaselineRow) {
  const regionName = row.region_name ?? row.region_code;
  const categoryName = row.category_name ?? String(row.category_id);
  const severity = buildSeverity(row.integrated_final_score);

  if (severity === "critical") {
    return `${regionName} · ${categoryName}는 즉시 개입이 필요한 위험 구간입니다.`;
  }
  if (severity === "high") {
    return `${regionName} · ${categoryName}는 높은 위험 구간으로 빠른 대응이 필요합니다.`;
  }
  if (severity === "moderate") {
    return `${regionName} · ${categoryName}는 주의 구간이며 선제 조정이 필요합니다.`;
  }
  return `${regionName} · ${categoryName}는 현재 관찰 구간입니다.`;
}

async function getIntegratedRow(regionCode: string, categoryId: number) {
  const supabase = createSupabaseAdmin();

  const { data, error } = await supabase
    .from("integrated_region_category_baselines")
    .select("*")
    .eq("region_code", regionCode)
    .eq("category_id", categoryId)
    .order("snapshot_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? null) as IntegratedBaselineRow | null;
}

async function getSignals(regionCode: string, categoryId: number, limit = 5) {
  const supabase = createSupabaseAdmin();

  const { data, error } = await supabase.rpc("get_risk_signals_feed", {
    p_region_code: regionCode,
    p_category_id: categoryId,
    p_limit: limit,
  });

  if (error) {
    return [] as SignalRow[];
  }

  return (data ?? []) as SignalRow[];
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    const regionCode = String(searchParams.get("regionCode") || "").trim();
    const categoryId = Number(searchParams.get("categoryId") || "");

    if (!regionCode || !Number.isFinite(categoryId)) {
      return NextResponse.json(
        {
          ok: false,
          error: "regionCode and categoryId are required",
        },
        { status: 400 },
      );
    }

    const [row, signals] = await Promise.all([
      getIntegratedRow(regionCode, categoryId),
      getSignals(regionCode, categoryId, 5),
    ]);

    if (!row) {
      return NextResponse.json(
        {
          ok: false,
          error: "Integrated baseline not found",
        },
        { status: 404 },
      );
    }

    const recoveryDirections = deriveRecoveryDirection(row);
    const reasonLabels = (row.reason_codes ?? []).map(humanReason);

    return NextResponse.json({
      ok: true,
      regionCode,
      categoryId,
      snapshotDate: row.snapshot_date,
      headline: buildHeadline(row),
      integrated: {
        finalScore: row.integrated_final_score,
        marketScore: row.integrated_market_score,
        severity: buildSeverity(row.integrated_final_score),
        summaryText: row.summary_text,
      },
      components: {
        smallbiz: {
          score: row.smallbiz_risk_score,
          closeRate7d: row.smallbiz_close_rate_7d,
          closeRate30d: row.smallbiz_close_rate_30d,
          openRate7d: row.smallbiz_open_rate_7d,
          openRate30d: row.smallbiz_open_rate_30d,
          netChange7d: row.smallbiz_net_change_7d,
          netChange30d: row.smallbiz_net_change_30d,
          riskDelta7d: row.smallbiz_risk_delta_7d,
          riskDelta30d: row.smallbiz_risk_delta_30d,
        },
        kosis: {
          pressureScore: row.kosis_pressure_score,
          pressureGrade: row.kosis_pressure_grade,
          pressureLabel: pressureLabel(row.kosis_pressure_grade),
          closedTotal: row.kosis_closed_total,
          nationalSharePct: row.kosis_national_share_pct,
          yoyClosedDeltaPct: row.kosis_yoy_closed_delta_pct,
          summary: `외부 폐업압력 ${pressureLabel(row.kosis_pressure_grade)} · 전국비중 ${formatPercent(
            row.kosis_national_share_pct,
            2,
          )}`,
        },
        nts: {
          score: row.nts_business_score,
          label: ntsLabel(row.nts_business_score),
          summary: `NTS 사업장 체력 ${ntsLabel(row.nts_business_score)} · ${formatScore(
            row.nts_business_score,
            0,
          )}`,
        },
      },
      interpretation: {
        reasons: row.reason_codes ?? [],
        reasonLabels,
        recoveryDirections,
      },
      signals,
      raw: row.raw_payload ?? {},
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = ((await request.json().catch(() => ({}))) ?? {}) as CombinedPostBody;

    const query = text(body.query);
    const businessName = text(body.businessName);
    const regionName = text(body.regionName);
    const categoryName = text(body.categoryName);
    const address = text(body.address);
    const groupName =
      text(body.groupName, businessName, categoryName, query) || "monitor";

    const keywords = Array.from(
      new Set(
        [
          ...asArray(body.keywords),
          query,
          businessName,
          categoryName,
          [regionName, categoryName].filter(Boolean).join(" "),
        ]
          .map((value) => text(value))
          .filter((value): value is string => Boolean(value)),
      ),
    );

    if (!query && !businessName && !regionName && !categoryName && !address) {
      return NextResponse.json(
        {
          ok: false,
          error: "query, businessName, regionName, categoryName, address 중 하나는 필요합니다.",
        },
        { status: 400 },
      );
    }

    const result = await buildCombinedIntelResult({
      groupName,
      query,
      businessName,
      regionName,
      categoryName,
      address,
      keywords,
    });

    return NextResponse.json({
      ok: true,
      result,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "combined 처리 중 오류가 발생했습니다.",
      },
      { status: 500 },
    );
  }
}
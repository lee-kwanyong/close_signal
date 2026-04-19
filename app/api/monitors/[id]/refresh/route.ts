import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import {
  asRecord,
  extractScoresFromAny,
  normalizeStage,
  safeErrorMessage,
  toNumber,
} from "@/lib/close-signal/monitor-route-helpers";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
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

async function tryFetchCombined(
  origin: string,
  targetRow: Record<string, unknown>,
): Promise<{
  ok: boolean;
  payload: Record<string, unknown> | null;
  warning: string | null;
}> {
  const businessName = text(
    targetRow.business_name,
    targetRow.businessName,
    targetRow.name,
  );
  const address = text(
    targetRow.address,
    targetRow.road_address,
    targetRow.roadAddress,
  );
  const regionName = text(targetRow.region_name, targetRow.regionName);
  const categoryName = text(targetRow.category_name, targetRow.categoryName);
  const query = text(
    targetRow.primary_keyword,
    targetRow.primaryKeyword,
    [regionName, categoryName, businessName].filter(Boolean).join(" "),
  );

  if (!query && !address) {
    return {
      ok: false,
      payload: null,
      warning: "combined 호출용 검색어가 없어 fallback snapshot으로 저장했습니다.",
    };
  }

  try {
    const response = await fetch(`${origin}/api/intel/combined`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      cache: "no-store",
      body: JSON.stringify({
        query,
        address,
        businessName,
        regionName,
        categoryName,
      }),
    });

    const json = (await response.json().catch(() => null)) as Record<string, unknown> | null;

    if (!response.ok || !json || json.ok === false) {
      return {
        ok: false,
        payload: null,
        warning:
          typeof json?.error === "string"
            ? json.error
            : "combined 응답이 정상이 아니어서 fallback snapshot으로 저장했습니다.",
      };
    }

    const payload =
      asRecord(json.result).ok || Object.keys(asRecord(json.result)).length > 0
        ? asRecord(json.result)
        : json;

    return {
      ok: true,
      payload,
      warning: null,
    };
  } catch (error) {
    return {
      ok: false,
      payload: null,
      warning: safeErrorMessage(
        error,
        "combined 호출 중 오류가 발생해 fallback snapshot으로 저장했습니다.",
      ),
    };
  }
}

export async function POST(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const monitorId = toNumber(id);

  if (!monitorId) {
    return NextResponse.json(
      { ok: false, error: "유효한 모니터 ID가 아닙니다." },
      { status: 400 },
    );
  }

  const supabase = supabaseAdmin();
  const warnings: string[] = [];
  const now = new Date().toISOString();

  const { data: targetRow, error: targetError } = await supabase
    .from("external_intel_targets")
    .select("*")
    .eq("id", monitorId)
    .single();

  if (targetError || !targetRow) {
    return NextResponse.json(
      { ok: false, error: "모니터 대상을 찾지 못했습니다." },
      { status: 404 },
    );
  }

  const origin = new URL(request.url).origin;
  const combinedResult = await tryFetchCombined(origin, asRecord(targetRow));

  if (combinedResult.warning) {
    warnings.push(combinedResult.warning);
  }

  const fallbackPayload = {
    source: "manual_refresh_fallback",
    refreshed_at: now,
    monitor_id: monitorId,
    target: {
      business_name: text(
        targetRow.business_name,
        targetRow.businessName,
        targetRow.name,
      ),
      address: text(
        targetRow.address,
        targetRow.road_address,
        targetRow.roadAddress,
      ),
      region_name: text(targetRow.region_name, targetRow.regionName),
      category_name: text(targetRow.category_name, targetRow.categoryName),
    },
    scores: {
      market_risk_score: toNumber(
        targetRow.latest_market_risk_score ?? targetRow.market_risk_score,
      ),
      business_risk_score: toNumber(
        targetRow.latest_business_risk_score ?? targetRow.business_risk_score,
      ),
      rescue_chance_score: toNumber(
        targetRow.latest_rescue_chance_score ??
          targetRow.rescue_chance_score ??
          targetRow.recoverability_score,
      ),
      closing_risk_score: toNumber(
        targetRow.latest_closing_risk_score ?? targetRow.closing_risk_score,
      ),
    },
  };

  const rawPayload = combinedResult.payload ?? fallbackPayload;

  const scores = extractScoresFromAny(rawPayload, asRecord(targetRow));
  const stage = normalizeStage(
    scores.closingRiskScore,
    scores.businessRiskScore,
    scores.marketRiskScore,
  );

  let snapshotId: number | null = null;

  try {
    const snapshotInsert = await supabase
      .from("external_intel_snapshots")
      .insert({
        monitor_id: monitorId,
        raw_payload: rawPayload,
        captured_at: now,
      })
      .select("id")
      .single();

    if (snapshotInsert.error) {
      throw snapshotInsert.error;
    }

    snapshotId = toNumber(snapshotInsert.data?.id);
  } catch (error) {
    warnings.push(
      safeErrorMessage(error, "external_intel_snapshots 저장을 건너뛰었습니다."),
    );
  }

  try {
    const { error: updateError } = await supabase
      .from("external_intel_targets")
      .update({
        latest_stage: stage,
        latest_market_risk_score: scores.marketRiskScore,
        latest_business_risk_score: scores.businessRiskScore,
        latest_rescue_chance_score: scores.recoverabilityScore,
        latest_closing_risk_score: scores.closingRiskScore,
        updated_at: now,
      })
      .eq("id", monitorId);

    if (updateError) {
      throw updateError;
    }
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: safeErrorMessage(error, "모니터 최신 상태 업데이트에 실패했습니다."),
      },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    warnings,
    data: {
      monitorId,
      snapshotId,
      combinedOk: combinedResult.ok,
      stage,
      marketRiskScore: scores.marketRiskScore,
      businessRiskScore: scores.businessRiskScore,
      recoverabilityScore: scores.recoverabilityScore,
      closingRiskScore: scores.closingRiskScore,
    },
  });
}
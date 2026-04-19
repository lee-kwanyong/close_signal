import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import {
  asArray,
  asRecord,
  buildReasonRows,
  buildRecommendedActions,
  buildSnapshotSummary,
  dedupeStrings,
  extractScoresFromAny,
  fetchValidPlaybookCodes,
  normalizeStage,
  safeErrorMessage,
  toNumber,
} from "@/lib/close-signal/monitor-route-helpers";

export const dynamic = "force-dynamic";

type SnapshotRow = {
  id: number;
  created_at?: string | null;
};

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(_request: Request, context: RouteContext) {
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

  const { data: latestIntelRows } = await supabase
    .from("external_intel_snapshots")
    .select("*")
    .eq("monitor_id", monitorId)
    .order("captured_at", { ascending: false })
    .limit(1);

  const latestIntel = asArray<unknown>(latestIntelRows)[0] ?? null;
  const scores = extractScoresFromAny(
    latestIntel ? asRecord(latestIntel).raw_payload ?? latestIntel : null,
    asRecord(targetRow),
  );
  const stage = normalizeStage(
    scores.closingRiskScore,
    scores.businessRiskScore,
    scores.marketRiskScore,
  );

  let snapshotId: number | null = null;

  try {
    const reasonRows = buildReasonRows(scores);

    const snapshotInsert = await supabase
      .from("business_health_snapshots")
      .insert({
        monitor_id: monitorId,
        stage,
        market_risk_score: scores.marketRiskScore,
        business_risk_score: scores.businessRiskScore,
        rescue_chance_score: scores.recoverabilityScore,
        closing_risk_score: scores.closingRiskScore,
        summary: buildSnapshotSummary(scores),
        why_summary: reasonRows.map((reason) => reason.title).join(" · "),
        action_summary: reasonRows.map((reason) => reason.description).join(" · "),
        created_at: now,
      })
      .select("id")
      .single();

    if (snapshotInsert.error) {
      throw snapshotInsert.error;
    }

    snapshotId = toNumber(snapshotInsert.data?.id);
  } catch (error) {
    warnings.push(
      safeErrorMessage(error, "건강 스냅샷 저장 중 일부 항목을 건너뛰었습니다."),
    );
  }

  if (snapshotId) {
    try {
      const reasons = buildReasonRows(scores).map((reason) => ({
        snapshot_id: snapshotId,
        reason_code: reason.reason_code,
        layer: reason.layer,
        title: reason.title,
        description: reason.description,
        score: reason.score,
      }));

      if (reasons.length > 0) {
        const { error } = await supabase.from("business_snapshot_reasons").insert(reasons);
        if (error) throw error;
      }
    } catch (error) {
      warnings.push(
        safeErrorMessage(error, "원인 요약 저장 중 일부 항목을 건너뛰었습니다."),
      );
    }

    try {
      const previousSnapshotsRes = await supabase
        .from("business_health_snapshots")
        .select("id, created_at")
        .eq("monitor_id", monitorId)
        .order("created_at", { ascending: false })
        .limit(5);

      const previousSnapshots = asArray<SnapshotRow>(previousSnapshotsRes.data).filter(
        (row) => toNumber(row.id) != null && toNumber(row.id) !== snapshotId,
      );

      const previousSnapshotIds = previousSnapshots
        .map((row) => toNumber(row.id))
        .filter((value): value is number => value != null);

      let preservedStatusMap: Record<string, string> = {};

      if (previousSnapshotIds.length > 0) {
        const previousActionsRes = await supabase
          .from("snapshot_recommended_actions")
          .select("snapshot_id, playbook_code, status")
          .in("snapshot_id", previousSnapshotIds);

        preservedStatusMap = asArray<unknown>(previousActionsRes.data).reduce<Record<string, string>>(
          (acc, row) => {
            const record = asRecord(row);
            const playbookCode =
              typeof record.playbook_code === "string" ? record.playbook_code : null;
            const status = typeof record.status === "string" ? record.status : null;

            if (playbookCode && status && !acc[playbookCode]) {
              acc[playbookCode] = status;
            }

            return acc;
          },
          {},
        );
      }

      const validPlaybookCodes = await fetchValidPlaybookCodes(supabase);
      const actions = buildRecommendedActions(
        scores,
        validPlaybookCodes,
        preservedStatusMap,
      ).map((action) => ({
        snapshot_id: snapshotId,
        playbook_code: action.playbook_code,
        title: action.title,
        description: action.description,
        priority: action.priority,
        status: action.status,
        reason_code: action.reason_code,
      }));

      if (actions.length > 0) {
        const { error } = await supabase
          .from("snapshot_recommended_actions")
          .upsert(actions, {
            onConflict: "snapshot_id,playbook_code",
          });

        if (error) throw error;
      } else {
        warnings.push("연결 가능한 playbook이 없어 추천 액션 저장을 건너뛰었습니다.");
      }
    } catch (error) {
      warnings.push(
        safeErrorMessage(error, "추천 액션 저장 중 일부 항목을 건너뛰었습니다."),
      );
    }
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
    warnings: dedupeStrings(warnings),
    data: {
      monitorId,
      snapshotId,
      stage,
      marketRiskScore: scores.marketRiskScore,
      businessRiskScore: scores.businessRiskScore,
      recoverabilityScore: scores.recoverabilityScore,
      closingRiskScore: scores.closingRiskScore,
    },
  });
}
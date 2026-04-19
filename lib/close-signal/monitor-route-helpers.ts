import type { SupabaseClient } from "@supabase/supabase-js";

export type UnknownRecord = Record<string, unknown>;

export type HealthScores = {
  marketRiskScore: number | null;
  businessRiskScore: number | null;
  recoverabilityScore: number | null;
  closingRiskScore: number | null;
  summary: string | null;
  grade: "low" | "moderate" | "high";
};

export function asRecord(value: unknown): UnknownRecord {
  return value && typeof value === "object" ? (value as UnknownRecord) : {};
}

export function asArray<T = unknown>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

export function toText(...values: unknown[]): string | null {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
  }
  return null;
}

export function toNumber(...values: unknown[]): number | null {
  for (const value of values) {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim() !== "") {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) return parsed;
    }
  }
  return null;
}

export function clampNullableScore(value: unknown): number | null {
  const parsed = toNumber(value);
  if (parsed == null) return null;
  return Math.max(0, Math.min(100, Math.round(parsed * 10) / 10));
}

export function averageScore(...values: Array<number | null>): number | null {
  const valid = values.filter((value): value is number => value != null);
  if (valid.length === 0) return null;
  return Math.round((valid.reduce((sum, value) => sum + value, 0) / valid.length) * 10) / 10;
}

export function normalizeRiskGrade(
  grade: unknown,
  score?: unknown,
): "low" | "moderate" | "high" {
  const raw = String(grade ?? "").trim().toLowerCase();

  if (["low", "safe", "stable", "green", "good", "positive"].includes(raw)) {
    return "low";
  }

  if (["moderate", "medium", "caution", "warn", "warning", "amber", "neutral"].includes(raw)) {
    return "moderate";
  }

  if (["high", "critical", "danger", "risk", "red", "negative"].includes(raw)) {
    return "high";
  }

  const numericScore = toNumber(score);
  if (numericScore != null) {
    if (numericScore >= 67) return "high";
    if (numericScore >= 34) return "moderate";
    return "low";
  }

  return "moderate";
}

export function normalizeStage(
  closingRiskScore: number | null,
  businessRiskScore: number | null,
  marketRiskScore: number | null,
): "observe" | "caution" | "critical" {
  const closing = closingRiskScore ?? 0;
  const business = businessRiskScore ?? 0;
  const market = marketRiskScore ?? 0;

  if (closing >= 80 || business >= 80 || market >= 80) return "critical";
  if (closing >= 60 || business >= 60 || market >= 60) return "caution";
  return "observe";
}

export function dedupeStrings(values: Array<string | null | undefined>): string[] {
  return Array.from(
    new Set(
      values
        .map((value) => (typeof value === "string" ? value.trim() : ""))
        .filter(Boolean),
    ),
  );
}

export function safeErrorMessage(error: unknown, fallback: string): string {
  const message = error instanceof Error ? error.message : String(error ?? "");

  if (!message.trim()) return fallback;

  const lower = message.toLowerCase();

  if (lower.includes("snapshot_recommended_actions_playbook_code_fkey")) {
    return "추천 액션 playbook 연결값이 맞지 않아 일부 액션 저장을 건너뛰었습니다.";
  }

  if (lower.includes("external_intel_snapshots_grade_check")) {
    return "외부 분석 등급값이 저장 형식과 맞지 않아 일부 스냅샷 저장을 건너뛰었습니다.";
  }

  if (lower.includes("violates foreign key constraint")) {
    return "연결 데이터가 맞지 않아 일부 저장을 건너뛰었습니다.";
  }

  if (lower.includes("violates check constraint")) {
    return "저장 형식이 맞지 않은 값이 있어 일부 저장을 건너뛰었습니다.";
  }

  if (lower.includes("failed to fetch") || lower.includes("networkerror")) {
    return "서버 연결이 원활하지 않습니다. 잠시 후 다시 시도해 주세요.";
  }

  return fallback;
}

export function buildIntelRequestPayload(target: UnknownRecord) {
  return {
    monitorId: toNumber(target.id),
    businessName: toText(
      target.business_name,
      target.businessName,
      target.name,
      target.company_name,
      target.companyName,
    ),
    address: toText(target.address, target.road_address, target.roadAddress),
    regionName: toText(target.region_name, target.regionName),
    categoryName: toText(target.category_name, target.categoryName),
    query: toText(target.external_query, target.externalQuery, target.query, target.keyword),
  };
}

export function extractScoresFromAny(
  rawPayload: unknown,
  fallbackRow?: UnknownRecord,
): HealthScores {
  const root = asRecord(rawPayload);
  const data = asRecord(root.data);
  const result = asRecord(root.result);
  const combined = asRecord(root.combined);
  const marketNode = asRecord(root.market ?? combined.market ?? data.market ?? result.market);
  const businessNode = asRecord(root.business ?? combined.business ?? data.business ?? result.business);
  const structureNode = asRecord(
    root.structure ?? combined.structure ?? data.structure ?? result.structure,
  );
  const closingNode = asRecord(root.closing ?? combined.closing ?? data.closing ?? result.closing);

  const fallback = fallbackRow ?? {};

  const marketRiskScore = clampNullableScore(
    toNumber(
      root.marketRiskScore,
      root.market_risk_score,
      combined.marketRiskScore,
      combined.market_risk_score,
      marketNode.score,
      marketNode.risk_score,
      fallback.latest_market_risk_score,
      fallback.market_risk_score,
    ),
  );

  const businessRiskScore = clampNullableScore(
    toNumber(
      root.businessRiskScore,
      root.business_risk_score,
      combined.businessRiskScore,
      combined.business_risk_score,
      businessNode.score,
      businessNode.risk_score,
      fallback.latest_business_risk_score,
      fallback.business_risk_score,
    ),
  );

  const recoverabilityScore = clampNullableScore(
    toNumber(
      root.recoverabilityScore,
      root.recoverability_score,
      root.rescueChanceScore,
      root.rescue_chance_score,
      combined.recoverabilityScore,
      combined.recoverability_score,
      combined.rescueChanceScore,
      combined.rescue_chance_score,
      structureNode.score,
      structureNode.recoverability_score,
      structureNode.rescue_chance_score,
      fallback.latest_rescue_chance_score,
      fallback.rescue_chance_score,
      fallback.recoverability_score,
    ),
  );

  const closingRiskScore = clampNullableScore(
    toNumber(
      root.closingRiskScore,
      root.closing_risk_score,
      root.finalClosingRiskScore,
      root.final_closing_risk_score,
      combined.closingRiskScore,
      combined.closing_risk_score,
      closingNode.score,
      closingNode.risk_score,
      fallback.latest_closing_risk_score,
      fallback.closing_risk_score,
      fallback.final_closing_risk_score,
    ) ??
      averageScore(marketRiskScore, businessRiskScore, recoverabilityScore == null ? null : 100 - recoverabilityScore),
  );

  const summary = toText(
    root.summary,
    combined.summary,
    closingNode.summary,
    fallback.latest_summary,
  );

  const grade = normalizeRiskGrade(
    toText(root.grade, root.risk_grade, combined.grade, combined.risk_grade, closingNode.grade),
    closingRiskScore,
  );

  return {
    marketRiskScore,
    businessRiskScore,
    recoverabilityScore,
    closingRiskScore,
    summary,
    grade,
  };
}

export function buildSnapshotSummary(scores: HealthScores): string {
  const chunks: string[] = [];

  if (scores.marketRiskScore != null) chunks.push(`시장위험 ${scores.marketRiskScore}점`);
  if (scores.businessRiskScore != null) chunks.push(`사업장위험 ${scores.businessRiskScore}점`);
  if (scores.recoverabilityScore != null) chunks.push(`구조가능성 ${scores.recoverabilityScore}점`);
  if (scores.closingRiskScore != null) chunks.push(`최종 폐업위험 ${scores.closingRiskScore}점`);

  if (scores.summary) chunks.push(scores.summary);

  return chunks.join(" · ");
}

export function buildReasonRows(scores: HealthScores) {
  const reasons: Array<{
    reason_code: string;
    layer: string;
    title: string;
    description: string;
    score: number | null;
  }> = [];

  if ((scores.marketRiskScore ?? 0) >= 60) {
    reasons.push({
      reason_code: "market_risk_high",
      layer: "market",
      title: "시장위험이 높습니다",
      description: "상권 수요·유입·경쟁 흐름을 우선 점검해야 합니다.",
      score: scores.marketRiskScore,
    });
  }

  if ((scores.businessRiskScore ?? 0) >= 60) {
    reasons.push({
      reason_code: "business_risk_high",
      layer: "business",
      title: "사업장 운영위험이 높습니다",
      description: "현장 운영 상태와 내부 실행 이슈를 우선 확인해야 합니다.",
      score: scores.businessRiskScore,
    });
  }

  if (scores.recoverabilityScore != null && scores.recoverabilityScore < 40) {
    reasons.push({
      reason_code: "recoverability_low",
      layer: "structure",
      title: "구조가능성이 낮습니다",
      description: "회복 여력, 비용 구조, 사업 전환 가능성을 점검해야 합니다.",
      score: scores.recoverabilityScore,
    });
  }

  if ((scores.closingRiskScore ?? 0) >= 80) {
    reasons.push({
      reason_code: "closing_risk_critical",
      layer: "closing",
      title: "최종 폐업위험이 매우 높습니다",
      description: "즉시 개입과 마지막 기회 재평가가 필요한 상태입니다.",
      score: scores.closingRiskScore,
    });
  }

  if (reasons.length === 0) {
    reasons.push({
      reason_code: "monitoring_needed",
      layer: "observe",
      title: "지속 모니터링이 필요합니다",
      description: "급한 신호는 아니지만 최근 흐름을 추적해야 합니다.",
      score: scores.closingRiskScore,
    });
  }

  return reasons;
}

function normalizeCode(value: string): string {
  return value.trim().toLowerCase().replace(/[\s-]+/g, "_");
}

export async function fetchValidPlaybookCodes(
  supabase: SupabaseClient,
): Promise<string[]> {
  const { data, error } = await supabase.from("action_playbooks").select("code");

  if (error) {
    throw error;
  }

  return (data ?? [])
    .map((row) => toText((row as UnknownRecord).code))
    .filter((value): value is string => Boolean(value));
}

export function pickPlaybookCode(
  validCodes: string[],
  candidates: string[],
): string | null {
  if (validCodes.length === 0) return null;

  const normalizedValid = validCodes.map((code) => ({
    raw: code,
    normalized: normalizeCode(code),
  }));

  const normalizedCandidates = candidates.map(normalizeCode);

  for (const candidate of normalizedCandidates) {
    const exact = normalizedValid.find((item) => item.normalized === candidate);
    if (exact) return exact.raw;
  }

  for (const candidate of normalizedCandidates) {
    const partial = normalizedValid.find((item) => item.normalized.includes(candidate));
    if (partial) return partial.raw;
  }

  return null;
}

export function buildRecommendedActions(
  scores: HealthScores,
  validPlaybookCodes: string[],
  preservedStatusMap: Record<string, string>,
) {
  const reasons = buildReasonRows(scores);

  const rows: Array<{
    playbook_code: string;
    title: string;
    description: string;
    priority: number;
    status: string;
    reason_code: string;
  }> = [];

  for (const reason of reasons) {
    const playbookCandidates =
      reason.reason_code === "market_risk_high"
        ? ["market", "competition", "demand", "traffic", "promotion", "customer"]
        : reason.reason_code === "business_risk_high"
          ? ["operation", "ops", "sales", "service", "review", "quality", "menu"]
          : reason.reason_code === "recoverability_low"
            ? ["cash", "cost", "restructure", "pivot", "finance", "turnaround"]
            : reason.reason_code === "closing_risk_critical"
              ? ["emergency", "last_chance", "diagnosis", "rescue", "turnaround"]
              : ["monitor", "weekly", "trend", "observe", "check"];

    const playbookCode = pickPlaybookCode(validPlaybookCodes, playbookCandidates);
    if (!playbookCode) continue;

    const preserved = preservedStatusMap[playbookCode];
    const status =
      preserved === "accepted" || preserved === "completed" ? preserved : "recommended";

    rows.push({
      playbook_code: playbookCode,
      title: reason.title,
      description: reason.description,
      priority: rows.length,
      status,
      reason_code: reason.reason_code,
    });
  }

  return rows;
}
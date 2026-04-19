import type { SupabaseClient } from "@supabase/supabase-js";

export type RiskGrade = "low" | "moderate" | "high";

export function normalizeRiskGrade(
  grade: unknown,
  score?: unknown,
): RiskGrade {
  const raw = String(grade ?? "").trim().toLowerCase();

  if (
    ["low", "safe", "good", "positive", "green", "stable"].includes(raw)
  ) {
    return "low";
  }

  if (
    ["moderate", "medium", "warn", "warning", "caution", "neutral", "amber"]
      .includes(raw)
  ) {
    return "moderate";
  }

  if (
    ["high", "critical", "danger", "risk", "negative", "red"].includes(raw)
  ) {
    return "high";
  }

  const numericScore = Number(score);
  if (Number.isFinite(numericScore)) {
    if (numericScore >= 67) return "high";
    if (numericScore >= 34) return "moderate";
    return "low";
  }

  return "moderate";
}

export function normalizeRiskScore(score: unknown): number {
  const n = Number(score);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n * 10) / 10));
}

export function normalizePlaybookCode(value: unknown): string | null {
  const raw = String(value ?? "").trim();
  if (!raw) return null;

  return raw
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/-/g, "_");
}

export async function getValidPlaybookCodeSet(
  supabase: SupabaseClient,
  tableName = "action_playbooks",
) {
  const { data, error } = await supabase.from(tableName).select("code");

  if (error) {
    throw error;
  }

  return new Set(
    (data ?? [])
      .map((row) => String(row.code ?? "").trim())
      .filter(Boolean),
  );
}

export function toSafeMonitorErrorMessage(error: unknown): string {
  const message =
    error instanceof Error ? error.message : String(error ?? "알 수 없는 오류");

  if (message.includes("snapshot_recommended_actions_playbook_code_fkey")) {
    return "추천 액션 저장 중 일부 playbook 연결값이 잘못되어 저장을 건너뛰었습니다.";
  }

  if (message.includes("external_intel_snapshots_grade_check")) {
    return "외부 분석 등급값이 저장 형식과 맞지 않아 일부 스냅샷 저장을 건너뛰었습니다.";
  }

  return "처리 중 일부 데이터 저장을 건너뛰었습니다. 다시 시도해 주세요.";
}
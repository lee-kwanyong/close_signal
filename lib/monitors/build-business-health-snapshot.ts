import { supabaseAdmin } from "@/lib/supabase/admin";
import {
  normalizeReason,
  reviewDaysBySeverity,
  type CanonicalReasonCode,
  type ReasonDimension,
  type ReasonSeverity,
  type ReasonSourceType,
} from "@/lib/monitors/reason-taxonomy";
import {
  buildRecommendedActionsFromReasons,
  summarizeAction,
  summarizeWhy,
} from "@/lib/monitors/action-engine";

type TargetRow = {
  id: number;
  business_id?: number | null;
  business_key?: string | null;
  business_number?: string | null;
  business_name: string;
  address: string;
  region_code?: string | null;
  region_name?: string | null;
  category_id?: number | null;
  category_code?: string | null;
  category_name?: string | null;
  category_group_code?: string | null;
  trend_keywords?: string[] | null;
  radius?: number | null;
  is_active?: boolean | null;
};

type IntelSnapshotRow = {
  id: number;
  snapshot_date?: string | null;
  score?: number | null;
  grade?: string | null;
  nts_status?: string | null;
  nts_closed_date?: string | null;
  nts_tax_type?: string | null;
  kakao_total_count?: number | null;
  kakao_matched_count?: number | null;
  kakao_competitor_count?: number | null;
  naver_trend_delta_pct?: number | null;
  naver_latest_ratio?: number | null;
  naver_baseline_ratio?: number | null;
  raw?: Record<string, unknown> | null;
};

type IntelReasonRow = {
  id: number;
  code: string;
  title: string;
  detail?: string | null;
  weight?: number | null;
};

type MarketScoreRow = {
  id?: number | null;
  score_date?: string | null;
  region_code?: string | null;
  region_name?: string | null;
  category_id?: number | null;
  category_code?: string | null;
  category_name?: string | null;
  risk_score?: number | null;
  risk_grade?: string | null;
  shrink_score?: number | null;
  closure_score?: number | null;
  overheat_score?: number | null;
  net_change_30d?: number | null;
  business_count?: number | null;
};

type MarketSignalRow = {
  id?: number | null;
  score_date?: string | null;
  signal_type?: string | null;
  region_code?: string | null;
  category_id?: number | null;
  category_code?: string | null;
  category_name?: string | null;
  risk_score?: number | null;
  risk_grade?: string | null;
  signal_title?: string | null;
  signal_summary?: string | null;
};

type SbizMetricRow = {
  id?: number | null;
  score_date?: string | null;
  region_code?: string | null;
  region_name?: string | null;
  category_id?: number | null;
  category_code?: string | null;
  category_name?: string | null;
  competition_score?: number | null;
  store_density_score?: number | null;
  freshness_score?: number | null;
  visibility_score?: number | null;
  sbiz_composite_score?: number | null;
};

type CommunityPostRow = {
  id?: number | null;
  title?: string | null;
  content?: string | null;
  region_code?: string | null;
  category?: string | null;
  category_l1?: string | null;
  category_code?: string | null;
  is_solved?: boolean | null;
  created_at?: string | null;
};

type CollectedReason = {
  source_type: ReasonSourceType;
  reason_code: string;
  title: string;
  detail: string;
  weight: number;
  rank_order: number;
  source_ref?: string | null;
};

type SnapshotReasonInsert = CollectedReason & {
  dimension: ReasonDimension;
  canonical_reason_code: CanonicalReasonCode;
  severity: ReasonSeverity;
  playbook_code: string;
  evidence_needed: string[];
  success_criteria: string[];
};

type RecommendedActionStatus =
  | "recommended"
  | "accepted"
  | "dismissed"
  | "completed";

type ExistingRecommendedActionRow = {
  id: number;
  health_snapshot_id: number;
  playbook_code?: string | null;
  title?: string | null;
  action_title?: string | null;
  description?: string | null;
  priority?: number | null;
  due_in_days?: number | null;
  status?: RecommendedActionStatus | null;
  action_status?: RecommendedActionStatus | null;
  evidence_needed?: unknown;
  success_criteria?: unknown;
  source_reason_codes?: string[] | null;
  owner_user_id?: string | null;
  metadata?: Record<string, unknown> | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type GenericTaskRow = {
  id?: number | null;
  monitor_id?: number | null;
  recommended_action_id?: number | null;
  playbook_code?: string | null;
  action_title?: string | null;
  title?: string | null;
  status?: string | null;
  outcome_status?: string | null;
  completed_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  metadata?: Record<string, unknown> | null;
};

type GenericOutcomeRow = {
  id?: number | null;
  task_id?: number | null;
  status?: string | null;
  outcome_status?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type PreservedActionState = {
  status: RecommendedActionStatus;
  ownerUserId: string | null;
  metadata: Record<string, unknown>;
  sourceActionId: number | null;
  taskId: number | null;
  taskStatus: string | null;
  outcomeStatus: string | null;
  touchedAt: string | null;
};

type BuildHealthResult = {
  ok: boolean;
  monitorId: number;
  snapshotId: number;
  snapshotDate: string;
  stage: "observe" | "caution" | "critical";
  scores: {
    marketRiskScore: number;
    businessRiskScore: number;
    rescueChanceScore: number;
    closingRiskScore: number;
  };
  whySummary: string;
  actionSummary: string;
  nextReviewAt: string | null;
  topReasons: SnapshotReasonInsert[];
  topActions: Array<{
    playbookCode: string;
    title: string;
    description: string;
    priority: number;
    dueInDays: number;
    status: RecommendedActionStatus;
    evidenceNeeded: string[];
    successCriteria: string[];
    sourceReasonCodes: string[];
    taskId: number | null;
    taskStatus: string | null;
    outcomeStatus: string | null;
  }>;
};

const DISTRESS_KEYWORDS: Array<{ token: string; weight: number }> = [
  { token: "폐업", weight: 4 },
  { token: "정리", weight: 3 },
  { token: "휴업", weight: 3 },
  { token: "매출급감", weight: 4 },
  { token: "손님끊", weight: 3 },
  { token: "버티기힘들", weight: 4 },
  { token: "임대료", weight: 2 },
  { token: "권리금", weight: 2 },
  { token: "적자", weight: 3 },
  { token: "대출", weight: 2 },
  { token: "회생", weight: 3 },
];

const ACTION_STATUS_WEIGHT: Record<RecommendedActionStatus, number> = {
  recommended: 1,
  dismissed: 2,
  accepted: 3,
  completed: 4,
};

function text(...values: unknown[]) {
  for (const value of values) {
    if (value === null || value === undefined) continue;

    const s = String(value).trim();
    if (s.length > 0) return s;
  }

  return null;
}

function asRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  return {};
}

function num(value: unknown) {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function round1(value: number) {
  return Math.round(value * 10) / 10;
}

function todayDateString() {
  return new Date().toISOString().slice(0, 10);
}

function isoDaysAgo(days: number) {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
}

function dateDaysAgo(days: number) {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
}

function isoDaysFromNow(days: number) {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
}

function normalizeText(value: unknown) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, "");
}

function tokenize(value: unknown) {
  return String(value ?? "")
    .toLowerCase()
    .split(/[\s,./()·\-_|]+/g)
    .map((part) => part.replace(/[^\p{L}\p{N}]+/gu, ""))
    .filter(Boolean);
}

function similarity(a: unknown, b: unknown) {
  const na = normalizeText(a);
  const nb = normalizeText(b);

  if (!na || !nb) return 0;
  if (na === nb) return 1;
  if (na.includes(nb) || nb.includes(na)) return 0.9;

  const ta = new Set(tokenize(a));
  const tb = new Set(tokenize(b));
  if (ta.size === 0 || tb.size === 0) return 0;

  let intersection = 0;
  for (const token of ta) {
    if (tb.has(token)) intersection += 1;
  }

  return intersection / Math.max(ta.size, tb.size);
}

function ntsLifecycleStatus(
  value?: string | null,
): "active" | "suspended" | "closed" {
  const v = normalizeText(value);
  if (!v) return "active";
  if (v.includes("폐업")) return "closed";
  if (v.includes("휴업")) return "suspended";
  return "active";
}

function avgNumber<T extends Record<string, unknown>>(rows: T[], key: keyof T) {
  if (!rows.length) return 0;
  const values = rows.map((row) => num(row[key]));
  const sum = values.reduce((acc, value) => acc + value, 0);
  return sum / rows.length;
}

function asStringArray(value: unknown) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item ?? "").trim()).filter(Boolean);
  }
  return [];
}

function actionMatchKey(playbookCode?: unknown, title?: unknown) {
  const code = normalizeText(playbookCode);
  const name = normalizeText(title);
  return `${code}::${name}`;
}

function normalizeActionStatus(value?: unknown): RecommendedActionStatus {
  const v = normalizeText(value);

  if (v.includes("complete")) return "completed";
  if (v.includes("done")) return "completed";
  if (v.includes("accept")) return "accepted";
  if (v.includes("dismiss")) return "dismissed";
  return "recommended";
}

function isTaskDone(task?: GenericTaskRow | null) {
  if (!task) return false;
  const status = normalizeText(task.status);
  return Boolean(task.completed_at) || status === "done" || status === "completed";
}

function getTaskTouchedAt(task?: GenericTaskRow | null) {
  return text(task?.completed_at, task?.updated_at, task?.created_at);
}

function getOutcomeTouchedAt(outcome?: GenericOutcomeRow | null) {
  return text(outcome?.updated_at, outcome?.created_at);
}

function strongerStatus(
  a: RecommendedActionStatus,
  b: RecommendedActionStatus,
): RecommendedActionStatus {
  return ACTION_STATUS_WEIGHT[a] >= ACTION_STATUS_WEIGHT[b] ? a : b;
}

function pickBestCategoryMatch<
  T extends {
    category_id?: number | null;
    category_code?: string | null;
    category_name?: string | null;
  },
>(rows: T[], target: TargetRow): T | null {
  let best: T | null = null;
  let bestScore = 0;

  for (const row of rows) {
    let score = 0;

    if (
      target.category_id !== null &&
      target.category_id !== undefined &&
      row.category_id !== null &&
      row.category_id !== undefined &&
      String(target.category_id) === String(row.category_id)
    ) {
      score += 100;
    }

    if (
      text(target.category_code) &&
      text(row.category_code) &&
      text(target.category_code) === text(row.category_code)
    ) {
      score += 80;
    }

    score += similarity(row.category_name, target.category_name) * 60;

    if (score > bestScore) {
      bestScore = score;
      best = row;
    }
  }

  return bestScore > 0 ? best : null;
}

async function fetchTarget(monitorId: number) {
  const { data, error } = await supabaseAdmin()
    .from("external_intel_targets")
    .select("*")
    .eq("id", monitorId)
    .maybeSingle();

  if (error) {
    throw new Error(`external_intel_targets 조회 실패: ${error.message}`);
  }

  if (!data) {
    throw new Error(`monitor_id=${monitorId} 대상이 없습니다.`);
  }

  return data as TargetRow;
}

async function fetchLatestIntelBundle(monitorId: number) {
  const supabase = supabaseAdmin();

  const { data: snapshot, error: snapshotError } = await supabase
    .from("external_intel_snapshots")
    .select("*")
    .eq("target_id", monitorId)
    .order("snapshot_date", { ascending: false })
    .order("id", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (snapshotError) {
    throw new Error(`external_intel_snapshots 조회 실패: ${snapshotError.message}`);
  }

  const intelSnapshot = (snapshot ?? null) as IntelSnapshotRow | null;

  if (!intelSnapshot?.id) {
    return {
      snapshot: null,
      reasons: [] as IntelReasonRow[],
    };
  }

  const { data: reasons, error: reasonsError } = await supabase
    .from("external_intel_reasons")
    .select("*")
    .eq("snapshot_id", intelSnapshot.id)
    .order("weight", { ascending: false })
    .order("id", { ascending: true });

  if (reasonsError) {
    throw new Error(`external_intel_reasons 조회 실패: ${reasonsError.message}`);
  }

  return {
    snapshot: intelSnapshot,
    reasons: (reasons ?? []) as IntelReasonRow[],
  };
}

async function fetchLatestMarketBundle(target: TargetRow) {
  const supabase = supabaseAdmin();

  if (!text(target.region_code) && !text(target.region_name)) {
    return {
      riskMatch: null as MarketScoreRow | null,
      riskSignalMatch: null as MarketSignalRow | null,
      sbizMatch: null as SbizMetricRow | null,
      marketRiskScore: 0,
      competitionScore: 0,
    };
  }

  let riskDate: string | null = null;
  {
    let q = supabase
      .from("risk_scores")
      .select("score_date")
      .order("score_date", { ascending: false })
      .limit(1);

    if (text(target.region_code)) {
      q = q.eq("region_code", text(target.region_code)!);
    } else if (text(target.region_name)) {
      q = q.eq("region_name", text(target.region_name)!);
    }

    const { data, error } = await q.maybeSingle();
    if (error) {
      throw new Error(`risk_scores 최신일 조회 실패: ${error.message}`);
    }

    riskDate = data?.score_date ?? null;
  }

  let riskRows: MarketScoreRow[] = [];
  if (riskDate) {
    let q = supabase
      .from("risk_scores")
      .select(
        "id, score_date, region_code, region_name, category_id, category_code, category_name, risk_score, risk_grade, shrink_score, closure_score, overheat_score, net_change_30d, business_count",
      )
      .eq("score_date", riskDate);

    if (text(target.region_code)) {
      q = q.eq("region_code", text(target.region_code)!);
    } else if (text(target.region_name)) {
      q = q.eq("region_name", text(target.region_name)!);
    }

    const { data, error } = await q.limit(500);
    if (error) {
      throw new Error(`risk_scores 조회 실패: ${error.message}`);
    }

    riskRows = (data ?? []) as MarketScoreRow[];
  }

  const riskMatch = pickBestCategoryMatch(riskRows, target);
  const riskFallbackScore = avgNumber(
    riskRows as Array<Record<string, unknown>>,
    "risk_score",
  );

  let riskSignalMatch: MarketSignalRow | null = null;
  if (riskDate) {
    let q = supabase
      .from("risk_signals")
      .select(
        "id, score_date, signal_type, region_code, category_id, category_code, category_name, risk_score, risk_grade, signal_title, signal_summary",
      )
      .eq("score_date", riskDate);

    if (text(target.region_code)) {
      q = q.eq("region_code", text(target.region_code)!);
    }

    const { data, error } = await q.limit(300);
    if (error) {
      throw new Error(`risk_signals 조회 실패: ${error.message}`);
    }

    riskSignalMatch = pickBestCategoryMatch(
      (data ?? []) as MarketSignalRow[],
      target,
    );
  }

  let sbizDate: string | null = null;
  {
    let q = supabase
      .from("sbiz_region_category_metrics")
      .select("score_date")
      .order("score_date", { ascending: false })
      .limit(1);

    if (text(target.region_code)) {
      q = q.eq("region_code", text(target.region_code)!);
    } else if (text(target.region_name)) {
      q = q.eq("region_name", text(target.region_name)!);
    }

    const { data, error } = await q.maybeSingle();
    if (error) {
      throw new Error(`sbiz_region_category_metrics 최신일 조회 실패: ${error.message}`);
    }

    sbizDate = data?.score_date ?? null;
  }

  let sbizRows: SbizMetricRow[] = [];
  if (sbizDate) {
    let q = supabase
      .from("sbiz_region_category_metrics")
      .select(
        "id, score_date, region_code, region_name, category_id, category_code, category_name, competition_score, store_density_score, freshness_score, visibility_score, sbiz_composite_score",
      )
      .eq("score_date", sbizDate);

    if (text(target.region_code)) {
      q = q.eq("region_code", text(target.region_code)!);
    } else if (text(target.region_name)) {
      q = q.eq("region_name", text(target.region_name)!);
    }

    const { data, error } = await q.limit(500);
    if (error) {
      throw new Error(`sbiz_region_category_metrics 조회 실패: ${error.message}`);
    }

    sbizRows = (data ?? []) as SbizMetricRow[];
  }

  const sbizMatch = pickBestCategoryMatch(sbizRows, target);
  const sbizFallbackCompetition = avgNumber(
    sbizRows as Array<Record<string, unknown>>,
    "competition_score",
  );

  const riskBase = riskMatch ? num(riskMatch.risk_score) : riskFallbackScore;
  const competitionBase = sbizMatch
    ? num(sbizMatch.competition_score)
    : sbizFallbackCompetition;

  const marketRiskScore = round1(
    clamp(riskBase * 0.8 + competitionBase * 0.2, 0, 100),
  );

  return {
    riskMatch,
    riskSignalMatch,
    sbizMatch,
    marketRiskScore,
    competitionScore: round1(competitionBase),
  };
}

async function fetchCommunityDistress(target: TargetRow) {
  const supabase = supabaseAdmin();

  if (!text(target.region_code)) {
    return {
      penalty: 0,
      reason: null as CollectedReason | null,
      matchedCount: 0,
    };
  }

  const { data, error } = await supabase
    .from("community_posts")
    .select(
      "id, title, content, region_code, category, category_l1, category_code, is_solved, created_at",
    )
    .eq("region_code", text(target.region_code)!)
    .gte("created_at", isoDaysAgo(14))
    .order("created_at", { ascending: false })
    .limit(80);

  if (error) {
    throw new Error(`community_posts 조회 실패: ${error.message}`);
  }

  const rows = (data ?? []) as CommunityPostRow[];

  const filtered = rows.filter((row) => {
    if (row.is_solved === true) return false;

    const categoryMatched =
      !text(target.category_name) ||
      similarity(row.category, target.category_name) >= 0.45 ||
      similarity(row.category_l1, target.category_name) >= 0.45 ||
      similarity(row.category_code, target.category_code) >= 0.8;

    return categoryMatched;
  });

  let totalPenalty = 0;
  let matchedCount = 0;

  for (const row of filtered) {
    const corpus = normalizeText(`${row.title ?? ""} ${row.content ?? ""}`);
    let rowScore = 0;

    for (const item of DISTRESS_KEYWORDS) {
      if (corpus.includes(item.token)) {
        rowScore += item.weight;
      }
    }

    if (rowScore > 0) {
      matchedCount += 1;
      const createdAt = row.created_at ? new Date(row.created_at).getTime() : NaN;
      const recentBonus =
        Number.isFinite(createdAt) && Date.now() - createdAt < 3 * 24 * 60 * 60 * 1000
          ? 1
          : 0;

      totalPenalty += rowScore + recentBonus;
    }
  }

  totalPenalty = clamp(totalPenalty, 0, 12);

  if (totalPenalty <= 0 || matchedCount === 0) {
    return {
      penalty: 0,
      reason: null,
      matchedCount: 0,
    };
  }

  const code =
    totalPenalty >= 8 ? "community_distress_high" : "community_distress_mid";

  return {
    penalty: totalPenalty,
    matchedCount,
    reason: {
      source_type: "community",
      reason_code: code,
      title:
        totalPenalty >= 8
          ? "현장 커뮤니티 distress 강함"
          : "현장 커뮤니티 distress 감지",
      detail: `최근 14일 내 관련 커뮤니티 글 ${matchedCount}건에서 폐업/매출급감/임대료 부담 관련 표현이 감지되었습니다.`,
      weight: round1(totalPenalty),
      rank_order: 99,
      source_ref: null,
    } as CollectedReason,
  };
}

async function calculateRepeatPenalty(monitorId: number) {
  const { data, error } = await supabaseAdmin()
    .from("external_intel_snapshots")
    .select("score, grade, snapshot_date")
    .eq("target_id", monitorId)
    .gte("snapshot_date", dateDaysAgo(30))
    .order("snapshot_date", { ascending: false })
    .limit(10);

  if (error) {
    throw new Error(`recent external_intel_snapshots 조회 실패: ${error.message}`);
  }

  const rows = (data ?? []) as Array<{ score?: number | null; grade?: string | null }>;
  const highCount = rows.filter((row) => {
    const grade = text(row.grade);
    return num(row.score) >= 70 || grade === "high" || grade === "critical";
  }).length;

  if (highCount >= 3) return 15;
  if (highCount >= 2) return 10;
  if (highCount >= 1) return 5;
  return 0;
}

async function calculateExecutionBonus(monitorId: number) {
  const { data, error } = await supabaseAdmin()
    .from("intervention_tasks")
    .select("id, completed_at")
    .eq("monitor_id", monitorId)
    .eq("status", "done")
    .gte("completed_at", isoDaysAgo(14));

  if (error) {
    throw new Error(`intervention_tasks 조회 실패: ${error.message}`);
  }

  const count = (data ?? []).length;
  return Math.min(count * 5, 20);
}

function stageAdjustedPriority(
  basePriority: number,
  stage: "observe" | "caution" | "critical",
) {
  if (stage === "critical") return 1;
  if (stage === "caution") return Math.min(basePriority, 2);
  return basePriority;
}

function stageAdjustedDueDays(
  baseDueDays: number,
  stage: "observe" | "caution" | "critical",
) {
  if (stage === "critical") return Math.min(baseDueDays, 3);
  if (stage === "caution") return Math.min(baseDueDays, 7);
  return baseDueDays;
}

function chooseBetterPreservedAction(
  current: PreservedActionState | undefined,
  next: PreservedActionState,
) {
  if (!current) return next;

  const currentWeight = ACTION_STATUS_WEIGHT[current.status];
  const nextWeight = ACTION_STATUS_WEIGHT[next.status];

  if (nextWeight !== currentWeight) {
    return nextWeight > currentWeight ? next : current;
  }

  const currentTouched = current.touchedAt
    ? new Date(current.touchedAt).getTime()
    : 0;
  const nextTouched = next.touchedAt ? new Date(next.touchedAt).getTime() : 0;

  return nextTouched >= currentTouched ? next : current;
}

async function fetchPreservedActionStateMap(monitorId: number) {
  const supabase = supabaseAdmin();

  const { data: snapshots, error: snapshotsError } = await supabase
    .from("business_health_snapshots")
    .select("id, snapshot_date, created_at")
    .eq("monitor_id", monitorId)
    .order("snapshot_date", { ascending: false })
    .order("id", { ascending: false })
    .limit(60);

  if (snapshotsError) {
    throw new Error(`business_health_snapshots 히스토리 조회 실패: ${snapshotsError.message}`);
  }

  const snapshotRows =
    (snapshots ?? []) as Array<{
      id: number;
      snapshot_date?: string | null;
      created_at?: string | null;
    }>;
  const snapshotIds = snapshotRows.map((row) => row.id).filter(Boolean);

  if (snapshotIds.length === 0) {
    return new Map<string, PreservedActionState>();
  }

  const snapshotDateMap = new Map<number, string | null>(
    snapshotRows.map((row) => [row.id, text(row.snapshot_date, row.created_at)]),
  );

  const { data: actions, error: actionsError } = await supabase
    .from("snapshot_recommended_actions")
    .select("*")
    .in("health_snapshot_id", snapshotIds);

  if (actionsError) {
    throw new Error(`snapshot_recommended_actions 히스토리 조회 실패: ${actionsError.message}`);
  }

  const actionRows = (actions ?? []) as ExistingRecommendedActionRow[];

  const { data: tasks, error: tasksError } = await supabase
    .from("intervention_tasks")
    .select("*")
    .eq("monitor_id", monitorId)
    .order("created_at", { ascending: false });

  if (tasksError) {
    throw new Error(`intervention_tasks 히스토리 조회 실패: ${tasksError.message}`);
  }

  const taskRows = (tasks ?? []) as GenericTaskRow[];

  const taskIds = taskRows.map((row) => num(row.id)).filter((id) => id > 0);

  let outcomeRows: GenericOutcomeRow[] = [];
  if (taskIds.length > 0) {
    const { data: outcomes, error: outcomesError } = await supabase
      .from("intervention_outcomes")
      .select("*")
      .in("task_id", taskIds);

    if (outcomesError) {
      throw new Error(`intervention_outcomes 히스토리 조회 실패: ${outcomesError.message}`);
    }

    outcomeRows = (outcomes ?? []) as GenericOutcomeRow[];
  }

  const tasksByRecommendedActionId = new Map<number, GenericTaskRow[]>();
  const tasksByKey = new Map<string, GenericTaskRow[]>();
  const outcomesByTaskId = new Map<number, GenericOutcomeRow[]>();

  for (const task of taskRows) {
    const taskId = num(task.id);
    const actionId = num(task.recommended_action_id);
    const key = actionMatchKey(
      task.playbook_code,
      task.action_title ?? task.title,
    );

    if (actionId > 0) {
      const bucket = tasksByRecommendedActionId.get(actionId) ?? [];
      bucket.push(task);
      tasksByRecommendedActionId.set(actionId, bucket);
    }

    if (key !== "::") {
      const bucket = tasksByKey.get(key) ?? [];
      bucket.push(task);
      tasksByKey.set(key, bucket);
    }

    if (taskId > 0 && !outcomesByTaskId.has(taskId)) {
      outcomesByTaskId.set(taskId, []);
    }
  }

  for (const outcome of outcomeRows) {
    const taskId = num(outcome.task_id);
    if (taskId <= 0) continue;
    const bucket = outcomesByTaskId.get(taskId) ?? [];
    bucket.push(outcome);
    outcomesByTaskId.set(taskId, bucket);
  }

  const preservedMap = new Map<string, PreservedActionState>();

  for (const row of actionRows) {
    const title = row.title ?? row.action_title ?? "";
    const key = actionMatchKey(row.playbook_code, title);
    if (key === "::") continue;

    const directTasks = tasksByRecommendedActionId.get(num(row.id)) ?? [];
    const keyedTasks = tasksByKey.get(key) ?? [];

    const mergedTasks = [...directTasks];
    for (const task of keyedTasks) {
      const exists = mergedTasks.some((item) => num(item.id) === num(task.id));
      if (!exists) mergedTasks.push(task);
    }

    let inferredStatus = normalizeActionStatus(row.action_status ?? row.status);
    let pickedTask: GenericTaskRow | null = null;
    let pickedOutcome: GenericOutcomeRow | null = null;

    for (const task of mergedTasks) {
      const taskOutcomes = outcomesByTaskId.get(num(task.id)) ?? [];
      if (!pickedTask) pickedTask = task;
      if (taskOutcomes.length > 0 && !pickedOutcome) pickedOutcome = taskOutcomes[0];

      if (taskOutcomes.length > 0 || isTaskDone(task)) {
        inferredStatus = strongerStatus(inferredStatus, "completed");
      } else if (normalizeActionStatus(task.status) === "accepted" || num(task.id) > 0) {
        inferredStatus = strongerStatus(inferredStatus, "accepted");
      }
    }

    const snapshotTouchedAt = snapshotDateMap.get(row.health_snapshot_id) ?? null;
    const taskTouchedAt = pickedTask ? getTaskTouchedAt(pickedTask) : null;
    const outcomeTouchedAt = pickedOutcome ? getOutcomeTouchedAt(pickedOutcome) : null;

    const touchedAt =
      outcomeTouchedAt ??
      taskTouchedAt ??
      text(row.updated_at, row.created_at) ??
      snapshotTouchedAt;

    const candidate: PreservedActionState = {
      status: inferredStatus,
      ownerUserId: text(row.owner_user_id),
      metadata: asRecord(row.metadata),
      sourceActionId: num(row.id) > 0 ? num(row.id) : null,
      taskId: pickedTask && num(pickedTask.id) > 0 ? num(pickedTask.id) : null,
      taskStatus: text(pickedTask?.status),
      outcomeStatus: text(
        pickedOutcome?.outcome_status,
        pickedOutcome?.status,
        pickedTask?.outcome_status,
      ),
      touchedAt,
    };

    preservedMap.set(
      key,
      chooseBetterPreservedAction(preservedMap.get(key), candidate),
    );
  }

  return preservedMap;
}

export async function buildBusinessHealthSnapshot(
  monitorId: number,
): Promise<BuildHealthResult> {
  const supabase = supabaseAdmin();

  const target = await fetchTarget(monitorId);
  const intelBundle = await fetchLatestIntelBundle(monitorId);
  const marketBundle = await fetchLatestMarketBundle(target);
  const communityDistress = await fetchCommunityDistress(target);
  const repeatPenalty = await calculateRepeatPenalty(monitorId);
  const executionBonus = await calculateExecutionBonus(monitorId);

  const intelSnapshot = intelBundle.snapshot;
  const intelReasons = intelBundle.reasons;

  const marketReasons: CollectedReason[] = [];

  if (marketBundle.marketRiskScore >= 70) {
    marketReasons.push({
      source_type: "market",
      reason_code: "market_decline_high",
      title: "시장 자체 하락 위험 높음",
      detail: `지역·업종 시장위험 점수가 ${marketBundle.marketRiskScore.toFixed(1)}점으로 높습니다.`,
      weight: 18,
      rank_order: 99,
      source_ref: marketBundle.riskMatch?.id ? String(marketBundle.riskMatch.id) : null,
    });
  } else if (marketBundle.marketRiskScore >= 45) {
    marketReasons.push({
      source_type: "market",
      reason_code: "market_decline_mid",
      title: "시장 하락 주의 구간",
      detail: `지역·업종 시장위험 점수가 ${marketBundle.marketRiskScore.toFixed(1)}점입니다.`,
      weight: 10,
      rank_order: 99,
      source_ref: marketBundle.riskMatch?.id ? String(marketBundle.riskMatch.id) : null,
    });
  }

  if (
    marketBundle.competitionScore >= 65 &&
    !intelReasons.some((reason) => reason.code === "competition_dense")
  ) {
    marketReasons.push({
      source_type: "market",
      reason_code: "competition_dense",
      title: "상권 경쟁 과밀",
      detail: `상권 경쟁 점수가 ${marketBundle.competitionScore.toFixed(1)}점으로 높습니다.`,
      weight: 8,
      rank_order: 99,
      source_ref: marketBundle.sbizMatch?.id ? String(marketBundle.sbizMatch.id) : null,
    });
  }

  const collectedReasons: CollectedReason[] = [
    ...intelReasons.map((reason) => ({
      source_type: "intel" as const,
      reason_code: reason.code,
      title: reason.title,
      detail: reason.detail ?? "",
      weight: round1(num(reason.weight)),
      rank_order: 99,
      source_ref: intelSnapshot?.id ? String(intelSnapshot.id) : null,
    })),
    ...marketReasons,
    ...(communityDistress.reason ? [communityDistress.reason] : []),
  ];

  if (collectedReasons.length === 0) {
    collectedReasons.push({
      source_type: "manual",
      reason_code: "signal_gap",
      title: "추가 신호 필요",
      detail: "현재 수집된 정보만으로는 강한 위험 근거가 부족합니다.",
      weight: 5,
      rank_order: 99,
      source_ref: null,
    });
  }

  const rawReasons = [...collectedReasons]
    .sort((a, b) => b.weight - a.weight)
    .map((reason) => ({
      reason_code: reason.reason_code,
      title: reason.title,
      detail: reason.detail,
      weight: reason.weight,
      source_type: reason.source_type,
    }));

  const normalizedReasons: SnapshotReasonInsert[] = [...collectedReasons]
    .sort((a, b) => b.weight - a.weight)
    .map((reason, index) => {
      const normalized = normalizeReason({
        reason_code: reason.reason_code,
        title: reason.title,
        detail: reason.detail,
        weight: reason.weight,
        source_type: reason.source_type,
      });

      return {
        source_type: normalized.sourceType,
        dimension: normalized.dimension,
        reason_code: normalized.legacyCode,
        canonical_reason_code: normalized.canonicalCode,
        title: normalized.title,
        detail: normalized.detail,
        weight: round1(normalized.weight),
        severity: normalized.severity,
        playbook_code: normalized.playbookCode,
        evidence_needed: normalized.evidenceNeeded,
        success_criteria: normalized.successCriteria,
        rank_order: index + 1,
        source_ref: reason.source_ref ?? null,
      };
    });

  const intelWeightSum = intelReasons.reduce(
    (acc, reason) => acc + num(reason.weight),
    0,
  );

  const businessRiskScore = round1(
    clamp(intelWeightSum + repeatPenalty + communityDistress.penalty, 0, 100),
  );

  const marketRiskScore = round1(clamp(marketBundle.marketRiskScore, 0, 100));
  const lifecycleStatus = ntsLifecycleStatus(intelSnapshot?.nts_status);

  const presenceBonus =
    num(intelSnapshot?.kakao_matched_count) >= 2
      ? 25
      : num(intelSnapshot?.kakao_matched_count) >= 1
        ? 20
        : 0;

  const trendDelta = num(intelSnapshot?.naver_trend_delta_pct);
  const demandBonus = trendDelta >= 5 ? 20 : trendDelta >= -10 ? 10 : 0;
  const marketHeadroomBonus =
    marketRiskScore < 35 ? 20 : marketRiskScore < 55 ? 10 : 0;

  const adminPenalty =
    lifecycleStatus === "closed" ? 100 : lifecycleStatus === "suspended" ? 25 : 0;

  const severityPenalty =
    businessRiskScore >= 80 ? 20 : businessRiskScore >= 60 ? 10 : 0;

  const rescueChanceScore = round1(
    clamp(
      40 +
        presenceBonus +
        demandBonus +
        marketHeadroomBonus +
        executionBonus -
        adminPenalty -
        severityPenalty,
      0,
      100,
    ),
  );

  const closingRiskScore = round1(
    clamp(
      marketRiskScore * 0.3 +
        businessRiskScore * 0.55 +
        (100 - rescueChanceScore) * 0.15,
      0,
      100,
    ),
  );

  const stage: "observe" | "caution" | "critical" =
    lifecycleStatus === "closed"
      ? "critical"
      : closingRiskScore >= 60
        ? "critical"
        : closingRiskScore >= 35
          ? "caution"
          : "observe";

  const recommendedActions = buildRecommendedActionsFromReasons(rawReasons)
    .map((action) => ({
      ...action,
      priority: stageAdjustedPriority(num(action.priority), stage),
      dueInDays: stageAdjustedDueDays(num(action.dueInDays), stage),
      evidenceNeeded: asStringArray(action.evidenceNeeded),
      successCriteria: asStringArray(action.successCriteria),
      sourceReasonCodes: asStringArray(action.sourceReasonCodes),
      playbookCode: String(action.playbookCode ?? ""),
      title: String(action.title ?? ""),
      description: String(action.description ?? ""),
    }))
    .filter((action) => action.playbookCode && action.title)
    .sort((a, b) => {
      if (a.priority !== b.priority) return a.priority - b.priority;
      if (a.dueInDays !== b.dueInDays) return a.dueInDays - b.dueInDays;
      return a.title.localeCompare(b.title, "ko");
    });

  const topActions = recommendedActions.slice(0, 3);

  const whySummary = summarizeWhy(rawReasons);
  const actionSummary =
    topActions.length > 0
      ? topActions.map((action) => action.title).join(", ")
      : summarizeAction(rawReasons);

  const severityReviewDays =
    normalizedReasons.length > 0
      ? Math.min(
          ...normalizedReasons.map((reason) => reviewDaysBySeverity(reason.severity)),
        )
      : 14;

  const baseReviewDays =
    stage === "critical" ? 3 : stage === "caution" ? 14 : 30;

  const nextReviewDays = Math.min(
    baseReviewDays,
    severityReviewDays,
    ...(topActions.length > 0
      ? topActions.map((action) => action.dueInDays)
      : [baseReviewDays]),
  );

  const nextReviewAt = isoDaysFromNow(nextReviewDays);
  const snapshotDate = todayDateString();

  const { data: snapshot, error: snapshotError } = await supabase
    .from("business_health_snapshots")
    .upsert(
      {
        monitor_id: monitorId,
        snapshot_date: snapshotDate,
        region_code: text(target.region_code),
        region_name: text(target.region_name),
        category_id: target.category_id ?? null,
        category_code: text(target.category_code),
        category_name: text(target.category_name),
        market_risk_score: marketRiskScore,
        business_risk_score: businessRiskScore,
        rescue_chance_score: rescueChanceScore,
        closing_risk_score: closingRiskScore,
        stage,
        why_summary: whySummary || null,
        action_summary: actionSummary || null,
        next_review_at: nextReviewAt,
        market_score_ref_id: marketBundle.riskMatch?.id ?? null,
        market_signal_ref_id: marketBundle.riskSignalMatch?.id ?? null,
        intel_snapshot_id: intelSnapshot?.id ?? null,
        metadata: {
          market: {
            risk_score_id: marketBundle.riskMatch?.id ?? null,
            risk_signal_id: marketBundle.riskSignalMatch?.id ?? null,
            sbiz_metric_id: marketBundle.sbizMatch?.id ?? null,
            competition_score: marketBundle.competitionScore,
          },
          business: {
            intel_snapshot_id: intelSnapshot?.id ?? null,
            repeat_penalty: repeatPenalty,
            community_penalty: communityDistress.penalty,
          },
          rescue: {
            presence_bonus: presenceBonus,
            demand_bonus: demandBonus,
            market_headroom_bonus: marketHeadroomBonus,
            execution_bonus: executionBonus,
            admin_penalty: adminPenalty,
            severity_penalty: severityPenalty,
          },
          flags: {
            lifecycle_status: lifecycleStatus,
            last_chance_candidate:
              closingRiskScore >= 75 && rescueChanceScore >= 25,
          },
        },
      },
      {
        onConflict: "monitor_id,snapshot_date",
      },
    )
    .select("id")
    .single();

  if (snapshotError) {
    throw new Error(`business_health_snapshots upsert 실패: ${snapshotError.message}`);
  }

  const snapshotId = snapshot.id as number;

  const { error: deleteReasonsError } = await supabase
    .from("business_snapshot_reasons")
    .delete()
    .eq("health_snapshot_id", snapshotId);

  if (deleteReasonsError) {
    throw new Error(`business_snapshot_reasons 삭제 실패: ${deleteReasonsError.message}`);
  }

  if (normalizedReasons.length > 0) {
    const { error: insertReasonsError } = await supabase
      .from("business_snapshot_reasons")
      .insert(
        normalizedReasons.map((reason) => ({
          health_snapshot_id: snapshotId,
          source_type: reason.source_type,
          dimension: reason.dimension,
          reason_code: reason.reason_code,
          canonical_reason_code: reason.canonical_reason_code,
          title: reason.title,
          detail: reason.detail,
          weight: reason.weight,
          severity: reason.severity,
          playbook_code: reason.playbook_code,
          evidence_needed: reason.evidence_needed,
          success_criteria: reason.success_criteria,
          rank_order: reason.rank_order,
          source_ref: reason.source_ref ?? null,
        })),
      );

    if (insertReasonsError) {
      throw new Error(`business_snapshot_reasons insert 실패: ${insertReasonsError.message}`);
    }
  }

  const preservedStateMap = await fetchPreservedActionStateMap(monitorId);

  const { data: currentActions, error: currentActionsError } = await supabase
    .from("snapshot_recommended_actions")
    .select("*")
    .eq("health_snapshot_id", snapshotId);

  if (currentActionsError) {
    throw new Error(`snapshot_recommended_actions 기존 조회 실패: ${currentActionsError.message}`);
  }

  const existingRows = (currentActions ?? []) as ExistingRecommendedActionRow[];
  const existingByPlaybookCode = new Map(
    existingRows.map((row) => [String(row.playbook_code ?? ""), row]),
  );
  const nextCodes = new Set(topActions.map((action) => action.playbookCode));

  const topActionsWithState: BuildHealthResult["topActions"] = [];

  for (const action of topActions) {
    const existing = existingByPlaybookCode.get(action.playbookCode);
    const key = actionMatchKey(action.playbookCode, action.title);
    const preserved = preservedStateMap.get(key);

    const finalStatus = strongerStatus(
      preserved?.status ?? "recommended",
      normalizeActionStatus(existing?.action_status ?? existing?.status),
    );

    const ownerUserId = text(existing?.owner_user_id, preserved?.ownerUserId);

    const metadata: Record<string, unknown> = {
      ...asRecord(preserved?.metadata),
      ...asRecord(existing?.metadata),
      ...(preserved?.sourceActionId
        ? { inherited_source_action_id: preserved.sourceActionId }
        : {}),
      ...(preserved?.taskId ? { linked_task_id: preserved.taskId } : {}),
      ...(preserved?.taskStatus ? { linked_task_status: preserved.taskStatus } : {}),
      ...(preserved?.outcomeStatus
        ? { linked_outcome_status: preserved.outcomeStatus }
        : {}),
      last_rebuilt_at: new Date().toISOString(),
    };

    if (existing) {
      const { error: updateActionError } = await supabase
        .from("snapshot_recommended_actions")
        .update({
          title: action.title,
          description: action.description,
          priority: action.priority,
          due_in_days: action.dueInDays,
          evidence_needed: action.evidenceNeeded,
          success_criteria: action.successCriteria,
          source_reason_codes: action.sourceReasonCodes,
          metadata,
          status: finalStatus,
          action_status: finalStatus,
          owner_user_id: ownerUserId,
        })
        .eq("id", existing.id);

      if (updateActionError) {
        throw new Error(
          `snapshot_recommended_actions 업데이트 실패: ${updateActionError.message}`,
        );
      }
    } else {
      const { error: insertActionError } = await supabase
        .from("snapshot_recommended_actions")
        .insert({
          health_snapshot_id: snapshotId,
          playbook_code: action.playbookCode,
          title: action.title,
          description: action.description,
          priority: action.priority,
          due_in_days: action.dueInDays,
          status: finalStatus,
          action_status: finalStatus,
          evidence_needed: action.evidenceNeeded,
          success_criteria: action.successCriteria,
          source_reason_codes: action.sourceReasonCodes,
          owner_user_id: ownerUserId,
          metadata,
        });

      if (insertActionError) {
        throw new Error(
          `snapshot_recommended_actions 신규 insert 실패: ${insertActionError.message}`,
        );
      }
    }

    topActionsWithState.push({
      playbookCode: action.playbookCode,
      title: action.title,
      description: action.description,
      priority: action.priority,
      dueInDays: action.dueInDays,
      status: finalStatus,
      evidenceNeeded: action.evidenceNeeded,
      successCriteria: action.successCriteria,
      sourceReasonCodes: action.sourceReasonCodes,
      taskId: preserved?.taskId ?? null,
      taskStatus: preserved?.taskStatus ?? null,
      outcomeStatus: preserved?.outcomeStatus ?? null,
    });
  }

  const staleRecommendedIds = existingRows
    .filter((row) => !nextCodes.has(String(row.playbook_code ?? "")))
    .filter((row) => {
      const status = normalizeActionStatus(row.action_status ?? row.status);
      return status === "recommended" || status === "dismissed";
    })
    .map((row) => row.id);

  if (staleRecommendedIds.length > 0) {
    const { error: deleteStaleActionsError } = await supabase
      .from("snapshot_recommended_actions")
      .delete()
      .in("id", staleRecommendedIds);

    if (deleteStaleActionsError) {
      throw new Error(
        `snapshot_recommended_actions 불필요 recommended 삭제 실패: ${deleteStaleActionsError.message}`,
      );
    }
  }

  const { error: updateTargetError } = await supabase
    .from("external_intel_targets")
    .update({
      latest_stage: stage,
      latest_market_risk_score: marketRiskScore,
      latest_business_risk_score: businessRiskScore,
      latest_rescue_chance_score: rescueChanceScore,
      latest_closing_risk_score: closingRiskScore,
      last_snapshot_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", monitorId);

  if (updateTargetError) {
    throw new Error(`external_intel_targets 갱신 실패: ${updateTargetError.message}`);
  }

  return {
    ok: true,
    monitorId,
    snapshotId,
    snapshotDate,
    stage,
    scores: {
      marketRiskScore,
      businessRiskScore,
      rescueChanceScore,
      closingRiskScore,
    },
    whySummary,
    actionSummary,
    nextReviewAt,
    topReasons: normalizedReasons.slice(0, 3),
    topActions: topActionsWithState,
  };
}
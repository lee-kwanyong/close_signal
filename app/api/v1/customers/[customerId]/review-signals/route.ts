import { NextResponse } from "next/server";

import { db } from "@/lib/db/repositories";
import { normalizeCustomerId } from "@/lib/customer-id";

export const runtime = "nodejs";

type MatchMode =
  | "review_account"
  | "care_lead_store"
  | "fallback_latest"
  | "empty";

type WeeklyStatRow = {
  id: string;
  platform: string;
  platform_label: string | null;
  store_name: string | null;
  account_identifier: string | null;
  week_start_date: string;
  review_count: number | string | null;
  avg_rating: number | string | null;
  negative_review_count: number | string | null;
  positive_review_count: number | string | null;
  neutral_review_count: number | string | null;
  negative_review_rate: number | string | null;
  positive_review_rate: number | string | null;
  top_issue_json: unknown;
  growth_signal_memo: string | null;
};

type IssueSnapshotRow = {
  id: string;
  platform: string;
  platform_label: string | null;
  store_name: string | null;
  account_identifier: string | null;
  week_start_date: string;
  negative_review_rate: number | string | null;
  top_negative_keywords: string[] | null;
  issue_json: unknown;
};

type CareLeadRow = {
  id: string;
  customer_id: string | null;
  store_name: string | null;
  business_number_last4: string | null;
  reviewer_connected: boolean | null;
  growth_report_created: boolean | null;
  review_platform: string | null;
  review_platform_label: string | null;
  review_account_identifier: string | null;
  created_at: string;
};

type IssueItem = {
  category: string;
  count: number;
};

function normalizeText(value: string | null | undefined): string | null {
  const normalized = value?.trim();

  if (!normalized) {
    return null;
  }

  return normalized;
}

function toNumber(value: unknown): number {
  if (value === null || value === undefined) {
    return 0;
  }

  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return 0;
  }

  return parsed;
}

function toNullableNumber(value: unknown): number | null {
  if (value === null || value === undefined) {
    return null;
  }

  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return null;
  }

  return parsed;
}

function ratio(part: number, total: number): number {
  if (total <= 0) {
    return 0;
  }

  return Math.round((part / total) * 10000) / 10000;
}

function platformLabel(platform: string, label: string | null): string {
  if (label) {
    return label;
  }

  const labels: Record<string, string> = {
    baemin: "배달의민족",
    yogiyo: "요기요",
    coupang_eats: "쿠팡이츠",
    naver: "네이버 플레이스",
    kakao: "카카오맵",
    google: "구글",
  };

  return labels[platform] ?? platform;
}

function normalizeIssueJson(value: unknown): IssueItem[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      if (!item || typeof item !== "object") {
        return null;
      }

      const objectItem = item as Record<string, unknown>;

      const category =
        normalizeText(String(objectItem.category ?? "")) ??
        normalizeText(String(objectItem.keyword ?? "")) ??
        null;

      if (!category) {
        return null;
      }

      return {
        category,
        count: toNumber(objectItem.count),
      };
    })
    .filter((item): item is IssueItem => Boolean(item));
}

function getWeekAggregate(rows: WeeklyStatRow[]) {
  const byWeek = new Map<
    string,
    {
      weekStartDate: string;
      reviewCount: number;
      negativeReviewCount: number;
      positiveReviewCount: number;
      neutralReviewCount: number;
      ratingSum: number;
      ratingCount: number;
    }
  >();

  for (const row of rows) {
    const weekStartDate = row.week_start_date;

    const current =
      byWeek.get(weekStartDate) ??
      {
        weekStartDate,
        reviewCount: 0,
        negativeReviewCount: 0,
        positiveReviewCount: 0,
        neutralReviewCount: 0,
        ratingSum: 0,
        ratingCount: 0,
      };

    const reviewCount = toNumber(row.review_count);
    const avgRating = toNullableNumber(row.avg_rating);

    current.reviewCount += reviewCount;
    current.negativeReviewCount += toNumber(row.negative_review_count);
    current.positiveReviewCount += toNumber(row.positive_review_count);
    current.neutralReviewCount += toNumber(row.neutral_review_count);

    if (avgRating !== null && reviewCount > 0) {
      current.ratingSum += avgRating * reviewCount;
      current.ratingCount += reviewCount;
    }

    byWeek.set(weekStartDate, current);
  }

  return Array.from(byWeek.values())
    .sort((a, b) => b.weekStartDate.localeCompare(a.weekStartDate))
    .map((week) => ({
      ...week,
      avgRating:
        week.ratingCount > 0
          ? Math.round((week.ratingSum / week.ratingCount) * 100) / 100
          : null,
      negativeReviewRate: ratio(week.negativeReviewCount, week.reviewCount),
      positiveReviewRate: ratio(week.positiveReviewCount, week.reviewCount),
    }));
}

function getPlatformAggregate(rows: WeeklyStatRow[]) {
  const byPlatform = new Map<
    string,
    {
      platform: string;
      platformLabel: string;
      reviewCount: number;
      negativeReviewCount: number;
      positiveReviewCount: number;
      latestWeekStartDate: string | null;
    }
  >();

  for (const row of rows) {
    const current =
      byPlatform.get(row.platform) ??
      {
        platform: row.platform,
        platformLabel: platformLabel(row.platform, row.platform_label),
        reviewCount: 0,
        negativeReviewCount: 0,
        positiveReviewCount: 0,
        latestWeekStartDate: null,
      };

    current.reviewCount += toNumber(row.review_count);
    current.negativeReviewCount += toNumber(row.negative_review_count);
    current.positiveReviewCount += toNumber(row.positive_review_count);

    if (
      !current.latestWeekStartDate ||
      row.week_start_date > current.latestWeekStartDate
    ) {
      current.latestWeekStartDate = row.week_start_date;
    }

    byPlatform.set(row.platform, current);
  }

  return Array.from(byPlatform.values())
    .map((platform) => ({
      ...platform,
      negativeReviewRate: ratio(
        platform.negativeReviewCount,
        platform.reviewCount
      ),
      positiveReviewRate: ratio(
        platform.positiveReviewCount,
        platform.reviewCount
      ),
    }))
    .sort((a, b) => b.reviewCount - a.reviewCount);
}

function getTopIssues(rows: WeeklyStatRow[], snapshots: IssueSnapshotRow[]) {
  const issueMap = new Map<string, number>();

  for (const row of rows) {
    for (const issue of normalizeIssueJson(row.top_issue_json)) {
      issueMap.set(
        issue.category,
        (issueMap.get(issue.category) ?? 0) + issue.count
      );
    }
  }

  for (const snapshot of snapshots) {
    for (const keyword of snapshot.top_negative_keywords ?? []) {
      issueMap.set(keyword, (issueMap.get(keyword) ?? 0) + 1);
    }

    for (const issue of normalizeIssueJson(snapshot.issue_json)) {
      issueMap.set(
        issue.category,
        (issueMap.get(issue.category) ?? 0) + issue.count
      );
    }
  }

  return Array.from(issueMap.entries())
    .map(([category, count]) => ({
      category,
      count,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
}

function buildSummary(params: {
  latestWeekReviewCount: number;
  reviewDropRate: number | null;
  latestNegativeRate: number;
  topIssueCategory: string | null;
  matchMode: MatchMode;
}) {
  if (params.latestWeekReviewCount === 0) {
    return {
      status: "empty",
      title: "리뷰 신호가 아직 부족합니다",
      message:
        "Reviewer에서 리뷰를 수집하고 Growth Signal 지표 생성을 실행하면 이 고객의 리뷰 기반 고객 반응 신호가 표시됩니다.",
    };
  }

  if (params.matchMode === "review_account") {
    if (params.latestNegativeRate >= 0.35) {
      return {
        status: "danger",
        title: "이 고객의 리뷰 계정에서 부정 신호가 높습니다",
        message: params.topIssueCategory
          ? `연결된 리뷰 계정에서 “${params.topIssueCategory}” 이슈가 반복되고 있습니다. 2차 케어에서 고객 반응 개선 액션이 필요합니다.`
          : "연결된 리뷰 계정의 부정 리뷰 비율이 높습니다.",
      };
    }

    return {
      status: params.latestNegativeRate >= 0.2 ? "watch" : "stable",
      title: "이 고객의 리뷰 계정 신호가 연결되었습니다",
      message:
        "review_account_identifier 기준으로 정확히 매칭된 Reviewer 리뷰 지표입니다.",
    };
  }

  if (params.matchMode === "fallback_latest") {
    return {
      status: "watch",
      title: "최근 수집된 리뷰 신호를 참고 표시 중입니다",
      message:
        "이 고객의 리뷰 계정과 정확히 매칭된 지표가 없어 최근 수집된 Reviewer 지표를 참고용으로 표시합니다.",
    };
  }

  if (params.reviewDropRate !== null && params.reviewDropRate >= 0.3) {
    return {
      status: "warning",
      title: "리뷰 유입이 감소하고 있습니다",
      message:
        "최근 리뷰 수가 이전 주 대비 감소했습니다. 고객 유입과 재방문 신호를 함께 확인해야 합니다.",
    };
  }

  if (params.latestNegativeRate >= 0.2) {
    return {
      status: "watch",
      title: "리뷰 신호 관찰이 필요합니다",
      message:
        "부정 리뷰 비율이 관찰 구간입니다. 반복 이슈와 답글 대응 상태를 함께 관리하세요.",
    };
  }

  return {
    status: "stable",
    title: "리뷰 신호는 안정 구간입니다",
    message:
      "현재 리뷰 신호는 큰 위험 구간은 아니지만, 리뷰 유입과 부정 키워드는 계속 추적하는 것이 좋습니다.",
  };
}

async function getCareLead(customerId: string): Promise<CareLeadRow | null> {
  const client = db() as any;

  const { data, error } = await client
    .from("care_program_leads")
    .select(
      [
        "id",
        "customer_id",
        "store_name",
        "business_number_last4",
        "reviewer_connected",
        "growth_report_created",
        "review_platform",
        "review_platform_label",
        "review_account_identifier",
        "created_at",
      ].join(",")
    )
    .eq("customer_id", customerId)
    .order("created_at", {
      ascending: false,
    })
    .limit(1);

  if (error) {
    throw new Error(error.message);
  }

  return (data?.[0] ?? null) as CareLeadRow | null;
}

async function queryWeeklyRows(params: {
  accountIdentifier?: string | null;
  platform?: string | null;
  storeName?: string | null;
  mode: "account" | "store" | "latest";
}) {
  const client = db() as any;

  const selectColumns = [
    "id",
    "platform",
    "platform_label",
    "store_name",
    "account_identifier",
    "week_start_date",
    "review_count",
    "avg_rating",
    "negative_review_count",
    "positive_review_count",
    "neutral_review_count",
    "negative_review_rate",
    "positive_review_rate",
    "top_issue_json",
    "growth_signal_memo",
  ].join(",");

  let query = client
    .from("review_weekly_stats")
    .select(selectColumns)
    .order("week_start_date", {
      ascending: false,
    })
    .limit(200);

  if (params.mode === "account" && params.accountIdentifier) {
    query = query.eq("account_identifier", params.accountIdentifier);

    if (params.platform) {
      query = query.eq("platform", params.platform);
    }
  }

  if (params.mode === "store" && params.storeName) {
    query = query.ilike("store_name", `%${params.storeName}%`);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as WeeklyStatRow[];
}

async function getWeeklyRows(params: {
  storeName: string | null;
  reviewPlatform: string | null;
  reviewAccountIdentifier: string | null;
}) {
  if (params.reviewAccountIdentifier) {
    const rows = await queryWeeklyRows({
      accountIdentifier: params.reviewAccountIdentifier,
      platform: params.reviewPlatform,
      mode: "account",
    });

    if (rows.length > 0) {
      return {
        rows,
        matchMode: "review_account" as const,
      };
    }
  }

  if (params.storeName) {
    const rows = await queryWeeklyRows({
      storeName: params.storeName,
      mode: "store",
    });

    if (rows.length > 0) {
      return {
        rows,
        matchMode: "care_lead_store" as const,
      };
    }
  }

  const rows = await queryWeeklyRows({
    mode: "latest",
  });

  return {
    rows,
    matchMode: rows.length > 0 ? ("fallback_latest" as const) : ("empty" as const),
  };
}

async function getIssueRows(params: {
  storeName: string | null;
  reviewPlatform: string | null;
  reviewAccountIdentifier: string | null;
  matchMode: MatchMode;
}) {
  if (params.matchMode === "empty") {
    return [] as IssueSnapshotRow[];
  }

  const client = db() as any;

  const selectColumns = [
    "id",
    "platform",
    "platform_label",
    "store_name",
    "account_identifier",
    "week_start_date",
    "negative_review_rate",
    "top_negative_keywords",
    "issue_json",
  ].join(",");

  let query = client
    .from("review_issue_snapshots")
    .select(selectColumns)
    .order("week_start_date", {
      ascending: false,
    })
    .limit(200);

  if (
    params.matchMode === "review_account" &&
    params.reviewAccountIdentifier
  ) {
    query = query.eq("account_identifier", params.reviewAccountIdentifier);

    if (params.reviewPlatform) {
      query = query.eq("platform", params.reviewPlatform);
    }
  } else if (params.matchMode === "care_lead_store" && params.storeName) {
    query = query.ilike("store_name", `%${params.storeName}%`);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as IssueSnapshotRow[];
}

export async function GET(
  _: Request,
  {
    params,
  }: {
    params: {
      customerId: string;
    };
  }
) {
  try {
    const customerId = normalizeCustomerId(params.customerId);

    if (!customerId) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "INVALID_CUSTOMER_ID",
            message: "customerId가 비어 있거나 undefined입니다.",
          },
        },
        {
          status: 400,
        }
      );
    }

    const careLead = await getCareLead(customerId);

    const storeName = careLead?.store_name ?? null;
    const reviewPlatform = careLead?.review_platform ?? null;
    const reviewAccountIdentifier =
      careLead?.review_account_identifier ?? null;

    const weeklyResult = await getWeeklyRows({
      storeName,
      reviewPlatform,
      reviewAccountIdentifier,
    });

    const issueRows = await getIssueRows({
      storeName,
      reviewPlatform,
      reviewAccountIdentifier,
      matchMode: weeklyResult.matchMode,
    });

    const weeklyRows = weeklyResult.rows;
    const weekAggregates = getWeekAggregate(weeklyRows);
    const platformAggregates = getPlatformAggregate(weeklyRows);
    const topIssues = getTopIssues(weeklyRows, issueRows);

    const latestWeek = weekAggregates[0] ?? null;
    const previousWeek = weekAggregates[1] ?? null;

    const reviewDropRate =
      latestWeek && previousWeek && previousWeek.reviewCount > 0
        ? Math.max(
            0,
            (previousWeek.reviewCount - latestWeek.reviewCount) /
              previousWeek.reviewCount
          )
        : null;

    const summary = buildSummary({
      latestWeekReviewCount: latestWeek?.reviewCount ?? 0,
      reviewDropRate,
      latestNegativeRate: latestWeek?.negativeReviewRate ?? 0,
      topIssueCategory: topIssues[0]?.category ?? null,
      matchMode: weeklyResult.matchMode,
    });

    return NextResponse.json({
      success: true,
      data: {
        customerId,
        careLead: careLead
          ? {
              id: careLead.id,
              storeName: careLead.store_name,
              businessNumberLast4: careLead.business_number_last4,
              reviewerConnected: careLead.reviewer_connected,
              growthReportCreated: careLead.growth_report_created,
              reviewPlatform: careLead.review_platform,
              reviewPlatformLabel: careLead.review_platform_label,
              reviewAccountIdentifier: careLead.review_account_identifier,
            }
          : null,
        matchMode: weeklyResult.matchMode,
        sourceNotice:
          weeklyResult.matchMode === "review_account"
            ? "이 고객의 review_account_identifier와 정확히 매칭된 Reviewer 리뷰 지표입니다."
            : weeklyResult.matchMode === "care_lead_store"
              ? "이 고객의 케어 신청 매장명과 매칭된 Reviewer 리뷰 지표입니다."
              : weeklyResult.matchMode === "fallback_latest"
                ? "이 고객과 정확히 매칭된 리뷰 지표가 없어 최근 수집된 Reviewer 지표를 참고용으로 표시합니다."
                : "Reviewer 리뷰 지표가 아직 없습니다.",
        summary,
        latestWeek,
        previousWeek,
        reviewDropRate,
        platforms: platformAggregates,
        topIssues,
        weekSeries: weekAggregates.slice(0, 8).reverse(),
        raw: {
          weeklyRowCount: weeklyRows.length,
          issueSnapshotCount: issueRows.length,
        },
      },
    });
  } catch (error) {
    console.error("[customer review-signals] failed", error);

    return NextResponse.json(
      {
        success: false,
        error: {
          code: "CUSTOMER_REVIEW_SIGNALS_FAILED",
          message:
            error instanceof Error
              ? error.message
              : "고객 리뷰 신호 조회 중 오류가 발생했습니다.",
        },
      },
      {
        status: 500,
      }
    );
  }
}
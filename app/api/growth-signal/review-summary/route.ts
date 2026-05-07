import { NextResponse } from "next/server";

import { db } from "@/lib/db/repositories";

export const runtime = "nodejs";

type ReviewWeeklyStatRow = {
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

type ReviewIssueSnapshotRow = {
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

function getWeekAggregate(rows: ReviewWeeklyStatRow[]) {
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

function getPlatformAggregate(rows: ReviewWeeklyStatRow[]) {
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

function getTopIssues(rows: ReviewWeeklyStatRow[], snapshots: ReviewIssueSnapshotRow[]) {
  const issueMap = new Map<string, number>();

  for (const row of rows) {
    for (const issue of normalizeIssueJson(row.top_issue_json)) {
      issueMap.set(issue.category, (issueMap.get(issue.category) ?? 0) + issue.count);
    }
  }

  for (const snapshot of snapshots) {
    for (const keyword of snapshot.top_negative_keywords ?? []) {
      issueMap.set(keyword, (issueMap.get(keyword) ?? 0) + 1);
    }

    for (const issue of normalizeIssueJson(snapshot.issue_json)) {
      issueMap.set(issue.category, (issueMap.get(issue.category) ?? 0) + issue.count);
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
}) {
  if (params.latestWeekReviewCount === 0) {
    return {
      status: "empty",
      title: "리뷰 신호가 아직 부족합니다",
      message:
        "Reviewer에서 리뷰를 수집하고 Growth Signal 지표 생성을 실행하면 리뷰 기반 고객 반응 신호가 표시됩니다.",
    };
  }

  if (params.latestNegativeRate >= 0.35) {
    return {
      status: "danger",
      title: "부정 리뷰 비율이 높은 구간입니다",
      message: params.topIssueCategory
        ? `최근 리뷰에서 “${params.topIssueCategory}” 이슈가 반복되고 있습니다. 2차 케어에서 고객 반응 개선 액션이 필요합니다.`
        : "부정 리뷰 비율이 높아 고객 반응 개선 액션이 필요합니다.",
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

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);

    const platform = normalizeText(url.searchParams.get("platform"));
    const storeName = normalizeText(url.searchParams.get("storeName"));
    const accountIdentifier = normalizeText(
      url.searchParams.get("accountIdentifier")
    );

    const client = db() as any;

    let weeklyQuery = client
      .from("review_weekly_stats")
      .select(
        [
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
        ].join(",")
      )
      .order("week_start_date", {
        ascending: false,
      })
      .limit(200);

    if (platform && platform !== "all") {
      weeklyQuery = weeklyQuery.eq("platform", platform);
    }

    if (storeName) {
      weeklyQuery = weeklyQuery.ilike("store_name", `%${storeName}%`);
    }

    if (accountIdentifier) {
      weeklyQuery = weeklyQuery.eq("account_identifier", accountIdentifier);
    }

    const { data: weeklyData, error: weeklyError } = await weeklyQuery;

    if (weeklyError) {
      throw new Error(weeklyError.message);
    }

    let issueQuery = client
      .from("review_issue_snapshots")
      .select(
        [
          "id",
          "platform",
          "platform_label",
          "store_name",
          "account_identifier",
          "week_start_date",
          "negative_review_rate",
          "top_negative_keywords",
          "issue_json",
        ].join(",")
      )
      .order("week_start_date", {
        ascending: false,
      })
      .limit(200);

    if (platform && platform !== "all") {
      issueQuery = issueQuery.eq("platform", platform);
    }

    if (storeName) {
      issueQuery = issueQuery.ilike("store_name", `%${storeName}%`);
    }

    if (accountIdentifier) {
      issueQuery = issueQuery.eq("account_identifier", accountIdentifier);
    }

    const { data: issueData, error: issueError } = await issueQuery;

    if (issueError) {
      throw new Error(issueError.message);
    }

    const weeklyRows = (weeklyData ?? []) as ReviewWeeklyStatRow[];
    const issueRows = (issueData ?? []) as ReviewIssueSnapshotRow[];

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
    });

    return NextResponse.json({
      success: true,
      data: {
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
    console.error("[growth-signal/review-summary] failed", error);

    return NextResponse.json(
      {
        success: false,
        error: {
          code: "GROWTH_SIGNAL_REVIEW_SUMMARY_FAILED",
          message:
            error instanceof Error
              ? error.message
              : "Growth Signal 리뷰 요약 조회 중 오류가 발생했습니다.",
        },
      },
      {
        status: 500,
      }
    );
  }
}
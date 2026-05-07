import { NextResponse } from "next/server";

import { db } from "@/lib/db/repositories";

export const runtime = "nodejs";

type ReviewRawItemRow = {
  id: string;
  platform: string;
  platform_label: string | null;
  store_name: string | null;
  account_identifier: string | null;
  rating: number | string | null;
  review_text: string;
  review_date: string | null;
  collected_at: string;
  sentiment: "positive" | "neutral" | "negative";
  issue_categories: string[] | null;
};

type WeeklyGroup = {
  dedupeKey: string;
  platform: string;
  platformLabel: string | null;
  storeName: string | null;
  accountIdentifier: string | null;
  weekStartDate: string;

  reviewCount: number;
  ratingSum: number;
  ratingCount: number;

  negativeReviewCount: number;
  positiveReviewCount: number;
  neutralReviewCount: number;

  issueCounts: Map<string, number>;
};

function normalizeText(value: string | null | undefined): string | null {
  const normalized = value?.trim();

  if (!normalized) {
    return null;
  }

  return normalized;
}

function toNumberOrNull(value: unknown): number | null {
  if (value === null || value === undefined) {
    return null;
  }

  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return null;
  }

  return parsed;
}

function getDateSource(review: ReviewRawItemRow): Date {
  const source = review.review_date ?? review.collected_at;
  const date = new Date(source);

  if (Number.isNaN(date.getTime())) {
    return new Date();
  }

  return date;
}

function getWeekStartDate(value: Date): string {
  const date = new Date(value);
  const day = date.getDay();

  const diffToMonday = day === 0 ? -6 : 1 - day;

  date.setDate(date.getDate() + diffToMonday);
  date.setHours(0, 0, 0, 0);

  return date.toISOString().slice(0, 10);
}

function ratio(part: number, total: number): number {
  if (total <= 0) {
    return 0;
  }

  return Math.round((part / total) * 10000) / 10000;
}

function getGroupKey(params: {
  platform: string;
  accountIdentifier: string | null;
  storeName: string | null;
  weekStartDate: string;
}): string {
  return [
    params.platform,
    params.accountIdentifier ?? "no_account",
    params.storeName ?? "no_store",
    params.weekStartDate,
  ].join("|");
}

function buildGrowthSignalMemo(group: WeeklyGroup): string {
  const negativeRate = ratio(group.negativeReviewCount, group.reviewCount);

  if (group.reviewCount === 0) {
    return "리뷰 데이터가 부족해 Growth Signal에 반영할 수 없습니다.";
  }

  if (negativeRate >= 0.35) {
    return "부정 리뷰 비율이 높아 Growth Signal의 고객 반응 리스크 신호로 강하게 반영됩니다.";
  }

  if (negativeRate >= 0.2) {
    return "부정 리뷰 비율이 주의 구간입니다. Growth Signal의 고객 반응 신호로 반영됩니다.";
  }

  return "리뷰 데이터가 Growth Signal의 고객 반응 보조 신호로 반영됩니다.";
}

function topIssues(group: WeeklyGroup) {
  return Array.from(group.issueCounts.entries())
    .map(([category, count]) => ({
      category,
      count,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
}

async function fetchRawReviews(params: {
  platform?: string | null;
  storeName?: string | null;
  accountIdentifier?: string | null;
}) {
  const client = db() as any;

  let query = client
    .from("review_raw_items")
    .select(
      [
        "id",
        "platform",
        "platform_label",
        "store_name",
        "account_identifier",
        "rating",
        "review_text",
        "review_date",
        "collected_at",
        "sentiment",
        "issue_categories",
      ].join(",")
    )
    .order("collected_at", {
      ascending: false,
    })
    .limit(10000);

  if (params.platform && params.platform !== "all") {
    query = query.eq("platform", params.platform);
  }

  if (params.storeName) {
    query = query.ilike("store_name", `%${params.storeName}%`);
  }

  if (params.accountIdentifier) {
    query = query.eq("account_identifier", params.accountIdentifier);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as ReviewRawItemRow[];
}

function groupReviews(reviews: ReviewRawItemRow[]) {
  const groups = new Map<string, WeeklyGroup>();

  reviews.forEach((review) => {
    const weekStartDate = getWeekStartDate(getDateSource(review));

    const key = getGroupKey({
      platform: review.platform,
      accountIdentifier: review.account_identifier,
      storeName: review.store_name,
      weekStartDate,
    });

    const current =
      groups.get(key) ??
      ({
        dedupeKey: key,
        platform: review.platform,
        platformLabel: review.platform_label,
        storeName: review.store_name,
        accountIdentifier: review.account_identifier,
        weekStartDate,

        reviewCount: 0,
        ratingSum: 0,
        ratingCount: 0,

        negativeReviewCount: 0,
        positiveReviewCount: 0,
        neutralReviewCount: 0,

        issueCounts: new Map<string, number>(),
      } satisfies WeeklyGroup);

    current.reviewCount += 1;

    const rating = toNumberOrNull(review.rating);

    if (rating !== null) {
      current.ratingSum += rating;
      current.ratingCount += 1;
    }

    if (review.sentiment === "negative") {
      current.negativeReviewCount += 1;
    } else if (review.sentiment === "positive") {
      current.positiveReviewCount += 1;
    } else {
      current.neutralReviewCount += 1;
    }

    (review.issue_categories ?? []).forEach((category) => {
      current.issueCounts.set(
        category,
        (current.issueCounts.get(category) ?? 0) + 1
      );
    });

    groups.set(key, current);
  });

  return Array.from(groups.values());
}

function weeklyStatsRows(groups: WeeklyGroup[]) {
  return groups.map((group) => {
    const issues = topIssues(group);
    const avgRating =
      group.ratingCount > 0
        ? Math.round((group.ratingSum / group.ratingCount) * 100) / 100
        : null;

    return {
      dedupe_key: group.dedupeKey,

      platform: group.platform,
      platform_label: group.platformLabel,

      store_name: group.storeName,
      account_identifier: group.accountIdentifier,

      week_start_date: group.weekStartDate,

      review_count: group.reviewCount,
      avg_rating: avgRating,

      negative_review_count: group.negativeReviewCount,
      positive_review_count: group.positiveReviewCount,
      neutral_review_count: group.neutralReviewCount,

      negative_review_rate: ratio(
        group.negativeReviewCount,
        group.reviewCount
      ),
      positive_review_rate: ratio(
        group.positiveReviewCount,
        group.reviewCount
      ),

      top_issue_json: issues,
      growth_signal_memo: buildGrowthSignalMemo(group),

      source_type: "reviewer_aggregate",
    };
  });
}

function issueSnapshotRows(groups: WeeklyGroup[]) {
  return groups.map((group) => {
    const issues = topIssues(group);
    const negativeRate = ratio(group.negativeReviewCount, group.reviewCount);

    return {
      dedupe_key: `${group.dedupeKey}|issue_snapshot`,

      snapshot_date: new Date().toISOString().slice(0, 10),
      week_start_date: group.weekStartDate,

      platform: group.platform,
      platform_label: group.platformLabel,

      store_name: group.storeName,
      account_identifier: group.accountIdentifier,

      negative_review_rate: negativeRate,
      top_negative_keywords: issues.map((issue) => issue.category),
      issue_json: issues,

      source_type: "reviewer_aggregate",
    };
  });
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as {
      platform?: string;
      storeName?: string;
      accountIdentifier?: string;
    };

    const platform = normalizeText(body.platform);
    const storeName = normalizeText(body.storeName);
    const accountIdentifier = normalizeText(body.accountIdentifier);

    const reviews = await fetchRawReviews({
      platform,
      storeName,
      accountIdentifier,
    });

    const groups = groupReviews(reviews);

    const weeklyRows = weeklyStatsRows(groups);
    const issueRows = issueSnapshotRows(groups);

    const client = db() as any;

    if (weeklyRows.length > 0) {
      const { error } = await client
        .from("review_weekly_stats")
        .upsert(weeklyRows, {
          onConflict: "dedupe_key",
        });

      if (error) {
        throw new Error(error.message);
      }
    }

    if (issueRows.length > 0) {
      const { error } = await client
        .from("review_issue_snapshots")
        .upsert(issueRows, {
          onConflict: "dedupe_key",
        });

      if (error) {
        throw new Error(error.message);
      }
    }

    const totalReviewCount = groups.reduce(
      (sum, group) => sum + group.reviewCount,
      0
    );

    const totalNegativeCount = groups.reduce(
      (sum, group) => sum + group.negativeReviewCount,
      0
    );

    return NextResponse.json({
      success: true,
      data: {
        rawReviewCount: reviews.length,
        weeklyGroupCount: groups.length,
        weeklyStatsSaved: weeklyRows.length,
        issueSnapshotsSaved: issueRows.length,
        totalReviewCount,
        totalNegativeCount,
        negativeReviewRate: ratio(totalNegativeCount, totalReviewCount),
      },
    });
  } catch (error) {
    console.error("[reviewer/reviews/aggregate] failed", error);

    return NextResponse.json(
      {
        success: false,
        error: {
          code: "REVIEW_AGGREGATION_FAILED",
          message:
            error instanceof Error
              ? error.message
              : "리뷰 주간 지표 생성 중 오류가 발생했습니다.",
        },
      },
      {
        status: 500,
      }
    );
  }
}
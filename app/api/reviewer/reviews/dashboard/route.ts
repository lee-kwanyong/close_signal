import { NextResponse } from "next/server";

import { db } from "@/lib/db/repositories";

export const runtime = "nodejs";

type ReviewRawItemRow = {
  id: string;
  platform: string;
  platform_label: string | null;
  store_name: string | null;
  account_identifier: string | null;
  author_name: string | null;
  rating: number | string | null;
  review_text: string;
  review_date: string | null;
  collected_at: string;
  sentiment: "positive" | "neutral" | "negative";
  issue_categories: string[] | null;
  reply_draft: string | null;
  reply_status: string | null;
  reply_final_text: string | null;
  reply_copied_at: string | null;
  replied_at: string | null;
};

type ReviewCollectionRunRow = {
  id: string;
  platform: string;
  platform_label: string | null;
  store_name: string | null;
  account_identifier: string | null;
  source_type: string;
  total_reviews: number | string;
  saved_reviews: number | string;
  negative_review_count: number | string;
  positive_review_count: number | string;
  neutral_review_count: number | string;
  negative_review_rate: number | string;
  positive_review_rate: number | string;
  review_health_score: number | string;
  created_at: string;
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

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);

    const platform = normalizeText(url.searchParams.get("platform"));
    const storeName = normalizeText(url.searchParams.get("storeName"));
    const accountIdentifier = normalizeText(
      url.searchParams.get("accountIdentifier")
    );

    const client = db() as any;

    let reviewQuery = client
      .from("review_raw_items")
      .select(
        [
          "id",
          "platform",
          "platform_label",
          "store_name",
          "account_identifier",
          "author_name",
          "rating",
          "review_text",
          "review_date",
          "collected_at",
          "sentiment",
          "issue_categories",
          "reply_draft",
          "reply_status",
          "reply_final_text",
          "reply_copied_at",
          "replied_at",
        ].join(",")
      )
      .order("collected_at", {
        ascending: false,
      })
      .limit(500);

    if (platform && platform !== "all") {
      reviewQuery = reviewQuery.eq("platform", platform);
    }

    if (storeName) {
      reviewQuery = reviewQuery.ilike("store_name", `%${storeName}%`);
    }

    if (accountIdentifier) {
      reviewQuery = reviewQuery.eq("account_identifier", accountIdentifier);
    }

    const { data: reviewData, error: reviewError } = await reviewQuery;

    if (reviewError) {
      throw new Error(reviewError.message);
    }

    let runQuery = client
      .from("review_collection_runs")
      .select(
        [
          "id",
          "platform",
          "platform_label",
          "store_name",
          "account_identifier",
          "source_type",
          "total_reviews",
          "saved_reviews",
          "negative_review_count",
          "positive_review_count",
          "neutral_review_count",
          "negative_review_rate",
          "positive_review_rate",
          "review_health_score",
          "created_at",
        ].join(",")
      )
      .order("created_at", {
        ascending: false,
      })
      .limit(30);

    if (platform && platform !== "all") {
      runQuery = runQuery.eq("platform", platform);
    }

    if (storeName) {
      runQuery = runQuery.ilike("store_name", `%${storeName}%`);
    }

    if (accountIdentifier) {
      runQuery = runQuery.eq("account_identifier", accountIdentifier);
    }

    const { data: runData, error: runError } = await runQuery;

    if (runError) {
      throw new Error(runError.message);
    }

    const reviews = (reviewData ?? []) as ReviewRawItemRow[];
    const runs = (runData ?? []) as ReviewCollectionRunRow[];

    const totalReviews = reviews.length;
    const negativeReviewCount = reviews.filter(
      (review) => review.sentiment === "negative"
    ).length;
    const positiveReviewCount = reviews.filter(
      (review) => review.sentiment === "positive"
    ).length;
    const neutralReviewCount = reviews.filter(
      (review) => review.sentiment === "neutral"
    ).length;

    const repliedCount = reviews.filter(
      (review) => review.reply_status === "replied"
    ).length;

    const replyQueue = reviews
      .filter(
        (review) =>
          review.sentiment === "negative" && review.reply_status !== "replied"
      )
      .slice(0, 50)
      .map((review) => ({
        id: review.id,
        platform: review.platform,
        platformLabel: platformLabel(review.platform, review.platform_label),
        storeName: review.store_name,
        authorName: review.author_name,
        rating: toNumber(review.rating),
        reviewText: review.review_text,
        reviewDate: review.review_date,
        collectedAt: review.collected_at,
        sentiment: review.sentiment,
        issueCategories: review.issue_categories ?? [],
        replyDraft: review.reply_final_text ?? review.reply_draft,
        replyStatus: review.reply_status ?? "drafted",
      }));

    const platformMap = new Map<
      string,
      {
        platform: string;
        platformLabel: string;
        totalReviews: number;
        negativeReviewCount: number;
        positiveReviewCount: number;
        neutralReviewCount: number;
        repliedCount: number;
      }
    >();

    for (const review of reviews) {
      const current =
        platformMap.get(review.platform) ??
        ({
          platform: review.platform,
          platformLabel: platformLabel(review.platform, review.platform_label),
          totalReviews: 0,
          negativeReviewCount: 0,
          positiveReviewCount: 0,
          neutralReviewCount: 0,
          repliedCount: 0,
        } satisfies {
          platform: string;
          platformLabel: string;
          totalReviews: number;
          negativeReviewCount: number;
          positiveReviewCount: number;
          neutralReviewCount: number;
          repliedCount: number;
        });

      current.totalReviews += 1;

      if (review.sentiment === "negative") {
        current.negativeReviewCount += 1;
      } else if (review.sentiment === "positive") {
        current.positiveReviewCount += 1;
      } else {
        current.neutralReviewCount += 1;
      }

      if (review.reply_status === "replied") {
        current.repliedCount += 1;
      }

      platformMap.set(review.platform, current);
    }

    const issueMap = new Map<
      string,
      {
        category: string;
        count: number;
      }
    >();

    for (const review of reviews) {
      for (const category of review.issue_categories ?? []) {
        const current = issueMap.get(category) ?? {
          category,
          count: 0,
        };

        current.count += 1;
        issueMap.set(category, current);
      }
    }

    const topIssues = Array.from(issueMap.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 12);

    const latestReviews = reviews.slice(0, 50).map((review) => ({
      id: review.id,
      platform: review.platform,
      platformLabel: platformLabel(review.platform, review.platform_label),
      storeName: review.store_name,
      authorName: review.author_name,
      rating: toNumber(review.rating),
      reviewText: review.review_text,
      reviewDate: review.review_date,
      collectedAt: review.collected_at,
      sentiment: review.sentiment,
      issueCategories: review.issue_categories ?? [],
      replyStatus: review.reply_status ?? "drafted",
      replyDraft: review.reply_final_text ?? review.reply_draft,
    }));

    return NextResponse.json({
      success: true,
      data: {
        summary: {
          totalReviews,
          negativeReviewCount,
          positiveReviewCount,
          neutralReviewCount,
          repliedCount,
          replyWaitingCount: replyQueue.length,
          negativeReviewRate: ratio(negativeReviewCount, totalReviews),
          positiveReviewRate: ratio(positiveReviewCount, totalReviews),
        },
        platforms: Array.from(platformMap.values()).map((item) => ({
          ...item,
          negativeReviewRate: ratio(
            item.negativeReviewCount,
            item.totalReviews
          ),
          replyRate: ratio(item.repliedCount, item.negativeReviewCount),
        })),
        topIssues,
        replyQueue,
        latestReviews,
        runs: runs.map((run) => ({
          id: run.id,
          platform: run.platform,
          platformLabel: platformLabel(run.platform, run.platform_label),
          storeName: run.store_name,
          accountIdentifier: run.account_identifier,
          sourceType: run.source_type,
          totalReviews: toNumber(run.total_reviews),
          savedReviews: toNumber(run.saved_reviews),
          negativeReviewCount: toNumber(run.negative_review_count),
          positiveReviewCount: toNumber(run.positive_review_count),
          neutralReviewCount: toNumber(run.neutral_review_count),
          negativeReviewRate: toNumber(run.negative_review_rate),
          positiveReviewRate: toNumber(run.positive_review_rate),
          reviewHealthScore: toNumber(run.review_health_score),
          createdAt: run.created_at,
        })),
      },
    });
  } catch (error) {
    console.error("[reviewer/reviews/dashboard] failed", error);

    return NextResponse.json(
      {
        success: false,
        error: {
          code: "REVIEW_DASHBOARD_FAILED",
          message:
            error instanceof Error
              ? error.message
              : "리뷰 대시보드 조회 중 오류가 발생했습니다.",
        },
      },
      {
        status: 500,
      }
    );
  }
}
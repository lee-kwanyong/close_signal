import { createHash } from "node:crypto";
import { NextResponse } from "next/server";

import { db } from "@/lib/db/repositories";

export const runtime = "nodejs";

type ReviewPlatform =
  | "baemin"
  | "yogiyo"
  | "coupang_eats"
  | "naver"
  | "kakao"
  | "google";

type Sentiment = "positive" | "neutral" | "negative";

type ParsedReview = {
  externalReviewId: string | null;
  authorName: string | null;
  rating: number | null;
  reviewText: string;
  reviewDate: string | null;
  raw: Record<string, unknown>;
};

type IssueDefinition = {
  keyword: string;
  category: string;
  severity: "low" | "medium" | "high";
  guide: string;
  replyGuide: string;
};

const PLATFORM_LABELS: Record<ReviewPlatform, string> = {
  baemin: "배달의민족 사장님앱",
  yogiyo: "요기요 사장님",
  coupang_eats: "쿠팡이츠 스토어",
  naver: "네이버 플레이스",
  kakao: "카카오맵",
  google: "구글 비즈니스",
};

const NEGATIVE_ISSUES: IssueDefinition[] = [
  {
    keyword: "대기",
    category: "대기시간",
    severity: "high",
    guide:
      "대기 시간 관련 불만이 반복됩니다. 피크타임 운영 동선과 예약/포장 안내를 점검하세요.",
    replyGuide:
      "대기 시간에 대해 먼저 사과하고, 피크타임 운영 개선을 약속하는 답글이 좋습니다.",
  },
  {
    keyword: "늦",
    category: "지연",
    severity: "high",
    guide:
      "배달 또는 응대 지연 신호입니다. 주문 처리 시간과 전달 흐름을 점검하세요.",
    replyGuide:
      "늦어진 점을 인정하고, 재발 방지 노력을 전달하는 답글이 좋습니다.",
  },
  {
    keyword: "불친절",
    category: "응대",
    severity: "high",
    guide:
      "직원 응대 관련 불만입니다. 재방문 의사를 크게 낮출 수 있어 빠른 개선이 필요합니다.",
    replyGuide:
      "불친절하게 느끼게 한 점을 사과하고, 직원 교육과 응대 개선을 약속하세요.",
  },
  {
    keyword: "가격",
    category: "가격",
    severity: "medium",
    guide:
      "가격 대비 만족도 문제입니다. 메뉴 구성, 양, 혜택 안내를 점검하세요.",
    replyGuide:
      "가격 부담을 이해한다고 공감하고, 더 만족스러운 구성을 준비하겠다고 답하세요.",
  },
  {
    keyword: "비싸",
    category: "가격",
    severity: "medium",
    guide:
      "가격 체감이 높다는 신호입니다. 할인보다 가치 설명과 메뉴 구성이 중요합니다.",
    replyGuide:
      "가격에 대한 의견을 감사히 받아들이고, 품질과 구성 개선 의지를 전달하세요.",
  },
  {
    keyword: "맛없",
    category: "맛",
    severity: "high",
    guide:
      "맛 관련 불만은 핵심 품질 신호입니다. 특정 메뉴와 조리 편차를 확인하세요.",
    replyGuide:
      "맛에 만족을 드리지 못한 점을 사과하고, 메뉴 품질 점검을 약속하세요.",
  },
  {
    keyword: "식어서",
    category: "배달품질",
    severity: "medium",
    guide:
      "배달 중 온도 유지 문제가 있을 수 있습니다. 포장 방식과 배달 동선을 점검하세요.",
    replyGuide:
      "음식 온도 문제에 대해 사과하고, 포장과 전달 과정을 개선하겠다고 답하세요.",
  },
  {
    keyword: "위생",
    category: "위생",
    severity: "high",
    guide:
      "위생 이슈는 즉시 확인이 필요한 고위험 리뷰 신호입니다.",
    replyGuide:
      "위생 문제는 가볍게 넘기지 말고 즉시 확인과 개선 조치를 약속하세요.",
  },
  {
    keyword: "양",
    category: "양/구성",
    severity: "medium",
    guide:
      "양이나 구성에 대한 불만입니다. 메뉴 설명, 사진, 실제 제공량을 점검하세요.",
    replyGuide:
      "양에 대한 의견을 감사히 받고, 메뉴 구성과 제공 기준을 점검하겠다고 답하세요.",
  },
];

const POSITIVE_KEYWORDS = [
  "맛있",
  "친절",
  "만족",
  "재방문",
  "깔끔",
  "빠르",
  "좋",
  "추천",
  "최고",
  "감사",
];

function isReviewPlatform(value: string): value is ReviewPlatform {
  return value in PLATFORM_LABELS;
}

function normalizeText(value: unknown): string | null {
  if (value === null || value === undefined) {
    return null;
  }

  const normalized = String(value).trim();

  if (!normalized) {
    return null;
  }

  return normalized;
}

function numberValue(value: unknown): number | null {
  const text = normalizeText(value);

  if (!text) {
    return null;
  }

  const parsed = Number(text.replace(/[^0-9.]/g, ""));

  if (!Number.isFinite(parsed)) {
    return null;
  }

  return parsed;
}

function safeJsonParse(value: string): unknown | null {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function hashText(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const nextChar = line[index + 1];

    if (char === '"' && inQuotes && nextChar === '"') {
      current += '"';
      index += 1;
      continue;
    }

    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (char === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
      continue;
    }

    current += char;
  }

  result.push(current.trim());

  return result;
}

function objectToReview(value: Record<string, unknown>): ParsedReview | null {
  const reviewText =
    normalizeText(value.review_text) ??
    normalizeText(value.reviewText) ??
    normalizeText(value.content) ??
    normalizeText(value.text) ??
    normalizeText(value.body) ??
    normalizeText(value.comment) ??
    normalizeText(value.message);

  if (!reviewText) {
    return null;
  }

  return {
    externalReviewId:
      normalizeText(value.external_review_id) ??
      normalizeText(value.externalReviewId) ??
      normalizeText(value.review_id) ??
      normalizeText(value.reviewId) ??
      normalizeText(value.id),
    authorName:
      normalizeText(value.author_name) ??
      normalizeText(value.authorName) ??
      normalizeText(value.author) ??
      normalizeText(value.nickname) ??
      normalizeText(value.user),
    rating:
      numberValue(value.rating) ??
      numberValue(value.score) ??
      numberValue(value.star) ??
      numberValue(value.stars),
    reviewText,
    reviewDate:
      normalizeText(value.review_date) ??
      normalizeText(value.reviewDate) ??
      normalizeText(value.created_at) ??
      normalizeText(value.date),
    raw: value,
  };
}

function parseJsonReviews(rawText: string): ParsedReview[] {
  const parsed = safeJsonParse(rawText);

  if (!parsed) {
    return [];
  }

  const arrayValue = Array.isArray(parsed)
    ? parsed
    : typeof parsed === "object" && parsed !== null
      ? ((parsed as Record<string, unknown>).items as unknown[]) ??
        ((parsed as Record<string, unknown>).reviews as unknown[]) ??
        ((parsed as Record<string, unknown>).data as unknown[])
      : [];

  if (!Array.isArray(arrayValue)) {
    return [];
  }

  return arrayValue
    .map((item) =>
      typeof item === "object" && item !== null
        ? objectToReview(item as Record<string, unknown>)
        : null
    )
    .filter((item): item is ParsedReview => item !== null);
}

function parseJsonlReviews(rawText: string): ParsedReview[] {
  const lines = rawText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const reviews: ParsedReview[] = [];

  for (const line of lines) {
    const parsed = safeJsonParse(line);

    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      const review = objectToReview(parsed as Record<string, unknown>);

      if (review) {
        reviews.push(review);
      }
    }
  }

  return reviews;
}

function parseCsvReviews(rawText: string): ParsedReview[] {
  const lines = rawText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2 || !lines[0].includes(",")) {
    return [];
  }

  const headers = parseCsvLine(lines[0]).map((header) =>
    header.trim().toLowerCase()
  );

  const reviews: ParsedReview[] = [];

  for (const line of lines.slice(1)) {
    const values = parseCsvLine(line);
    const row: Record<string, unknown> = {};

    headers.forEach((header, index) => {
      row[header] = values[index];
    });

    const review = objectToReview(row);

    if (review) {
      reviews.push(review);
    }
  }

  return reviews;
}

function parsePlainTextReviews(rawText: string): ParsedReview[] {
  return rawText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length >= 4)
    .map((line, index) => ({
      externalReviewId: null,
      authorName: null,
      rating: null,
      reviewText: line,
      reviewDate: null,
      raw: {
        lineNumber: index + 1,
        source: "plain_text",
      },
    }));
}

function parseReviews(rawText: string): ParsedReview[] {
  const jsonReviews = parseJsonReviews(rawText);

  if (jsonReviews.length > 0) {
    return jsonReviews;
  }

  const jsonlReviews = parseJsonlReviews(rawText);

  if (jsonlReviews.length > 0) {
    return jsonlReviews;
  }

  const csvReviews = parseCsvReviews(rawText);

  if (csvReviews.length > 0) {
    return csvReviews;
  }

  return parsePlainTextReviews(rawText);
}

function findIssues(reviewText: string): IssueDefinition[] {
  return NEGATIVE_ISSUES.filter((issue) => reviewText.includes(issue.keyword));
}

function hasPositiveSignal(reviewText: string): boolean {
  return POSITIVE_KEYWORDS.some((keyword) => reviewText.includes(keyword));
}

function sentimentForReview(reviewText: string): Sentiment {
  const issues = findIssues(reviewText);

  if (issues.length > 0) {
    return "negative";
  }

  if (hasPositiveSignal(reviewText)) {
    return "positive";
  }

  return "neutral";
}

function buildReplyDraft(reviewText: string, issues: IssueDefinition[]): string {
  const primaryIssue = issues[0];

  if (!primaryIssue) {
    return "소중한 리뷰 감사합니다. 남겨주신 의견을 바탕으로 더 만족스러운 서비스를 제공할 수 있도록 계속 점검하겠습니다.";
  }

  return `소중한 의견 남겨주셔서 감사합니다. ${primaryIssue.replyGuide} 말씀해주신 부분은 매장 내부에서 바로 확인하고 개선하겠습니다. 다시 방문해주시면 더 나은 경험을 드릴 수 있도록 준비하겠습니다.`;
}

function calculateHealthScore(params: {
  totalReviews: number;
  negativeReviewCount: number;
  positiveReviewCount: number;
  highIssueCount: number;
}) {
  if (params.totalReviews <= 0) {
    return 0;
  }

  const negativeRate = params.negativeReviewCount / params.totalReviews;
  const positiveRate = params.positiveReviewCount / params.totalReviews;

  const score =
    80 -
    negativeRate * 45 -
    params.highIssueCount * 4 +
    Math.min(12, positiveRate * 18);

  return Math.round(Math.max(15, Math.min(96, score)));
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      platform?: string;
      storeName?: string;
      accountIdentifier?: string;
      sourceType?: string;
      rawText?: string;
    };

    const platform = normalizeText(body.platform);

    if (!platform || !isReviewPlatform(platform)) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "INVALID_PLATFORM",
            message: "리뷰 플랫폼을 선택해주세요.",
          },
        },
        {
          status: 400,
        }
      );
    }

    const rawText = normalizeText(body.rawText);

    if (!rawText) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "REVIEWS_REQUIRED",
            message: "수집할 리뷰 원문, CSV, JSON 또는 JSONL을 입력해주세요.",
          },
        },
        {
          status: 400,
        }
      );
    }

    const storeName = normalizeText(body.storeName);
    const accountIdentifier = normalizeText(body.accountIdentifier);
    const sourceType = normalizeText(body.sourceType) ?? "manual_upload";
    const platformLabel = PLATFORM_LABELS[platform];

    const parsedReviews = parseReviews(rawText);

    if (parsedReviews.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "NO_VALID_REVIEWS",
            message: "수집 가능한 리뷰를 찾지 못했습니다.",
          },
        },
        {
          status: 400,
        }
      );
    }

    let negativeReviewCount = 0;
    let positiveReviewCount = 0;
    let neutralReviewCount = 0;
    let highIssueCount = 0;

    const issueMap = new Map<
      string,
      {
        definition: IssueDefinition;
        count: number;
      }
    >();

    const analyzedReviews = parsedReviews.map((review) => {
      const issues = findIssues(review.reviewText);
      const sentiment = sentimentForReview(review.reviewText);

      if (sentiment === "negative") {
        negativeReviewCount += 1;
      } else if (sentiment === "positive") {
        positiveReviewCount += 1;
      } else {
        neutralReviewCount += 1;
      }

      for (const issue of issues) {
        const current = issueMap.get(issue.keyword);

        issueMap.set(issue.keyword, {
          definition: issue,
          count: (current?.count ?? 0) + 1,
        });

        if (issue.severity === "high") {
          highIssueCount += 1;
        }
      }

      const issueCategories = issues.map((issue) => issue.category);
      const replyDraft = buildReplyDraft(review.reviewText, issues);
      const fallbackExternalId = hashText(
        [
          platform,
          accountIdentifier ?? "",
          review.authorName ?? "",
          review.rating ?? "",
          review.reviewDate ?? "",
          review.reviewText,
        ].join("|")
      );

      const externalReviewId = review.externalReviewId ?? fallbackExternalId;

      const reviewDedupeKey = hashText(
        [platform, accountIdentifier ?? "", externalReviewId].join("|")
      );

      return {
        ...review,
        externalReviewId,
        reviewDedupeKey,
        sentiment,
        issueCategories,
        replyDraft,
      };
    });

    const totalReviews = analyzedReviews.length;
    const negativeReviewRate = negativeReviewCount / totalReviews;
    const positiveReviewRate = positiveReviewCount / totalReviews;

    const topIssues = Array.from(issueMap.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
      .map((item) => ({
        keyword: item.definition.keyword,
        category: item.definition.category,
        count: item.count,
        severity: item.definition.severity,
        guide: item.definition.guide,
      }));

    const replyDrafts = analyzedReviews
      .filter((review) => review.sentiment === "negative")
      .slice(0, 8)
      .map((review) => ({
        review: review.reviewText,
        issueCategories: review.issueCategories,
        replyDraft: review.replyDraft,
      }));

    const reviewHealthScore = calculateHealthScore({
      totalReviews,
      negativeReviewCount,
      positiveReviewCount,
      highIssueCount,
    });

    const growthSignalMemo =
      negativeReviewRate >= 0.25
        ? "부정 리뷰 비율과 반복 불만 키워드를 Growth Signal의 고객 반응 리스크 신호로 반영할 수 있습니다."
        : "현재 리뷰 신호는 Growth Signal의 보조 데이터로 활용 가능하며, 리뷰가 더 쌓이면 더 정밀한 판단이 가능합니다.";

    const client = db() as any;

    const rows = analyzedReviews.map((review) => ({
      platform,
      platform_label: platformLabel,
      store_name: storeName,
      account_identifier: accountIdentifier,
      external_review_id: review.externalReviewId,
      review_dedupe_key: review.reviewDedupeKey,
      author_name: review.authorName,
      rating: review.rating,
      review_text: review.reviewText,
      review_date: review.reviewDate,
      source_type: sourceType,
      sentiment: review.sentiment,
      issue_categories: review.issueCategories,
      reply_draft: review.replyDraft,
      raw_json: review.raw,
    }));

    const { error: upsertError } = await client
      .from("review_raw_items")
      .upsert(rows, {
        onConflict: "review_dedupe_key",
      });

    if (upsertError) {
      throw new Error(upsertError.message);
    }

    const { error: runError } = await client
      .from("review_collection_runs")
      .insert({
        platform,
        platform_label: platformLabel,
        store_name: storeName,
        account_identifier: accountIdentifier,
        source_type: sourceType,
        total_reviews: totalReviews,
        saved_reviews: rows.length,
        negative_review_count: negativeReviewCount,
        positive_review_count: positiveReviewCount,
        neutral_review_count: neutralReviewCount,
        negative_review_rate: negativeReviewRate,
        positive_review_rate: positiveReviewRate,
        review_health_score: reviewHealthScore,
        top_issue_json: topIssues,
        reply_draft_json: replyDrafts,
        growth_signal_memo: growthSignalMemo,
      });

    if (runError) {
      throw new Error(runError.message);
    }

    return NextResponse.json({
      success: true,
      data: {
        platform,
        platformLabel,
        storeName,
        accountIdentifier,
        totalReviews,
        savedReviews: rows.length,
        negativeReviewCount,
        positiveReviewCount,
        neutralReviewCount,
        negativeReviewRate,
        positiveReviewRate,
        reviewHealthScore,
        topIssues,
        replyDrafts,
        growthSignalMemo,
      },
    });
  } catch (error) {
    console.error("[reviewer/reviews/collect] failed", error);

    return NextResponse.json(
      {
        success: false,
        error: {
          code: "REVIEW_COLLECTION_FAILED",
          message:
            error instanceof Error
              ? error.message
              : "리뷰 수집 중 오류가 발생했습니다.",
        },
      },
      {
        status: 500,
      }
    );
  }
}
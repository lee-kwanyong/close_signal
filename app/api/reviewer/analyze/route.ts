import { NextResponse } from "next/server";

export const runtime = "nodejs";

type ReviewPlatform =
  | "baemin"
  | "yogiyo"
  | "coupang_eats"
  | "naver"
  | "kakao"
  | "google";

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
    guide: "대기 시간 관련 불만이 반복되면 예약/포장 안내, 피크타임 운영 동선 점검이 필요합니다.",
    replyGuide:
      "대기 시간에 대해 먼저 사과하고, 피크타임 운영 개선을 약속하는 답글이 좋습니다.",
  },
  {
    keyword: "늦",
    category: "지연",
    severity: "high",
    guide: "배달 또는 응대 지연 신호입니다. 주문 처리 시간과 라이더 전달 흐름을 점검하세요.",
    replyGuide:
      "늦어진 이유를 변명하기보다 불편을 인정하고, 재발 방지 노력을 전달하세요.",
  },
  {
    keyword: "불친절",
    category: "응대",
    severity: "high",
    guide: "직원 응대 관련 불만은 재방문 의사를 크게 낮출 수 있습니다.",
    replyGuide:
      "불친절하게 느끼게 한 점을 사과하고, 직원 교육과 응대 개선을 약속하세요.",
  },
  {
    keyword: "가격",
    category: "가격",
    severity: "medium",
    guide: "가격 대비 만족도 문제입니다. 메뉴 구성, 양, 혜택 안내를 점검하세요.",
    replyGuide:
      "가격 부담을 이해한다고 공감하고, 더 만족스러운 구성을 준비하겠다고 답하세요.",
  },
  {
    keyword: "비싸",
    category: "가격",
    severity: "medium",
    guide: "가격 체감이 높다는 신호입니다. 할인보다 가치 설명과 메뉴 구성이 중요합니다.",
    replyGuide:
      "가격에 대한 의견을 감사히 받아들이고, 품질과 구성 개선 의지를 전달하세요.",
  },
  {
    keyword: "맛없",
    category: "맛",
    severity: "high",
    guide: "맛 관련 불만은 핵심 품질 신호입니다. 특정 메뉴와 조리 편차를 확인하세요.",
    replyGuide:
      "맛에 만족을 드리지 못한 점을 사과하고, 메뉴 품질 점검을 약속하세요.",
  },
  {
    keyword: "식어서",
    category: "배달품질",
    severity: "medium",
    guide: "배달 중 온도 유지 문제가 있을 수 있습니다. 포장 방식과 배달 동선을 점검하세요.",
    replyGuide:
      "음식 온도 문제에 대해 사과하고, 포장과 전달 과정을 개선하겠다고 답하세요.",
  },
  {
    keyword: "위생",
    category: "위생",
    severity: "high",
    guide: "위생 이슈는 즉시 확인이 필요한 고위험 리뷰 신호입니다.",
    replyGuide:
      "위생 문제는 가볍게 넘기지 말고 즉시 확인과 개선 조치를 약속하세요.",
  },
  {
    keyword: "양",
    category: "양/구성",
    severity: "medium",
    guide: "양이나 구성에 대한 불만입니다. 사진, 메뉴 설명, 실제 제공량을 점검하세요.",
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
];

function normalizeText(value: string | null | undefined): string | null {
  const normalized = value?.trim();

  if (!normalized) {
    return null;
  }

  return normalized;
}

function isReviewPlatform(value: string): value is ReviewPlatform {
  return value in PLATFORM_LABELS;
}

function splitReviews(text: string): string[] {
  return text
    .split(/\n+/)
    .map((line) => line.replace(/^[-•\d.)\s]+/, "").trim())
    .filter((line) => line.length >= 4);
}

function findIssues(review: string): IssueDefinition[] {
  return NEGATIVE_ISSUES.filter((issue) => review.includes(issue.keyword));
}

function hasPositiveSignal(review: string): boolean {
  return POSITIVE_KEYWORDS.some((keyword) => review.includes(keyword));
}

function buildReplyDraft(review: string, issues: IssueDefinition[]): string {
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
  if (params.totalReviews === 0) {
    return 0;
  }

  const negativeRate = params.negativeReviewCount / params.totalReviews;
  const positiveRate = params.positiveReviewCount / params.totalReviews;

  const score =
    78 -
    negativeRate * 45 -
    params.highIssueCount * 4 +
    Math.min(12, positiveRate * 18);

  return Math.round(Math.max(15, Math.min(96, score)));
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      platform?: string;
      reviewsText?: string;
    };

    const platform = normalizeText(body.platform) ?? "baemin";

    if (!isReviewPlatform(platform)) {
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

    const reviewsText = normalizeText(body.reviewsText);

    if (!reviewsText) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "REVIEWS_REQUIRED",
            message: "분석할 리뷰 원문을 입력해주세요.",
          },
        },
        {
          status: 400,
        }
      );
    }

    const reviews = splitReviews(reviewsText);

    if (reviews.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "NO_VALID_REVIEWS",
            message: "분석할 수 있는 리뷰 문장이 없습니다.",
          },
        },
        {
          status: 400,
        }
      );
    }

    const issueMap = new Map<
      string,
      {
        definition: IssueDefinition;
        count: number;
      }
    >();

    let negativeReviewCount = 0;
    let positiveReviewCount = 0;
    let highIssueCount = 0;

    const replyDrafts = reviews
      .map((review) => {
        const issues = findIssues(review);
        const positive = hasPositiveSignal(review);

        if (issues.length > 0) {
          negativeReviewCount += 1;
        }

        if (positive) {
          positiveReviewCount += 1;
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

        return {
          review,
          issues,
        };
      })
      .filter((item) => item.issues.length > 0)
      .slice(0, 5)
      .map((item) => ({
        review: item.review,
        issueCategory: item.issues[0]?.category ?? "일반",
        tone: "사과 + 공감 + 개선 약속",
        draft: buildReplyDraft(item.review, item.issues),
      }));

    const totalReviews = reviews.length;
    const negativeReviewRate = negativeReviewCount / totalReviews;
    const positiveReviewRate = positiveReviewCount / totalReviews;

    const topIssues = Array.from(issueMap.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 8)
      .map((item) => ({
        keyword: item.definition.keyword,
        category: item.definition.category,
        count: item.count,
        severity: item.definition.severity,
        guide: item.definition.guide,
      }));

    const reviewHealthScore = calculateHealthScore({
      totalReviews,
      negativeReviewCount,
      positiveReviewCount,
      highIssueCount,
    });

    const summary =
      negativeReviewRate >= 0.35
        ? "부정 리뷰 비율이 높아 빠른 대응이 필요합니다. 반복 키워드부터 개선하고 답글로 신뢰 회복을 시도하세요."
        : negativeReviewRate >= 0.2
          ? "일부 부정 신호가 반복되고 있습니다. 고객 불만 키워드를 먼저 정리하고 응답 품질을 높이는 것이 좋습니다."
          : "전반적으로 큰 부정 신호는 낮지만, 반복 키워드는 계속 관찰하는 것이 좋습니다.";

    const growthSignalMemo =
      negativeReviewRate >= 0.25
        ? "부정 리뷰 비율과 반복 불만 키워드를 Growth Signal의 고객 반응 리스크 신호로 반영할 수 있습니다."
        : "현재 리뷰 신호는 Growth Signal에서 보조 데이터로 활용 가능하며, 추가 리뷰가 쌓이면 더 정밀한 판단이 가능합니다.";

    return NextResponse.json({
      success: true,
      data: {
        platform,
        platformLabel: PLATFORM_LABELS[platform],
        totalReviews,
        negativeReviewCount,
        positiveReviewCount,
        negativeReviewRate,
        positiveReviewRate,
        reviewHealthScore,
        summary,
        topIssues,
        replyDrafts:
          replyDrafts.length > 0
            ? replyDrafts
            : [
                {
                  review: reviews[0],
                  issueCategory: "일반",
                  tone: "감사 + 개선 의지",
                  draft: buildReplyDraft(reviews[0], []),
                },
              ],
        growthSignalMemo,
      },
    });
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "REVIEW_ANALYSIS_FAILED",
          message: "리뷰 분석 중 오류가 발생했습니다.",
        },
      },
      {
        status: 500,
      }
    );
  }
}
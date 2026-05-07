type ApiSuccessEnvelope<T> = {
  success: true;
  data: T;
};

type ApiFailureEnvelope = {
  success: false;
  error?: {
    code?: string;
    message?: string;
    details?: unknown;
  };
};

type ApiEnvelope<T> = ApiSuccessEnvelope<T> | ApiFailureEnvelope;

type ReviewCollectResponse = {
  platform: string;
  platformLabel: string;
  storeName: string | null;
  accountIdentifier: string | null;
  totalReviews: number;
  savedReviews: number;
  negativeReviewCount: number;
  positiveReviewCount: number;
  neutralReviewCount: number;
  negativeReviewRate: number;
  positiveReviewRate: number;
  reviewHealthScore: number;
  topIssues: Array<{
    keyword: string;
    category: string;
    count: number;
    severity: string;
    guide: string;
  }>;
  replyDrafts: Array<{
    review: string;
    issueCategories: string[];
    replyDraft: string;
  }>;
  growthSignalMemo: string;
};

type ReviewAggregateResponse = {
  rawReviewCount: number;
  weeklyGroupCount: number;
  weeklyStatsSaved: number;
  issueSnapshotsSaved: number;
  totalReviewCount: number;
  totalNegativeCount: number;
  negativeReviewRate: number;
};

type CareCompleteResponse = {
  leadId: string;
  sessionId: string;
  plan: string;
  paymentStatus: string;
  careStatus: string;
  activationStatus: string;
  customerId: string;
  scoreId: string;
  sprintId?: string | null;
  missionCount?: number;
  businessNumberLast4?: string | null;
  storeName?: string | null;
  reviewPlatform?: string | null;
  reviewPlatformLabel?: string | null;
  reviewAccountIdentifier?: string | null;
  growthReportUrl: string;
  nextUrl: string;
};

type GrowthSignalLatestResponse = {
  customer_id: string;
  score_id: string;
  growth_signal_score: number;
  reachable_score: number;
  unlock_potential_score: number;
  closure_risk?: {
    score: number;
    level: string;
    level_label: string;
    summary: string;
  };
};

type CustomerReviewSignalsResponse = {
  customerId: string;
  careLead: {
    id: string;
    storeName: string | null;
    businessNumberLast4: string | null;
    reviewerConnected: boolean | null;
    growthReportCreated: boolean | null;
    reviewPlatform?: string | null;
    reviewPlatformLabel?: string | null;
    reviewAccountIdentifier?: string | null;
  } | null;
  matchMode: "review_account" | "care_lead_store" | "fallback_latest" | "empty";
  sourceNotice: string;
  summary: {
    status: string;
    title: string;
    message: string;
  };
  latestWeek: {
    weekStartDate: string;
    reviewCount: number;
    negativeReviewCount: number;
    positiveReviewCount: number;
    neutralReviewCount: number;
    avgRating: number | null;
    negativeReviewRate: number;
    positiveReviewRate: number;
  } | null;
  reviewDropRate: number | null;
  platforms: Array<{
    platform: string;
    platformLabel: string;
    reviewCount: number;
    negativeReviewCount: number;
    positiveReviewCount: number;
    latestWeekStartDate: string | null;
    negativeReviewRate: number;
    positiveReviewRate: number;
  }>;
  topIssues: Array<{
    category: string;
    count: number;
  }>;
  raw: {
    weeklyRowCount: number;
    issueSnapshotCount: number;
  };
};

const APP_URL =
  process.env.SMOKE_APP_URL ??
  process.env.NEXT_PUBLIC_APP_URL ??
  "http://localhost:3000";

const RUN_ID = new Date()
  .toISOString()
  .replace(/[-:.TZ]/g, "")
  .slice(0, 14);

const BUSINESS_NUMBER =
  process.env.SMOKE_BUSINESS_NUMBER ?? `90${String(Date.now()).slice(-8)}`;

const STORE_NAME = process.env.SMOKE_STORE_NAME ?? `스모크테스트매장-${RUN_ID}`;

const ACCOUNT_IDENTIFIER =
  process.env.SMOKE_REVIEW_ACCOUNT_IDENTIFIER ??
  `smoke-baemin-store-${RUN_ID}`;

const REVIEW_PLATFORM = process.env.SMOKE_REVIEW_PLATFORM ?? "baemin";

const REVIEW_TEXT =
  process.env.SMOKE_REVIEW_TEXT ??
  `배달이 늦었고 음식이 식어서 왔습니다.
음식은 맛있었지만 대기 시간이 너무 길었어요.
양이 줄어든 것 같고 가격이 조금 비싸요.
사장님이 친절하고 맛있어서 다음에도 주문할게요.
직원분이 조금 불친절하게 느껴졌습니다.
포장이 깔끔하고 재방문 의사 있습니다.`;

function logStep(title: string) {
  console.log("");
  console.log("=".repeat(80));
  console.log(title);
  console.log("=".repeat(80));
}

function logResult(label: string, value: unknown) {
  console.log(`${label}:`, JSON.stringify(value, null, 2));
}

function getApiUrl(path: string) {
  return `${APP_URL}${path}`;
}

async function assertServerIsRunning() {
  try {
    const response = await fetch(APP_URL, {
      method: "GET",
    });

    if (!response.ok && response.status >= 500) {
      throw new Error(`서버 응답 오류: ${response.status}`);
    }
  } catch (error) {
    throw new Error(
      [
        `개발 서버에 연결할 수 없습니다: ${APP_URL}`,
        "먼저 다른 PowerShell 창에서 아래 명령을 실행해주세요.",
        "",
        "npm run dev",
        "",
        error instanceof Error ? error.message : String(error),
      ].join("\n")
    );
  }
}

async function parseJsonResponse<T>(
  response: Response,
  url: string
): Promise<T> {
  const text = await response.text();
  const contentType = response.headers.get("content-type") ?? "";

  if (!text) {
    throw new Error(`빈 응답입니다: ${url}`);
  }

  if (text.trim().startsWith("<!DOCTYPE html") || text.trim().startsWith("<html")) {
    throw new Error(
      [
        `API가 JSON이 아니라 HTML을 반환했습니다: ${url}`,
        `HTTP status: ${response.status}`,
        `content-type: ${contentType}`,
        "",
        "대부분 아래 상황입니다.",
        "1. Next dev 서버가 .next 캐시 문제로 깨짐",
        "2. dev 서버가 재시작 중인데 API를 너무 빨리 호출함",
        "3. API route가 아니라 error page가 반환됨",
        "",
        "해결:",
        "Ctrl+C로 dev 서버 종료",
        "Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force",
        "Remove-Item -Recurse -Force .next",
        "npm run typecheck",
        "npm run dev",
        "",
        "HTML 응답 앞부분:",
        text.slice(0, 500),
      ].join("\n")
    );
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error(
      [
        `JSON 파싱 실패: ${url}`,
        `HTTP status: ${response.status}`,
        `content-type: ${contentType}`,
        "",
        text.slice(0, 500),
      ].join("\n")
    );
  }

  return parsed as T;
}

async function apiPost<T>(
  path: string,
  body: Record<string, unknown>
): Promise<T> {
  const url = getApiUrl(path);

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const envelope = await parseJsonResponse<ApiEnvelope<T>>(response, url);

  if (!response.ok || !envelope.success) {
    const message =
      envelope.success === false
        ? envelope.error?.message ?? envelope.error?.code ?? "API 실패"
        : `HTTP ${response.status}`;

    throw new Error(`POST ${path} 실패: ${message}`);
  }

  return envelope.data;
}

async function apiGet<T>(path: string): Promise<T> {
  const url = getApiUrl(path);

  const response = await fetch(url, {
    method: "GET",
  });

  const envelope = await parseJsonResponse<ApiEnvelope<T>>(response, url);

  if (!response.ok || !envelope.success) {
    const message =
      envelope.success === false
        ? envelope.error?.message ?? envelope.error?.code ?? "API 실패"
        : `HTTP ${response.status}`;

    throw new Error(`GET ${path} 실패: ${message}`);
  }

  return envelope.data;
}

async function collectReviewerReviews() {
  logStep("1. Reviewer 리뷰 수집");

  const result = await apiPost<ReviewCollectResponse>(
    "/api/reviewer/reviews/collect",
    {
      platform: REVIEW_PLATFORM,
      storeName: STORE_NAME,
      accountIdentifier: ACCOUNT_IDENTIFIER,
      sourceType: "smoke_test",
      rawText: REVIEW_TEXT,
    }
  );

  logResult("리뷰 수집 결과", {
    platform: result.platform,
    platformLabel: result.platformLabel,
    storeName: result.storeName,
    accountIdentifier: result.accountIdentifier,
    totalReviews: result.totalReviews,
    savedReviews: result.savedReviews,
    negativeReviewCount: result.negativeReviewCount,
    reviewHealthScore: result.reviewHealthScore,
    topIssues: result.topIssues,
  });

  if (result.accountIdentifier !== ACCOUNT_IDENTIFIER) {
    throw new Error(
      `리뷰 수집 결과의 accountIdentifier가 예상과 다릅니다. expected=${ACCOUNT_IDENTIFIER}, actual=${result.accountIdentifier}`
    );
  }

  return result;
}

async function aggregateReviewerReviews() {
  logStep("2. Reviewer → Growth Signal 리뷰 지표 생성");

  const result = await apiPost<ReviewAggregateResponse>(
    "/api/reviewer/reviews/aggregate",
    {
      platform: REVIEW_PLATFORM,
      storeName: STORE_NAME,
      accountIdentifier: ACCOUNT_IDENTIFIER,
    }
  );

  logResult("리뷰 지표 생성 결과", result);

  if (result.weeklyStatsSaved <= 0) {
    throw new Error("review_weekly_stats가 생성되지 않았습니다.");
  }

  if (result.issueSnapshotsSaved <= 0) {
    throw new Error("review_issue_snapshots가 생성되지 않았습니다.");
  }

  return result;
}

async function completeCareProgram() {
  logStep("3. 2차 케어 등록 + Growth Care Report 생성");

  const sessionId = `smoke_care_${RUN_ID}`;

  const result = await apiPost<CareCompleteResponse>(
    "/api/public/care-program/complete",
    {
      businessNumber: BUSINESS_NUMBER,
      sessionId,
      plan: "growth-care-basic",
      storeName: STORE_NAME,
      ownerName: "스모크테스트",
      contact: "010-0000-0000",
      reviewPlatform: REVIEW_PLATFORM,
      reviewAccountIdentifier: ACCOUNT_IDENTIFIER,
      source: "smoke_growth_care_flow",
    }
  );

  logResult("2차 케어 등록 결과", {
    leadId: result.leadId,
    sessionId: result.sessionId,
    customerId: result.customerId,
    scoreId: result.scoreId,
    growthReportUrl: result.growthReportUrl,
    reviewPlatform: result.reviewPlatform,
    reviewAccountIdentifier: result.reviewAccountIdentifier,
    nextUrl: result.nextUrl,
  });

  if (!result.customerId) {
    throw new Error("customerId가 생성되지 않았습니다.");
  }

  if (!result.growthReportUrl) {
    throw new Error("growthReportUrl이 생성되지 않았습니다.");
  }

  if (result.reviewAccountIdentifier !== ACCOUNT_IDENTIFIER) {
    throw new Error(
      `care_program_leads.review_account_identifier 연결 실패. expected=${ACCOUNT_IDENTIFIER}, actual=${result.reviewAccountIdentifier}`
    );
  }

  return result;
}

async function checkGrowthReport(customerId: string) {
  logStep("4. Growth Report API 확인");

  const result = await apiGet<GrowthSignalLatestResponse>(
    `/api/v1/customers/${customerId}/growth-signal/latest`
  );

  logResult("Growth Report latest", {
    customerId: result.customer_id,
    scoreId: result.score_id,
    growthSignalScore: result.growth_signal_score,
    closureRisk: result.closure_risk,
  });

  if (!result.score_id) {
    throw new Error("Growth Report score_id가 없습니다.");
  }

  return result;
}

async function checkCustomerReviewSignals(customerId: string) {
  logStep("5. 고객별 리뷰 신호 정확 매칭 확인");

  const result = await apiGet<CustomerReviewSignalsResponse>(
    `/api/v1/customers/${customerId}/review-signals`
  );

  logResult("고객별 리뷰 신호", {
    customerId: result.customerId,
    matchMode: result.matchMode,
    sourceNotice: result.sourceNotice,
    careLead: result.careLead,
    latestWeek: result.latestWeek,
    platforms: result.platforms,
    topIssues: result.topIssues,
    raw: result.raw,
  });

  if (result.matchMode !== "review_account") {
    throw new Error(
      [
        "고객별 리뷰 신호가 review_account 기준으로 매칭되지 않았습니다.",
        `actual matchMode=${result.matchMode}`,
        "",
        "확인할 것:",
        "1. care_program_leads.review_account_identifier 값",
        "2. review_weekly_stats.account_identifier 값",
        "3. 둘 다 같은 값인지",
        "",
        `expected accountIdentifier=${ACCOUNT_IDENTIFIER}`,
      ].join("\n")
    );
  }

  if (result.careLead?.reviewAccountIdentifier !== ACCOUNT_IDENTIFIER) {
    throw new Error(
      `careLead.reviewAccountIdentifier 불일치. expected=${ACCOUNT_IDENTIFIER}, actual=${result.careLead?.reviewAccountIdentifier}`
    );
  }

  if (!result.latestWeek || result.latestWeek.reviewCount <= 0) {
    throw new Error("latestWeek 리뷰 지표가 없습니다.");
  }

  return result;
}

async function checkGrowthReportPage(url: string) {
  logStep("6. Growth Care Report 페이지 접근 확인");

  const fullUrl = getApiUrl(url);
  const response = await fetch(fullUrl, {
    method: "GET",
  });

  console.log("페이지 URL:", fullUrl);
  console.log("HTTP status:", response.status);

  if (!response.ok) {
    throw new Error(`Growth Report 페이지 접근 실패: ${response.status}`);
  }
}

async function main() {
  console.log("");
  console.log("Growth Care smoke test 시작");
  console.log("APP_URL:", APP_URL);
  console.log("STORE_NAME:", STORE_NAME);
  console.log("BUSINESS_NUMBER:", BUSINESS_NUMBER);
  console.log("REVIEW_PLATFORM:", REVIEW_PLATFORM);
  console.log("ACCOUNT_IDENTIFIER:", ACCOUNT_IDENTIFIER);

  await assertServerIsRunning();

  await collectReviewerReviews();
  await aggregateReviewerReviews();

  const careResult = await completeCareProgram();

  await checkGrowthReport(careResult.customerId);
  await checkCustomerReviewSignals(careResult.customerId);
  await checkGrowthReportPage(careResult.growthReportUrl);

  logStep("성공");

  console.log("스모크 테스트가 정상 통과했습니다.");
  console.log("");
  console.log("확인 URL:");
  console.log(`${APP_URL}${careResult.growthReportUrl}`);
  console.log("");
  console.log("기대 결과:");
  console.log("- care_program_leads.review_account_identifier 저장됨");
  console.log("- review_weekly_stats.account_identifier 저장됨");
  console.log("- 고객별 review-signals matchMode = review_account");
  console.log("- Growth Care Report 접근 가능");
}

main().catch((error) => {
  console.error("");
  console.error("스모크 테스트 실패");
  console.error("=".repeat(80));
  console.error(error instanceof Error ? error.message : error);
  console.error("=".repeat(80));
  process.exit(1);
});
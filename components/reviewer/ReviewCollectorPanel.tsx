"use client";

import { useMemo, useState } from "react";
import type { ChangeEvent } from "react";

type ReviewPlatform =
  | "baemin"
  | "yogiyo"
  | "coupang_eats"
  | "naver"
  | "kakao"
  | "google";

type CollectionResult = {
  platform: ReviewPlatform;
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
    severity: "low" | "medium" | "high";
    guide: string;
  }>;
  replyDrafts: Array<{
    review: string;
    issueCategories: string[];
    replyDraft: string;
  }>;
  growthSignalMemo: string;
};

type AggregateResult = {
  rawReviewCount: number;
  weeklyGroupCount: number;
  weeklyStatsSaved: number;
  issueSnapshotsSaved: number;
  totalReviewCount: number;
  totalNegativeCount: number;
  negativeReviewRate: number;
};

type CollectPlatformOutcome = {
  result: CollectionResult;
  aggregateResult: AggregateResult | null;
  aggregateErrorMessage: string | null;
};

const PLATFORMS: Array<{
  key: ReviewPlatform;
  label: string;
  shortLabel: string;
  description: string;
}> = [
  {
    key: "baemin",
    label: "배달의민족 사장님앱",
    shortLabel: "배민",
    description: "배민 리뷰, 별점, 배달/포장 고객 반응",
  },
  {
    key: "yogiyo",
    label: "요기요 사장님",
    shortLabel: "요기요",
    description: "요기요 리뷰와 주문 고객 반응",
  },
  {
    key: "coupang_eats",
    label: "쿠팡이츠 스토어",
    shortLabel: "쿠팡이츠",
    description: "쿠팡이츠 리뷰와 배달 고객 반응",
  },
  {
    key: "naver",
    label: "네이버 플레이스",
    shortLabel: "네이버",
    description: "플레이스 방문자 리뷰와 영수증 리뷰",
  },
  {
    key: "kakao",
    label: "카카오맵",
    shortLabel: "카카오",
    description: "카카오맵 장소 리뷰와 평점",
  },
  {
    key: "google",
    label: "구글 비즈니스",
    shortLabel: "구글",
    description: "Google Business Profile 리뷰",
  },
];

const SAMPLE_BY_PLATFORM: Record<ReviewPlatform, string> = {
  baemin: `배달이 늦었고 음식이 식어서 왔습니다.
음식은 맛있었지만 대기 시간이 너무 길었어요.
양이 줄어든 것 같고 가격이 조금 비싸요.
사장님이 친절하고 맛있어서 다음에도 주문할게요.`,
  yogiyo: `배달은 빨랐는데 포장이 조금 아쉬웠어요.
가격 대비 양이 적은 느낌입니다.
맛은 좋아요. 재주문 의사 있습니다.`,
  coupang_eats: `음식이 식어서 도착했습니다.
배달이 늦었지만 맛은 괜찮았어요.
포장이 깔끔하고 친절했습니다.`,
  naver: `매장은 깔끔했지만 대기 시간이 길었습니다.
직원분이 친절해서 좋았어요.
가격이 조금 비싼 편입니다.`,
  kakao: `위치가 좋고 매장이 깔끔합니다.
응대가 조금 불친절하게 느껴졌습니다.
재방문 의사는 있습니다.`,
  google: `Great food but waiting time was long.
Staff was kind and the place was clean.
Price felt a little expensive.`,
};

function createEmptyTextMap(): Record<ReviewPlatform, string> {
  return {
    baemin: "",
    yogiyo: "",
    coupang_eats: "",
    naver: "",
    kakao: "",
    google: "",
  };
}

function createEmptyAccountMap(): Record<ReviewPlatform, string> {
  return {
    baemin: "",
    yogiyo: "",
    coupang_eats: "",
    naver: "",
    kakao: "",
    google: "",
  };
}

function getPlatformLabel(platform: ReviewPlatform): string {
  return PLATFORMS.find((item) => item.key === platform)?.label ?? platform;
}

function getPlatformShortLabel(platform: ReviewPlatform): string {
  return (
    PLATFORMS.find((item) => item.key === platform)?.shortLabel ?? platform
  );
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return "리뷰 수집 중 오류가 발생했습니다.";
}

function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

function getHealthLabel(score: number): string {
  if (score >= 80) {
    return "좋음";
  }

  if (score >= 60) {
    return "주의";
  }

  if (score >= 40) {
    return "위험";
  }

  return "긴급";
}

export function ReviewCollectorPanel() {
  const [activePlatform, setActivePlatform] =
    useState<ReviewPlatform>("baemin");

  const [storeName, setStoreName] = useState("");
  const [accountIdentifiers, setAccountIdentifiers] =
    useState<Record<ReviewPlatform, string>>(createEmptyAccountMap);

  const [platformTexts, setPlatformTexts] =
    useState<Record<ReviewPlatform, string>>(createEmptyTextMap);

  const [results, setResults] = useState<
    Partial<Record<ReviewPlatform, CollectionResult>>
  >({});

  const [isCollecting, setIsCollecting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [autoAggregateMessage, setAutoAggregateMessage] = useState<
    string | null
  >(null);

  const activePlatformInfo = useMemo(
    () => PLATFORMS.find((platform) => platform.key === activePlatform),
    [activePlatform]
  );

  const collectedResults = Object.values(results).filter(
    (result): result is CollectionResult => Boolean(result)
  );

  const totalReviews = collectedResults.reduce(
    (sum, result) => sum + result.totalReviews,
    0
  );

  const totalNegativeReviews = collectedResults.reduce(
    (sum, result) => sum + result.negativeReviewCount,
    0
  );

  const averageHealthScore =
    collectedResults.length > 0
      ? Math.round(
          collectedResults.reduce(
            (sum, result) => sum + result.reviewHealthScore,
            0
          ) / collectedResults.length
        )
      : 0;

  function updatePlatformText(platform: ReviewPlatform, value: string) {
    setPlatformTexts((prev) => ({
      ...prev,
      [platform]: value,
    }));
  }

  function updateAccountIdentifier(platform: ReviewPlatform, value: string) {
    setAccountIdentifiers((prev) => ({
      ...prev,
      [platform]: value,
    }));
  }

  function fillSample(platform: ReviewPlatform) {
    setErrorMessage(null);
    setAutoAggregateMessage(null);
    updatePlatformText(platform, SAMPLE_BY_PLATFORM[platform]);
  }

  async function handleFileUpload(
    platform: ReviewPlatform,
    event: ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    const text = await file.text();

    setErrorMessage(null);
    setAutoAggregateMessage(null);
    updatePlatformText(platform, text);

    event.target.value = "";
  }

  async function aggregatePlatformForGrowthSignal(
    platform: ReviewPlatform
  ): Promise<AggregateResult> {
    const response = await fetch("/api/reviewer/reviews/aggregate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        platform,
        storeName,
        accountIdentifier: accountIdentifiers[platform],
      }),
    });

    const payload = await response.json();

    if (!response.ok || !payload?.success) {
      throw new Error(
        payload?.error?.message ?? "Growth Signal 지표 생성에 실패했습니다."
      );
    }

    return payload.data as AggregateResult;
  }

  async function collectPlatform(
    platform: ReviewPlatform
  ): Promise<CollectPlatformOutcome> {
    const rawText = platformTexts[platform].trim();
    const platformLabel = getPlatformLabel(platform);

    if (!rawText) {
      throw new Error(
        `${platformLabel} 리뷰 원문, CSV, JSON 또는 JSONL을 입력해주세요.`
      );
    }

    const response = await fetch("/api/reviewer/reviews/collect", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        platform,
        storeName,
        accountIdentifier: accountIdentifiers[platform],
        sourceType: "manual_upload",
        rawText,
      }),
    });

    const payload = await response.json();

    if (!response.ok || !payload?.success) {
      throw new Error(payload?.error?.message ?? "리뷰 수집에 실패했습니다.");
    }

    const result = payload.data as CollectionResult;

    setResults((prev) => ({
      ...prev,
      [platform]: result,
    }));

    try {
      const aggregateResult = await aggregatePlatformForGrowthSignal(platform);

      return {
        result,
        aggregateResult,
        aggregateErrorMessage: null,
      };
    } catch (aggregateError) {
      return {
        result,
        aggregateResult: null,
        aggregateErrorMessage: getErrorMessage(aggregateError),
      };
    }
  }

  async function handleCollectActivePlatform() {
    setIsCollecting(true);
    setErrorMessage(null);
    setAutoAggregateMessage(null);

    try {
      const outcome = await collectPlatform(activePlatform);
      const platformLabel = getPlatformLabel(activePlatform);

      if (outcome.aggregateResult) {
        setAutoAggregateMessage(
          `${platformLabel} 리뷰 수집 완료. Growth Signal 지표 생성 완료: 주간 지표 ${outcome.aggregateResult.weeklyStatsSaved}개, 이슈 스냅샷 ${outcome.aggregateResult.issueSnapshotsSaved}개`
        );
      } else {
        setAutoAggregateMessage(
          `${platformLabel} 리뷰 수집은 완료되었습니다.`
        );
        setErrorMessage(
          `다만 Growth Signal 지표 생성은 실패했습니다: ${outcome.aggregateErrorMessage}`
        );
      }
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsCollecting(false);
    }
  }

  async function handleCollectAllPlatforms() {
    const targetPlatforms = PLATFORMS.filter((platform) =>
      platformTexts[platform.key].trim()
    ).map((platform) => platform.key);

    if (targetPlatforms.length === 0) {
      setErrorMessage("수집할 리뷰가 있는 플랫폼이 없습니다.");
      setAutoAggregateMessage(null);
      return;
    }

    setIsCollecting(true);
    setErrorMessage(null);
    setAutoAggregateMessage(null);

    const collectedLabels: string[] = [];
    const failedLabels: string[] = [];
    const aggregateFailedLabels: string[] = [];

    let totalWeeklyStatsSaved = 0;
    let totalIssueSnapshotsSaved = 0;

    try {
      for (const platform of targetPlatforms) {
        try {
          const outcome = await collectPlatform(platform);
          const shortLabel = getPlatformShortLabel(platform);

          collectedLabels.push(shortLabel);

          if (outcome.aggregateResult) {
            totalWeeklyStatsSaved += outcome.aggregateResult.weeklyStatsSaved;
            totalIssueSnapshotsSaved +=
              outcome.aggregateResult.issueSnapshotsSaved;
          } else {
            aggregateFailedLabels.push(
              `${shortLabel}: ${outcome.aggregateErrorMessage}`
            );
          }
        } catch (platformError) {
          failedLabels.push(
            `${getPlatformShortLabel(platform)}: ${getErrorMessage(
              platformError
            )}`
          );
        }
      }

      if (collectedLabels.length > 0) {
        setAutoAggregateMessage(
          `${collectedLabels.join(
            ", "
          )} 리뷰 수집 완료. Growth Signal 지표 생성: 주간 지표 ${totalWeeklyStatsSaved}개, 이슈 스냅샷 ${totalIssueSnapshotsSaved}개`
        );
      }

      if (failedLabels.length > 0 || aggregateFailedLabels.length > 0) {
        setErrorMessage(
          [
            failedLabels.length > 0
              ? `수집 실패: ${failedLabels.join(" / ")}`
              : null,
            aggregateFailedLabels.length > 0
              ? `지표 생성 일부 실패: ${aggregateFailedLabels.join(" / ")}`
              : null,
          ]
            .filter(Boolean)
            .join("\n")
        );
      }

      if (collectedLabels.length === 0 && failedLabels.length > 0) {
        setAutoAggregateMessage(null);
      }
    } finally {
      setIsCollecting(false);
    }
  }

  return (
    <section className="review-collector">
      <div className="review-collector-head">
        <div>
          <div className="eyebrow">Review Collection Hub</div>
          <h2>전체 리뷰 수집</h2>
          <p>
            배달의민족, 요기요, 쿠팡이츠, 네이버플레이스, 카카오맵, 구글 리뷰를
            한곳에 모읍니다. 현재는 CSV·텍스트·JSON·JSONL 업로드 방식이고,
            공식 API나 제휴 연동이 붙으면 같은 API로 자동 수집됩니다.
          </p>
        </div>

        <div className="review-collector-summary">
          <div>
            <strong>{totalReviews}</strong>
            <span>총 수집 리뷰</span>
          </div>

          <div>
            <strong>{totalNegativeReviews}</strong>
            <span>부정 리뷰</span>
          </div>

          <div>
            <strong>{averageHealthScore || "-"}</strong>
            <span>평균 Health</span>
          </div>
        </div>
      </div>

      <div className="review-collector-warning">
        사장님앱 비밀번호는 이 화면에서 저장하지 않습니다. 배달앱 리뷰는 공식
        API, 제휴 연동, 관리자 보안 연결, CSV 업로드 방식으로 수집하는 구조가
        안전합니다.
      </div>

      <div className="review-collector-main">
        <aside className="review-platform-sidebar">
          {PLATFORMS.map((platform) => {
            const result = results[platform.key];
            const isActive = activePlatform === platform.key;

            return (
              <button
                key={platform.key}
                type="button"
                className={
                  isActive
                    ? "review-platform-tab active"
                    : "review-platform-tab"
                }
                onClick={() => setActivePlatform(platform.key)}
              >
                <strong>{platform.shortLabel}</strong>
                <span>{platform.description}</span>

                {result ? (
                  <em>
                    {result.totalReviews}건 · Health{" "}
                    {result.reviewHealthScore}
                  </em>
                ) : (
                  <em>미수집</em>
                )}
              </button>
            );
          })}
        </aside>

        <div className="review-collector-workspace">
          <div className="review-collector-form-card">
            <div className="eyebrow">Selected Platform</div>
            <h3>{activePlatformInfo?.label}</h3>

            <div className="review-collector-form-grid">
              <label>
                <span>매장명</span>
                <input
                  value={storeName}
                  placeholder="예: 성수 파스타"
                  onChange={(event) => setStoreName(event.target.value)}
                />
              </label>

              <label>
                <span>계정 식별자 또는 스토어 URL</span>
                <input
                  value={accountIdentifiers[activePlatform]}
                  placeholder="예: 배민 가게번호, 플레이스 URL, Google Place ID"
                  onChange={(event) =>
                    updateAccountIdentifier(
                      activePlatform,
                      event.target.value
                    )
                  }
                />
              </label>
            </div>

            <label className="review-collector-textarea-label">
              <span>리뷰 원문 / CSV / JSON / JSONL</span>
              <textarea
                value={platformTexts[activePlatform]}
                placeholder="리뷰를 줄 단위로 붙여넣거나 CSV/JSON/JSONL 내용을 넣어주세요."
                onChange={(event) =>
                  updatePlatformText(activePlatform, event.target.value)
                }
              />
            </label>

            <div className="review-collector-actions">
              <button
                className="btn"
                type="button"
                onClick={() => fillSample(activePlatform)}
                disabled={isCollecting}
              >
                샘플 리뷰 넣기
              </button>

              <label className="btn review-file-button">
                파일 불러오기
                <input
                  type="file"
                  accept=".txt,.csv,.json,.jsonl"
                  onChange={(event) =>
                    void handleFileUpload(activePlatform, event)
                  }
                />
              </label>

              <button
                className="btn primary"
                type="button"
                onClick={() => void handleCollectActivePlatform()}
                disabled={isCollecting}
              >
                {isCollecting
                  ? "수집/분석/지표 생성 중..."
                  : `${activePlatformInfo?.shortLabel} 리뷰 수집`}
              </button>

              <button
                className="btn primary"
                type="button"
                onClick={() => void handleCollectAllPlatforms()}
                disabled={isCollecting}
              >
                전체 플랫폼 수집
              </button>
            </div>

            {autoAggregateMessage ? (
              <div className="review-inbox-success">
                {autoAggregateMessage}
              </div>
            ) : null}

            {errorMessage ? (
              <div className="review-collector-error">
                {errorMessage.split("\n").map((line) => (
                  <p key={line}>{line}</p>
                ))}
              </div>
            ) : null}
          </div>

          <div className="review-results-grid">
            {collectedResults.length === 0 ? (
              <div className="review-result-empty">
                <div className="eyebrow">No Reviews Yet</div>
                <h3>아직 수집된 리뷰가 없습니다</h3>
                <p>
                  플랫폼을 선택하고 리뷰 원문이나 파일을 넣은 뒤 수집 버튼을
                  누르면 결과가 여기에 표시됩니다.
                </p>
              </div>
            ) : (
              collectedResults.map((result) => (
                <article className="review-result-card" key={result.platform}>
                  <div className="review-result-card-head">
                    <div>
                      <div className="eyebrow">{result.platformLabel}</div>
                      <h3>{result.totalReviews}건 수집 완료</h3>
                    </div>

                    <div className="review-health-pill">
                      <strong>{result.reviewHealthScore}</strong>
                      <span>{getHealthLabel(result.reviewHealthScore)}</span>
                    </div>
                  </div>

                  <div className="review-result-metrics">
                    <div>
                      <strong>{result.negativeReviewCount}</strong>
                      <span>부정 리뷰</span>
                    </div>

                    <div>
                      <strong>{formatPercent(result.negativeReviewRate)}</strong>
                      <span>부정 비율</span>
                    </div>

                    <div>
                      <strong>{result.savedReviews}</strong>
                      <span>저장 리뷰</span>
                    </div>
                  </div>

                  <div className="review-issue-block">
                    <strong>반복 이슈</strong>

                    {result.topIssues.length ? (
                      <div className="review-issue-list">
                        {result.topIssues.slice(0, 5).map((issue) => (
                          <span key={`${result.platform}-${issue.keyword}`}>
                            {issue.category} · {issue.count}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p>강한 부정 키워드는 아직 없습니다.</p>
                    )}
                  </div>

                  <div className="review-reply-block">
                    <strong>답글 추천</strong>

                    {result.replyDrafts.length ? (
                      result.replyDrafts.slice(0, 2).map((draft, index) => (
                        <div
                          className="review-reply-draft"
                          key={`${result.platform}-${index}`}
                        >
                          <small>리뷰</small>
                          <p>{draft.review}</p>

                          <small>추천 답글</small>
                          <p>{draft.replyDraft}</p>
                        </div>
                      ))
                    ) : (
                      <p>답글 추천이 필요한 부정 리뷰가 없습니다.</p>
                    )}
                  </div>

                  <div className="review-growth-memo">
                    <strong>Growth Signal 보조 신호</strong>
                    <p>{result.growthSignalMemo}</p>
                  </div>
                </article>
              ))
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
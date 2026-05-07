"use client";

import { useMemo, useState } from "react";

type ReviewPlatform =
  | "baemin"
  | "yogiyo"
  | "coupang_eats"
  | "naver"
  | "kakao"
  | "google";

type ConnectionRequestResult = {
  requestId: string;
  platform: ReviewPlatform;
  platformLabel: string;
  status: string;
  message: string;
};

type ReviewAnalysisIssue = {
  keyword: string;
  category: string;
  count: number;
  severity: "low" | "medium" | "high";
  guide: string;
};

type ReplyDraft = {
  review: string;
  issueCategory: string;
  tone: string;
  draft: string;
};

type ReviewAnalysisResult = {
  platform: ReviewPlatform;
  platformLabel: string;
  totalReviews: number;
  negativeReviewCount: number;
  positiveReviewCount: number;
  negativeReviewRate: number;
  positiveReviewRate: number;
  reviewHealthScore: number;
  summary: string;
  topIssues: ReviewAnalysisIssue[];
  replyDrafts: ReplyDraft[];
  growthSignalMemo: string;
};

const PLATFORM_OPTIONS: Array<{
  key: ReviewPlatform;
  label: string;
  description: string;
}> = [
  {
    key: "baemin",
    label: "배달의민족 사장님앱",
    description: "배민 리뷰, 별점, 배달/포장 고객 반응",
  },
  {
    key: "yogiyo",
    label: "요기요 사장님",
    description: "요기요 리뷰와 주문 고객 반응",
  },
  {
    key: "coupang_eats",
    label: "쿠팡이츠 스토어",
    description: "쿠팡이츠 리뷰와 배달 고객 반응",
  },
  {
    key: "naver",
    label: "네이버 플레이스",
    description: "플레이스 리뷰, 방문자 리뷰, 영수증 리뷰",
  },
  {
    key: "kakao",
    label: "카카오맵",
    description: "카카오맵 장소 리뷰와 평점",
  },
  {
    key: "google",
    label: "구글 비즈니스",
    description: "Google Business Profile 리뷰",
  },
];

const SAMPLE_REVIEWS = `음식은 괜찮았는데 대기 시간이 너무 길었어요.
직원분이 조금 불친절하게 느껴졌습니다.
가격이 오른 것 같은데 양은 줄어든 느낌이에요.
배달이 늦었고 음식이 식어서 왔습니다.
맛은 좋아요. 다음에도 주문할 것 같아요.
매장이 깔끔하고 친절해서 만족했습니다.`;

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return "요청 처리 중 오류가 발생했습니다.";
}

function getPlatformLabel(platform: ReviewPlatform): string {
  return (
    PLATFORM_OPTIONS.find((item) => item.key === platform)?.label ?? platform
  );
}

function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

function getHealthTone(score: number): string {
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

export function BossAppConnector() {
  const [platform, setPlatform] = useState<ReviewPlatform>("baemin");
  const [storeName, setStoreName] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [contact, setContact] = useState("");
  const [accountIdentifier, setAccountIdentifier] = useState("");

  const [reviewsText, setReviewsText] = useState(SAMPLE_REVIEWS);

  const [connectionResult, setConnectionResult] =
    useState<ConnectionRequestResult | null>(null);
  const [analysisResult, setAnalysisResult] =
    useState<ReviewAnalysisResult | null>(null);

  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  const [isRequestingConnection, setIsRequestingConnection] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const selectedPlatform = useMemo(
    () => PLATFORM_OPTIONS.find((item) => item.key === platform),
    [platform]
  );

  async function handleConnectionRequest() {
    setIsRequestingConnection(true);
    setConnectionError(null);
    setConnectionResult(null);

    try {
      const response = await fetch("/api/reviewer/connections/request", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          platform,
          storeName,
          ownerName,
          contact,
          accountIdentifier,
        }),
      });

      const payload = await response.json();

      if (!response.ok || !payload?.success) {
        throw new Error(
          payload?.error?.message ?? "연동 요청 등록에 실패했습니다."
        );
      }

      setConnectionResult(payload.data as ConnectionRequestResult);
    } catch (error) {
      setConnectionError(getErrorMessage(error));
    } finally {
      setIsRequestingConnection(false);
    }
  }

  async function handleAnalyzeReviews() {
    setIsAnalyzing(true);
    setAnalysisError(null);
    setAnalysisResult(null);

    try {
      const response = await fetch("/api/reviewer/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          platform,
          reviewsText,
        }),
      });

      const payload = await response.json();

      if (!response.ok || !payload?.success) {
        throw new Error(
          payload?.error?.message ?? "리뷰 분석에 실패했습니다."
        );
      }

      setAnalysisResult(payload.data as ReviewAnalysisResult);
    } catch (error) {
      setAnalysisError(getErrorMessage(error));
    } finally {
      setIsAnalyzing(false);
    }
  }

  return (
    <section className="boss-app-section">
      <div className="boss-app-header">
        <div>
          <div className="eyebrow">Boss App Connector</div>
          <h2>사장님앱 연동과 리뷰 분석</h2>
          <p>
            배달앱 사장님앱 계정은 보안상 비밀번호를 직접 저장하지 않습니다.
            우선 연동 요청을 등록하고, 공식 API·제휴·관리자 보안 연결·CSV
            업로드 방식으로 리뷰 데이터를 가져오는 구조로 운영합니다.
          </p>
        </div>
      </div>

      <div className="boss-app-grid">
        <article className="boss-app-card">
          <div className="eyebrow">Connection Request</div>
          <h3>사장님앱 연동 요청</h3>

          <div className="boss-app-platforms">
            {PLATFORM_OPTIONS.map((item) => (
              <button
                key={item.key}
                type="button"
                className={
                  platform === item.key
                    ? "boss-app-platform selected"
                    : "boss-app-platform"
                }
                onClick={() => setPlatform(item.key)}
              >
                <strong>{item.label}</strong>
                <span>{item.description}</span>
              </button>
            ))}
          </div>

          <div className="boss-app-form">
            <label>
              <span>매장명</span>
              <input
                value={storeName}
                placeholder="예: 성수 파스타"
                onChange={(event) => setStoreName(event.target.value)}
              />
            </label>

            <label>
              <span>담당자명</span>
              <input
                value={ownerName}
                placeholder="예: 홍길동"
                onChange={(event) => setOwnerName(event.target.value)}
              />
            </label>

            <label>
              <span>연락처</span>
              <input
                value={contact}
                placeholder="예: 010-0000-0000"
                onChange={(event) => setContact(event.target.value)}
              />
            </label>

            <label>
              <span>계정 식별자 또는 스토어 URL</span>
              <input
                value={accountIdentifier}
                placeholder="예: 배민 가게번호, 스토어 URL, 플레이스 URL"
                onChange={(event) =>
                  setAccountIdentifier(event.target.value)
                }
              />
            </label>
          </div>

          <div className="boss-app-security-note">
            <strong>보안 기준</strong>
            <p>
              이 화면은 사장님앱 비밀번호를 받지 않습니다. 비밀번호가 필요한
              연동은 공식 API, 제휴 인증, 관리자 보안 채널, 또는 CSV 업로드
              방식으로 처리합니다.
            </p>
          </div>

          <button
            className="btn primary"
            type="button"
            onClick={() => void handleConnectionRequest()}
            disabled={isRequestingConnection}
          >
            {isRequestingConnection
              ? "연동 요청 등록 중..."
              : `${getPlatformLabel(platform)} 연동 요청`}
          </button>

          {connectionError ? (
            <div className="boss-app-error">{connectionError}</div>
          ) : null}

          {connectionResult ? (
            <div className="boss-app-success">
              <strong>연동 요청 등록 완료</strong>
              <p>{connectionResult.message}</p>
              <small>요청 ID: {connectionResult.requestId}</small>
            </div>
          ) : null}
        </article>

        <article className="boss-app-card">
          <div className="eyebrow">Review Analyzer</div>
          <h3>리뷰 원문 분석과 답글 추천</h3>

          <p>
            지금은 연동 전에도 리뷰 원문이나 CSV 내용을 붙여넣으면 분석할 수
            있습니다. 나중에 사장님앱 연동이 완료되면 이 입력값을 자동 수집
            데이터로 대체합니다.
          </p>

          <textarea
            className="boss-app-review-textarea"
            value={reviewsText}
            onChange={(event) => setReviewsText(event.target.value)}
          />

          <button
            className="btn primary"
            type="button"
            onClick={() => void handleAnalyzeReviews()}
            disabled={isAnalyzing}
          >
            {isAnalyzing ? "리뷰 분석 중..." : "리뷰 분석하고 답글 추천"}
          </button>

          {analysisError ? (
            <div className="boss-app-error">{analysisError}</div>
          ) : null}
        </article>
      </div>

      {analysisResult ? (
        <section className="boss-app-analysis">
          <div className="boss-app-analysis-head">
            <div>
              <div className="eyebrow">Analysis Result</div>
              <h2>{analysisResult.platformLabel} 리뷰 분석 결과</h2>
              <p>{analysisResult.summary}</p>
            </div>

            <div className="boss-app-health-score">
              <strong>{analysisResult.reviewHealthScore}</strong>
              <span>Review Health · {getHealthTone(analysisResult.reviewHealthScore)}</span>
            </div>
          </div>

          <div className="boss-app-metrics">
            <div className="metric">
              <strong>{analysisResult.totalReviews}</strong>
              <span>분석 리뷰 수</span>
            </div>

            <div className="metric">
              <strong>{formatPercent(analysisResult.negativeReviewRate)}</strong>
              <span>부정 리뷰 비율</span>
            </div>

            <div className="metric">
              <strong>{formatPercent(analysisResult.positiveReviewRate)}</strong>
              <span>긍정 리뷰 비율</span>
            </div>
          </div>

          <div className="boss-app-analysis-grid">
            <article>
              <h3>반복 이슈</h3>

              <div className="boss-app-issue-list">
                {analysisResult.topIssues.length ? (
                  analysisResult.topIssues.map((issue) => (
                    <div key={issue.keyword} className="boss-app-issue">
                      <div>
                        <strong>{issue.keyword}</strong>
                        <span>{issue.category}</span>
                      </div>

                      <em>{issue.count}회</em>
                      <p>{issue.guide}</p>
                    </div>
                  ))
                ) : (
                  <p>강한 부정 키워드는 아직 감지되지 않았습니다.</p>
                )}
              </div>
            </article>

            <article>
              <h3>답글 추천</h3>

              <div className="boss-app-draft-list">
                {analysisResult.replyDrafts.map((draft, index) => (
                  <div key={`${draft.review}-${index}`} className="boss-app-draft">
                    <strong>리뷰</strong>
                    <p>{draft.review}</p>

                    <strong>추천 답글</strong>
                    <p>{draft.draft}</p>

                    <small>
                      유형: {draft.issueCategory} · 톤: {draft.tone}
                    </small>
                  </div>
                ))}
              </div>
            </article>
          </div>

          <div className="boss-app-growth-signal-note">
            <strong>Growth Signal 보조 신호</strong>
            <p>{analysisResult.growthSignalMemo}</p>
          </div>
        </section>
      ) : null}
    </section>
  );
}
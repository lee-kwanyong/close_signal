"use client";

import { useEffect, useMemo, useState } from "react";

type ReviewDashboardSummary = {
  totalReviews: number;
  negativeReviewCount: number;
  positiveReviewCount: number;
  neutralReviewCount: number;
  repliedCount: number;
  replyWaitingCount: number;
  negativeReviewRate: number;
  positiveReviewRate: number;
};

type PlatformSummary = {
  platform: string;
  platformLabel: string;
  totalReviews: number;
  negativeReviewCount: number;
  positiveReviewCount: number;
  neutralReviewCount: number;
  repliedCount: number;
  negativeReviewRate: number;
  replyRate: number;
};

type ReviewDashboardItem = {
  id: string;
  platform: string;
  platformLabel: string;
  storeName: string | null;
  authorName: string | null;
  rating: number;
  reviewText: string;
  reviewDate: string | null;
  collectedAt: string;
  sentiment: "positive" | "neutral" | "negative";
  issueCategories: string[];
  replyStatus: string;
  replyDraft: string | null;
};

type CollectionRun = {
  id: string;
  platform: string;
  platformLabel: string;
  storeName: string | null;
  accountIdentifier: string | null;
  sourceType: string;
  totalReviews: number;
  savedReviews: number;
  negativeReviewCount: number;
  positiveReviewCount: number;
  neutralReviewCount: number;
  negativeReviewRate: number;
  positiveReviewRate: number;
  reviewHealthScore: number;
  createdAt: string;
};

type ReviewDashboardData = {
  summary: ReviewDashboardSummary;
  platforms: PlatformSummary[];
  topIssues: Array<{
    category: string;
    count: number;
  }>;
  replyQueue: ReviewDashboardItem[];
  latestReviews: ReviewDashboardItem[];
  runs: CollectionRun[];
};

const BASE_PLATFORM_FILTERS = [
  {
    platform: "all",
    platformLabel: "전체",
  },
  {
    platform: "baemin",
    platformLabel: "배달의민족",
  },
  {
    platform: "yogiyo",
    platformLabel: "요기요",
  },
  {
    platform: "coupang_eats",
    platformLabel: "쿠팡이츠",
  },
  {
    platform: "naver",
    platformLabel: "네이버 플레이스",
  },
  {
    platform: "kakao",
    platformLabel: "카카오맵",
  },
  {
    platform: "google",
    platformLabel: "구글",
  },
];

function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

function formatDate(value: string | null): string {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("ko-KR");
}

function replyStatusLabel(value: string): string {
  const labels: Record<string, string> = {
    drafted: "초안",
    copied: "복사됨",
    replied: "답글 완료",
  };

  return labels[value] ?? value;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return "리뷰 대시보드 처리 중 오류가 발생했습니다.";
}

export function ReviewInboxPanel() {
const [dashboard, setDashboard] = useState<ReviewDashboardData | null>(null);

const [platformFilter, setPlatformFilter] = useState("all");
const [storeNameFilter, setStoreNameFilter] = useState("");

const [isLoading, setIsLoading] = useState(false);
const [isAggregating, setIsAggregating] = useState(false);
const [workingReviewId, setWorkingReviewId] = useState<string | null>(null);

const [errorMessage, setErrorMessage] = useState<string | null>(null);
const [aggregateMessage, setAggregateMessage] = useState<string | null>(null);

  const platformsForFilter = useMemo(() => {
    const dashboardPlatforms = dashboard?.platforms ?? [];

    const merged = new Map<
      string,
      {
        platform: string;
        platformLabel: string;
      }
    >();

    for (const platform of BASE_PLATFORM_FILTERS) {
      merged.set(platform.platform, platform);
    }

    for (const platform of dashboardPlatforms) {
      merged.set(platform.platform, {
        platform: platform.platform,
        platformLabel: platform.platformLabel,
      });
    }

    return Array.from(merged.values());
  }, [dashboard]);

  async function loadDashboard() {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const params = new URLSearchParams();

      if (platformFilter !== "all") {
        params.set("platform", platformFilter);
      }

      if (storeNameFilter.trim()) {
        params.set("storeName", storeNameFilter.trim());
      }

      const response = await fetch(
        `/api/reviewer/reviews/dashboard?${params.toString()}`
      );

      const payload = await response.json();

      if (!response.ok || !payload?.success) {
        throw new Error(
          payload?.error?.message ?? "리뷰 대시보드를 불러오지 못했습니다."
        );
      }

      setDashboard(payload.data as ReviewDashboardData);
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  }

async function aggregateForGrowthSignal() {
  setIsAggregating(true);
  setErrorMessage(null);
  setAggregateMessage(null);

  try {
    const response = await fetch("/api/reviewer/reviews/aggregate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        platform: platformFilter,
        storeName: storeNameFilter,
      }),
    });

    const payload = await response.json();

    if (!response.ok || !payload?.success) {
      throw new Error(
        payload?.error?.message ?? "Growth Signal 지표 생성에 실패했습니다."
      );
    }

    setAggregateMessage(
      `Growth Signal 리뷰 지표 생성 완료: 주간 지표 ${payload.data.weeklyStatsSaved}개, 이슈 스냅샷 ${payload.data.issueSnapshotsSaved}개`
    );

    await loadDashboard();
  } catch (error) {
    setErrorMessage(getErrorMessage(error));
  } finally {
    setIsAggregating(false);
  }
}

  async function updateReplyStatus(params: {
    reviewId: string;
    action: "copy" | "update_draft" | "replied" | "reset";
    replyText?: string | null;
  }) {
    setWorkingReviewId(params.reviewId);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/reviewer/reviews/reply", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(params),
      });

      const payload = await response.json();

      if (!response.ok || !payload?.success) {
        throw new Error(
          payload?.error?.message ?? "답글 상태 업데이트에 실패했습니다."
        );
      }

      await loadDashboard();
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setWorkingReviewId(null);
    }
  }

  async function copyReply(review: ReviewDashboardItem) {
    const replyText =
      review.replyDraft ??
      "소중한 리뷰 감사합니다. 남겨주신 의견을 바탕으로 더 나은 서비스를 제공하겠습니다.";

    try {
      await navigator.clipboard.writeText(replyText);
    } catch {
      // 클립보드 권한이 막혀도 답글 상태 업데이트는 진행한다.
    }

    await updateReplyStatus({
      reviewId: review.id,
      action: "copy",
      replyText,
    });
  }

  useEffect(() => {
    void loadDashboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const summary = dashboard?.summary;

  return (
    <section className="review-inbox">
      <div className="review-inbox-head">
        <div>
          <div className="eyebrow">Review Operations</div>
          <h2>리뷰 운영 대시보드</h2>
          <p>
            수집된 전체 리뷰를 다시 불러와 부정 리뷰 답글 큐, 플랫폼별 상태,
            최근 수집 기록을 확인합니다.
          </p>
        </div>

        <div className="review-inbox-actions">
          <button
            className="btn"
            type="button"
            onClick={() => void loadDashboard()}
            disabled={isLoading}
          >
            {isLoading ? "불러오는 중..." : "새로고침"}
          </button>

          <button
            className="btn primary"
            type="button"
            onClick={() => void aggregateForGrowthSignal()}
            disabled={isAggregating}
          >
            {isAggregating ? "지표 생성 중..." : "Growth Signal 지표 생성"}
          </button>
        </div>
      </div>

      <div className="review-inbox-filters">
        <label>
          <span>플랫폼</span>
          <select
            value={platformFilter}
            onChange={(event) => setPlatformFilter(event.target.value)}
          >
            {platformsForFilter.map((platform) => (
              <option key={platform.platform} value={platform.platform}>
                {platform.platformLabel}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span>매장명 검색</span>
          <input
            value={storeNameFilter}
            placeholder="예: 성수 파스타"
            onChange={(event) => setStoreNameFilter(event.target.value)}
          />
        </label>

        <button
          className="btn primary"
          type="button"
          onClick={() => void loadDashboard()}
          disabled={isLoading}
        >
          필터 적용
        </button>
      </div>

      {errorMessage ? (
        <div className="review-inbox-error">{errorMessage}</div>
      ) : null}

      {aggregateMessage ? (
        <div className="review-inbox-success">{aggregateMessage}</div>
      ) : null}

      <div className="review-inbox-summary">
        <div>
          <strong>{summary?.totalReviews ?? 0}</strong>
          <span>전체 리뷰</span>
        </div>

        <div>
          <strong>{summary?.negativeReviewCount ?? 0}</strong>
          <span>부정 리뷰</span>
        </div>

        <div>
          <strong>{formatPercent(summary?.negativeReviewRate ?? 0)}</strong>
          <span>부정 비율</span>
        </div>

        <div>
          <strong>{summary?.replyWaitingCount ?? 0}</strong>
          <span>답글 대기</span>
        </div>

        <div>
          <strong>{summary?.repliedCount ?? 0}</strong>
          <span>답글 완료</span>
        </div>
      </div>

      <div className="review-inbox-grid">
        <article className="review-inbox-card">
          <h3>플랫폼별 상태</h3>

          {dashboard?.platforms.length ? (
            <div className="review-platform-status-list">
              {dashboard.platforms.map((platform) => (
                <div
                  className="review-platform-status"
                  key={platform.platform}
                >
                  <div>
                    <strong>{platform.platformLabel}</strong>
                    <span>{platform.totalReviews}건 수집</span>
                  </div>

                  <div>
                    <em>{formatPercent(platform.negativeReviewRate)}</em>
                    <span>부정 비율</span>
                  </div>

                  <div>
                    <em>{formatPercent(platform.replyRate)}</em>
                    <span>답글률</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p>아직 수집된 플랫폼 리뷰가 없습니다.</p>
          )}
        </article>

        <article className="review-inbox-card">
          <h3>반복 이슈 TOP</h3>

          {dashboard?.topIssues.length ? (
            <div className="review-top-issue-list">
              {dashboard.topIssues.map((issue) => (
                <span key={issue.category}>
                  {issue.category} · {issue.count}
                </span>
              ))}
            </div>
          ) : (
            <p>반복 이슈가 아직 없습니다.</p>
          )}
        </article>
      </div>

      <section className="review-inbox-card">
        <h3>부정 리뷰 답글 큐</h3>

        {dashboard?.replyQueue.length ? (
          <div className="review-reply-queue">
            {dashboard.replyQueue.map((review) => (
              <article className="review-reply-item" key={review.id}>
                <div className="review-reply-item-head">
                  <div>
                    <strong>{review.platformLabel}</strong>
                    <span>
                      {review.storeName ?? "매장명 없음"} ·{" "}
                      {formatDate(review.reviewDate ?? review.collectedAt)}
                    </span>
                  </div>

                  <em>{replyStatusLabel(review.replyStatus)}</em>
                </div>

                <div className="review-original">
                  <strong>고객 리뷰</strong>
                  <p>{review.reviewText}</p>

                  {review.issueCategories.length ? (
                    <div className="review-chip-list">
                      {review.issueCategories.map((category) => (
                        <span key={`${review.id}-${category}`}>
                          {category}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>

                <div className="review-draft">
                  <strong>추천 답글</strong>
                  <p>
                    {review.replyDraft ??
                      "소중한 리뷰 감사합니다. 남겨주신 의견을 바탕으로 더 나은 서비스를 제공하겠습니다."}
                  </p>
                </div>

                <div className="review-reply-actions">
                  <button
                    className="btn"
                    type="button"
                    disabled={workingReviewId === review.id}
                    onClick={() => void copyReply(review)}
                  >
                    {workingReviewId === review.id
                      ? "처리 중..."
                      : "답글 복사"}
                  </button>

                  <button
                    className="btn primary"
                    type="button"
                    disabled={workingReviewId === review.id}
                    onClick={() =>
                      void updateReplyStatus({
                        reviewId: review.id,
                        action: "replied",
                        replyText: review.replyDraft,
                      })
                    }
                  >
                    답글 완료 처리
                  </button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <p>답글 대기 중인 부정 리뷰가 없습니다.</p>
        )}
      </section>

      <section className="review-inbox-card">
        <h3>최근 수집 기록</h3>

        {dashboard?.runs.length ? (
          <div className="review-run-list">
            {dashboard.runs.map((run) => (
              <div className="review-run-item" key={run.id}>
                <div>
                  <strong>{run.platformLabel}</strong>
                  <span>
                    {run.storeName ?? "매장명 없음"} ·{" "}
                    {formatDate(run.createdAt)}
                  </span>
                </div>

                <div>
                  <em>{run.totalReviews}건</em>
                  <span>수집</span>
                </div>

                <div>
                  <em>{run.reviewHealthScore}</em>
                  <span>Health</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p>아직 수집 기록이 없습니다.</p>
        )}
      </section>
    </section>
  );
}
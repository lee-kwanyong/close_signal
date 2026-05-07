"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type ReviewSummaryStatus = "empty" | "stable" | "watch" | "warning" | "danger";

type WeekAggregate = {
  weekStartDate: string;
  reviewCount: number;
  negativeReviewCount: number;
  positiveReviewCount: number;
  neutralReviewCount: number;
  avgRating: number | null;
  negativeReviewRate: number;
  positiveReviewRate: number;
};

type PlatformAggregate = {
  platform: string;
  platformLabel: string;
  reviewCount: number;
  negativeReviewCount: number;
  positiveReviewCount: number;
  latestWeekStartDate: string | null;
  negativeReviewRate: number;
  positiveReviewRate: number;
};

type CustomerReviewSignalData = {
  customerId: string;
  careLead: {
    id: string;
    storeName: string | null;
    businessNumberLast4: string | null;
    reviewerConnected: boolean | null;
    growthReportCreated: boolean | null;
  } | null;
matchMode: "review_account" | "care_lead_store" | "fallback_latest" | "empty";
  sourceNotice: string;
  summary: {
    status: ReviewSummaryStatus;
    title: string;
    message: string;
  };
  latestWeek: WeekAggregate | null;
  previousWeek: WeekAggregate | null;
  reviewDropRate: number | null;
  platforms: PlatformAggregate[];
  topIssues: Array<{
    category: string;
    count: number;
  }>;
  weekSeries: WeekAggregate[];
  raw: {
    weeklyRowCount: number;
    issueSnapshotCount: number;
  };
};

type CustomerReviewSignalCardProps = {
  customerId: string;
};

function formatPercent(value: number | null): string {
  if (value === null) {
    return "-";
  }

  return `${Math.round(value * 100)}%`;
}

function statusLabel(status: ReviewSummaryStatus): string {
  const labels: Record<ReviewSummaryStatus, string> = {
    empty: "데이터 없음",
    stable: "안정",
    watch: "관찰",
    warning: "주의",
    danger: "위험",
  };

  return labels[status];
}

function statusClassName(status: ReviewSummaryStatus): string {
  return `growth-review-status ${status}`;
}

function formatDate(value: string | null): string {
  return value ?? "-";
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return "리뷰 신호를 불러오는 중 오류가 발생했습니다.";
}

export function CustomerReviewSignalCard({
  customerId,
}: CustomerReviewSignalCardProps) {
  const [data, setData] = useState<CustomerReviewSignalData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function loadReviewSignals() {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const response = await fetch(
        `/api/v1/customers/${customerId}/review-signals`
      );

      const payload = await response.json();

      if (!response.ok || !payload?.success) {
        throw new Error(
          payload?.error?.message ?? "리뷰 신호를 불러오지 못했습니다."
        );
      }

      setData(payload.data as CustomerReviewSignalData);
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadReviewSignals();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerId]);

  return (
    <section className="growth-review-card">
      <div className="growth-review-head">
        <div>
          <div className="eyebrow">Growth Signal · Review Signal</div>
          <h2>Reviewer 리뷰 신호</h2>
          <p>
            Reviewer에서 수집한 리뷰를 Growth Signal의 고객 반응 신호로
            표시합니다.
          </p>
        </div>

        {data ? (
          <span className={statusClassName(data.summary.status)}>
            {statusLabel(data.summary.status)}
          </span>
        ) : null}
      </div>

      <div className="growth-review-summary-box">
        {isLoading ? (
          <>
            <h3>리뷰 신호를 불러오는 중입니다</h3>
            <p>Reviewer 주간 지표와 이슈 스냅샷을 확인하고 있습니다.</p>
          </>
        ) : data ? (
          <>
            <h3>{data.summary.title}</h3>
            <p>{data.summary.message}</p>
            <p className="growth-review-source-note">{data.sourceNotice}</p>
          </>
        ) : (
          <>
            <h3>리뷰 신호가 아직 없습니다</h3>
            <p>
              Reviewer에서 리뷰를 수집하고 Growth Signal 지표 생성을 실행하면
              이 카드에 표시됩니다.
            </p>
          </>
        )}
      </div>

      {errorMessage ? (
        <div className="growth-review-error">{errorMessage}</div>
      ) : null}

      {data ? (
        <>
          <div className="growth-review-metrics">
            <div>
              <strong>{data.latestWeek?.reviewCount ?? 0}</strong>
              <span>최근 주 리뷰 수</span>
            </div>

            <div>
              <strong>{formatPercent(data.reviewDropRate)}</strong>
              <span>리뷰 감소율</span>
            </div>

            <div>
              <strong>
                {formatPercent(data.latestWeek?.negativeReviewRate ?? 0)}
              </strong>
              <span>부정 리뷰 비율</span>
            </div>

            <div>
              <strong>{data.latestWeek?.avgRating ?? "-"}</strong>
              <span>평균 평점</span>
            </div>
          </div>

          <div className="growth-review-grid">
            <article>
              <h3>플랫폼별 리뷰 신호</h3>

              {data.platforms.length ? (
                <div className="growth-review-platform-list">
                  {data.platforms.map((platformItem) => (
                    <div
                      className="growth-review-platform"
                      key={platformItem.platform}
                    >
                      <div>
                        <strong>{platformItem.platformLabel}</strong>
                        <span>
                          최근 주차:{" "}
                          {formatDate(platformItem.latestWeekStartDate)}
                        </span>
                      </div>

                      <div>
                        <em>{platformItem.reviewCount}</em>
                        <span>리뷰</span>
                      </div>

                      <div>
                        <em>
                          {formatPercent(platformItem.negativeReviewRate)}
                        </em>
                        <span>부정</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p>플랫폼별 리뷰 지표가 아직 없습니다.</p>
              )}
            </article>

            <article>
              <h3>반복 이슈</h3>

              {data.topIssues.length ? (
                <div className="growth-review-issue-list">
                  {data.topIssues.map((issue) => (
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

          <div className="growth-review-week-series">
            <h3>최근 주간 흐름</h3>

            {data.weekSeries.length ? (
              <div className="growth-review-week-list">
                {data.weekSeries.map((week) => (
                  <div key={week.weekStartDate}>
                    <strong>{week.weekStartDate}</strong>
                    <span>리뷰 {week.reviewCount}건</span>
                    <span>부정 {formatPercent(week.negativeReviewRate)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p>주간 흐름 데이터가 아직 없습니다.</p>
            )}
          </div>
        </>
      ) : null}

      <div className="care-review-actions">
        <button
          className="btn"
          type="button"
          onClick={() => void loadReviewSignals()}
          disabled={isLoading}
        >
          {isLoading ? "불러오는 중..." : "리뷰 신호 새로고침"}
        </button>

        <Link className="btn primary" href="/reviewer">
          Reviewer에서 리뷰 수집하기
        </Link>
      </div>
    </section>
  );
}
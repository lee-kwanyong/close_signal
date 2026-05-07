import type { ClosureRiskLatestDto } from "@/lib/dto";
import { StatusBadge } from "@/components/StatusBadge";

function statusTone(
  status: ClosureRiskLatestDto["review_data_status"]["status"]
): "brand" | "green" | "orange" | "red" | "purple" {
  if (status === "active") return "green";
  if (status === "connected_no_stats") return "orange";
  return "brand";
}

function statusLabel(
  status: ClosureRiskLatestDto["review_data_status"]["status"]
): string {
  if (status === "active") return "리뷰 신호 반영 중";
  if (status === "connected_no_stats") return "연결됨 / 통계 대기";
  return "미연동";
}

export function ReviewDataModuleCard({ risk }: { risk: ClosureRiskLatestDto }) {
  const status = risk.review_data_status;

  return (
    <section className="card soft">
      <div className="mission-top">
        <div>
          <h2>리뷰 신호 모듈</h2>
          <p>
            리뷰 계정 연동은 별도 제품이 아니라 Risk Radar와 Growth Signal에
            고객 반응 신호를 공급하는 보조 데이터 모듈입니다.
          </p>
        </div>
        <StatusBadge tone={statusTone(status.status)}>
          {statusLabel(status.status)}
        </StatusBadge>
      </div>

      <div className="hero-metrics" style={{ marginTop: 18 }}>
        <div className="metric">
          <strong>{status.connectedPlatformCount}개</strong>
          <span>연결 채널</span>
        </div>
        <div className="metric">
          <strong>{status.hasReviewFeature ? "사용 중" : "대기"}</strong>
          <span>리뷰 신호</span>
        </div>
        <div className="metric">
          <strong>
            {risk.debug.reviewDropRate === null
              ? "-"
              : `${Math.round(risk.debug.reviewDropRate * 100)}%`}
          </strong>
          <span>리뷰 감소율</span>
        </div>
      </div>

      <p>{status.message}</p>
    </section>
  );
}

import Link from "next/link";

import { StatusBadge } from "@/components/StatusBadge";
import type { ClosureRiskLatestDto } from "@/lib/dto";

function tone(level: ClosureRiskLatestDto["level"]): "green" | "orange" | "red" | "purple" {
  if (level === "critical") return "purple";
  if (level === "danger") return "red";
  if (level === "warning" || level === "watch") return "orange";
  return "green";
}

export function RiskRadarPreviewCard({
  customerId,
  risk,
}: {
  customerId: string;
  risk: ClosureRiskLatestDto;
}) {
  const topSignals = risk.signals.slice(0, 2);

  return (
    <section className="card soft">
      <div className="mission-top">
        <div>
          <h2>Risk Radar 요약</h2>
          <p>
            새 엔진은 Growth Report 안에 섞지 않고, 별도 페이지에서 조기
            리스크 신호로 확인합니다.
          </p>
        </div>
        <StatusBadge tone={tone(risk.level)}>{risk.level_label}</StatusBadge>
      </div>

      <div className="hero-metrics" style={{ marginTop: 16 }}>
        <div className="metric">
          <strong>{Math.round(risk.score)}점</strong>
          <span>Radar Score</span>
        </div>
        <div className="metric">
          <strong>{risk.signals.length}개</strong>
          <span>감지 신호</span>
        </div>
        <div className="metric">
          <strong>{risk.actions.length}개</strong>
          <span>대응 액션</span>
        </div>
      </div>

      {topSignals.length ? (
        <div className="timeline" style={{ marginTop: 16 }}>
          {topSignals.map((signal) => (
            <div className="timeline-item" key={signal.key}>
              <div className="dot" style={{ background: "var(--orange)" }} />
              <div>
                <strong>{signal.title}</strong>
                <div className="subtle">{signal.description}</div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty" style={{ marginTop: 16 }}>
          현재 강한 리스크 신호는 없습니다.
        </div>
      )}

      <div className="actions-row">
        <Link className="btn" href={`/customers/${customerId}/risk-radar`}>
          Risk Radar 자세히 보기
        </Link>
      </div>
    </section>
  );
}

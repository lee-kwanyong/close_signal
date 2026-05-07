import type { ClosureRiskLatestDto } from "@/lib/dto";
import { StatusBadge } from "@/components/StatusBadge";

function riskTone(
  level: ClosureRiskLatestDto["level"]
): "green" | "orange" | "red" | "purple" {
  if (level === "critical") return "purple";
  if (level === "danger") return "red";
  if (level === "warning" || level === "watch") return "orange";
  return "green";
}

function riskColor(level: ClosureRiskLatestDto["level"]): string {
  if (level === "critical") return "#7257d6";
  if (level === "danger") return "#d64545";
  if (level === "warning" || level === "watch") return "#e88323";
  return "#0d9f6e";
}

export function ClosureRiskHero({ risk }: { risk: ClosureRiskLatestDto }) {
  const degree = Math.max(0, Math.min(100, risk.score)) * 3.6;

  return (
    <section className="card risk-main-card">
      <div className="score-hero">
        <div
          className="score-ring risk-ring"
          style={
            {
              "--score-deg": `${degree}deg`,
              "--risk-ring-color": riskColor(risk.level),
            } as React.CSSProperties
          }
        >
          <div className="score-ring-content">
            <div className="score-number">{Math.round(risk.score)}</div>
            <div className="score-label">Risk Radar</div>
          </div>
        </div>

        <div>
          <StatusBadge tone={riskTone(risk.level)}>
            조기 리스크 {risk.level_label}
          </StatusBadge>

          <h2 style={{ marginTop: 12 }}>
            Risk Radar 점수는 {Math.round(risk.score)}점, {risk.level_label}
            구간입니다.
          </h2>

          <p>{risk.summary}</p>

          <div className="hero-metrics">
            <div className="metric">
              <strong>{risk.signals.length}개</strong>
              <span>감지된 리스크 신호</span>
            </div>

            <div className="metric">
              <strong>{risk.actions.length}개</strong>
              <span>대응 액션</span>
            </div>

            <div className="metric">
              <strong>{risk.review_data_status.connectedPlatformCount}개</strong>
              <span>연결된 리뷰 채널</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

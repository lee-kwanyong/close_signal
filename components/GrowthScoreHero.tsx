import type { GrowthSignalLatestDto } from "@/lib/dto";
import { StatusBadge } from "@/components/StatusBadge";

export function GrowthScoreHero({
  report,
}: {
  report: GrowthSignalLatestDto;
}) {
  const degree = Math.max(0, Math.min(100, report.growth_signal_score)) * 3.6;

  return (
    <section className="card">
      <div className="score-hero">
        <div
          className="score-ring"
          style={
            {
              "--score-deg": `${degree}deg`,
            } as React.CSSProperties
          }
        >
          <div className="score-ring-content">
            <div className="score-number">
              {Math.round(report.growth_signal_score)}
            </div>
            <div className="score-label">Growth</div>
          </div>
        </div>

        <div>
          <StatusBadge tone="brand">Growth Signal Score</StatusBadge>
          <h2 style={{ marginTop: 12 }}>
            현재 Growth Signal 점수는 {Math.round(report.growth_signal_score)}점입니다.
          </h2>
          <p>
            이 점수는 매장의 성장 가능성과 개선 여지를 보여주는 메인
            지표입니다. Risk Radar는 이 점수와 별도로 조기 리스크 신호를
            확인하는 보조 관점입니다.
          </p>

          <div className="hero-metrics">
            <div className="metric">
              <strong>{Math.round(report.reachable_score)}점</strong>
              <span>도달 가능 점수</span>
            </div>
            <div className="metric">
              <strong>+{Math.round(report.unlock_potential_score)}점</strong>
              <span>개선 가능폭</span>
            </div>
            <div className="metric">
              <strong>{report.data_confidence.grade}</strong>
              <span>데이터 신뢰도</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

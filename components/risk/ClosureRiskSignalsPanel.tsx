import type { ClosureRiskLatestDto, ClosureRiskSignalDto } from "@/lib/dto";
import { StatusBadge } from "@/components/StatusBadge";

function severityTone(
  severity: ClosureRiskSignalDto["severity"]
): "brand" | "green" | "orange" | "red" | "purple" {
  if (severity === "critical") return "purple";
  if (severity === "high") return "red";
  if (severity === "medium") return "orange";
  return "green";
}

function categoryLabel(category: string): string {
  const labels: Record<string, string> = {
    sales: "매출",
    cost: "비용",
    operation: "운영",
    review: "리뷰",
    competition: "경쟁",
    region: "상권/지역",
    lifecycle: "업력",
    data: "데이터",
  };

  return labels[category] ?? category;
}

export function ClosureRiskSignalsPanel({
  risk,
}: {
  risk: ClosureRiskLatestDto;
}) {
  const signals = risk.signals.slice(0, 6);

  return (
    <section className="card">
      <h2>Risk Radar 신호</h2>
      <p>
        매출, 비용, 운영, 리뷰, 경쟁, 상권 데이터를 바탕으로 사업 안정성을
        흔들 수 있는 조기 신호를 보여줍니다.
      </p>

      <div className="diagnosis-list">
        {signals.length ? (
          signals.map((signal) => (
            <article className="diagnosis" key={signal.key}>
              <div className="diagnosis-head">
                <div
                  style={{
                    display: "flex",
                    gap: 8,
                    alignItems: "center",
                    flexWrap: "wrap",
                  }}
                >
                  <StatusBadge tone={severityTone(signal.severity)}>
                    {categoryLabel(signal.category)}
                  </StatusBadge>
                  <strong>{signal.title}</strong>
                </div>
                <span className="impact">+{Math.round(signal.contribution)}</span>
              </div>
              <p>{signal.description}</p>
            </article>
          ))
        ) : (
          <div className="empty">
            현재 강한 리스크 신호는 없습니다. 매출, 리뷰, 비용 데이터를 더
            연결하면 Risk Radar가 정교해집니다.
          </div>
        )}
      </div>
    </section>
  );
}

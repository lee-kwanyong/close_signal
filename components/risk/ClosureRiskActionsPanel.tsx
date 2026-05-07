import type { ClosureRiskActionDto, ClosureRiskLatestDto } from "@/lib/dto";
import { StatusBadge } from "@/components/StatusBadge";

function priorityTone(
  priority: ClosureRiskActionDto["priority"]
): "brand" | "green" | "orange" | "red" | "purple" {
  if (priority === "high") return "red";
  if (priority === "medium") return "orange";
  return "green";
}

function priorityLabel(priority: ClosureRiskActionDto["priority"]): string {
  if (priority === "high") return "높음";
  if (priority === "medium") return "보통";
  return "낮음";
}

export function ClosureRiskActionsPanel({
  risk,
}: {
  risk: ClosureRiskLatestDto;
}) {
  return (
    <section className="card">
      <h2>Risk Radar 대응 액션</h2>
      <p>
        감지된 조기 리스크 신호에 대해 이번 주에 먼저 확인하거나 대응하면
        좋은 액션입니다.
      </p>

      <div className="missions">
        {risk.actions.map((action) => (
          <article className="mission-card" key={action.key}>
            <div className="mission-top">
              <StatusBadge tone={priorityTone(action.priority)}>
                우선순위 {priorityLabel(action.priority)}
              </StatusBadge>
              <span className="subtle">
                연결 신호 {action.sourceSignalKeys.length}개
              </span>
            </div>
            <h3>{action.title}</h3>
            <p>{action.description}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

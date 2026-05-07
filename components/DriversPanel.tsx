import type { DriverDto } from "@/lib/dto";
import { StatusBadge } from "@/components/StatusBadge";

function DriverList({ drivers, tone, emptyText }: { drivers: DriverDto[]; tone: "green" | "orange"; emptyText: string }) {
  if (!drivers.length) {
    return <div className="empty">{emptyText}</div>;
  }

  return (
    <div className="timeline" style={{ marginTop: 14 }}>
      {drivers.map((driver) => (
        <div className="timeline-item" key={driver.code}>
          <div className="dot" style={{ background: `var(--${tone})` }} />
          <div>
            <strong>{driver.label}</strong>{" "}
            <StatusBadge tone={tone}>{driver.impact > 0 ? `+${driver.impact}` : `${driver.impact}`}점</StatusBadge>
            <div className="subtle">{driver.description}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function DriversPanel({ positive, negative }: { positive: DriverDto[]; negative: DriverDto[] }) {
  return (
    <section className="grid two">
      <div className="card">
        <h2>좋은 신호</h2>
        <DriverList drivers={positive} tone="green" emptyText="아직 표시할 좋은 신호가 없습니다. 데이터가 쌓이면 자동으로 표시됩니다." />
      </div>
      <div className="card">
        <h2>개선 기회</h2>
        <DriverList drivers={negative} tone="orange" emptyText="현재 표시할 개선 기회가 없습니다. 폐업위험 진단을 실행하면 원인이 표시됩니다." />
      </div>
    </section>
  );
}

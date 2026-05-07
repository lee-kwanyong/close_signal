import type { DiagnosisDto } from "@/lib/dto";
import { StatusBadge } from "@/components/StatusBadge";

export function DiagnosisList({ diagnoses }: { diagnoses: DiagnosisDto[] }) {
  return (
    <section className="card">
      <h2>점수를 낮추는 TOP 원인</h2>
      <p>문제가 아니라, 이번 달 바로 개선할 수 있는 성장 기회입니다.</p>
      <div className="diagnosis-list">
        {diagnoses.length === 0 && <div className="empty">현재 표시할 진단이 없습니다.</div>}
        {diagnoses.map((diagnosis) => (
          <article className="diagnosis" key={diagnosis.diagnosis_id}>
            <div className="diagnosis-head">
              <div>
                <StatusBadge tone="orange">{diagnosis.affected_score_area}</StatusBadge>
                <h3 style={{ marginTop: 10 }}>{diagnosis.title ?? diagnosis.diagnosis_code}</h3>
              </div>
              <div className="impact">{diagnosis.impact_score}점</div>
            </div>
            <p>{diagnosis.customer_message}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

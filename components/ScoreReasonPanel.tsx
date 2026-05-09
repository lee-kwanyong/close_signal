import type { DiagnosisDto, GrowthSignalLatestDto } from "@/lib/dto";
import { StatusBadge } from "@/components/StatusBadge";

function impactLabel(value: number) {
  if (value > 0) return `+${Math.round(value)}점`;
  if (value < 0) return `${Math.round(value)}점`;
  return "영향 보통";
}

export function ScoreReasonPanel({
  report,
  diagnoses
}: {
  report: GrowthSignalLatestDto;
  diagnoses: DiagnosisDto[];
}) {
  const positive = report.positive_drivers?.slice(0, 4) ?? [];
  const negative = report.negative_drivers?.slice(0, 4) ?? [];
  const topDiagnoses = diagnoses.slice(0, 4);

  return (
    <section className="card">
      <div className="topbar" style={{ marginBottom: 14 }}>
        <div>
          <div className="eyebrow">Why this score?</div>
          <h2>점수 이유와 개선 근거</h2>
          <p className="subtle">
            점수는 평가가 아니라 어떤 성장 신호를 놓치고 있는지 보여주는 설명입니다.
          </p>
        </div>

        <StatusBadge tone={report.data_confidence.grade === "A" ? "green" : "brand"}>
          신뢰도 {report.data_confidence.grade}
        </StatusBadge>
      </div>

      <div className="grid three">
        <div className="card soft">
          <span className="badge green">좋은 신호</span>
          <div className="reason-list">
            {positive.length ? (
              positive.map((driver) => (
                <div className="reason-item" key={driver.code}>
                  <strong>{driver.label}</strong>
                  <p>{driver.description}</p>
                  <span className="mini-impact green">{impactLabel(driver.impact)}</span>
                </div>
              ))
            ) : (
              <p>좋은 신호는 추가 데이터가 쌓이면 더 구체화됩니다.</p>
            )}
          </div>
        </div>

        <div className="card soft">
          <span className="badge orange">개선 신호</span>
          <div className="reason-list">
            {negative.length ? (
              negative.map((driver) => (
                <div className="reason-item" key={driver.code}>
                  <strong>{driver.label}</strong>
                  <p>{driver.description}</p>
                  <span className="mini-impact red">{impactLabel(driver.impact)}</span>
                </div>
              ))
            ) : (
              <p>현재 큰 감점 요인은 확인되지 않았습니다.</p>
            )}
          </div>
        </div>

        <div className="card soft">
          <span className="badge purple">진단 코드</span>
          <div className="reason-list">
            {topDiagnoses.length ? (
              topDiagnoses.map((diagnosis) => (
                <div className="reason-item" key={diagnosis.diagnosis_id}>
                  <strong>{diagnosis.title ?? diagnosis.diagnosis_code}</strong>
                  <p>{diagnosis.customer_message}</p>
                  <span className="mini-impact">
                    영향 {Math.round(diagnosis.impact_score ?? 0)}점
                  </span>
                </div>
              ))
            ) : (
              <p>진단 코드가 아직 생성되지 않았습니다.</p>
            )}
          </div>
        </div>
      </div>

      <div className="data-source-strip">
        <strong>사용 데이터</strong>
        <span>고객 입력</span>
        <span>사업자 상태</span>
        <span>지도/장소 매칭</span>
        <span>상권·생활인구</span>
        <span>반경 경쟁점</span>
        <span>서비스 이용 행동</span>
      </div>
    </section>
  );
}

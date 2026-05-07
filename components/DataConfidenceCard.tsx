import type { GrowthSignalLatestDto } from "@/lib/dto";

export function DataConfidenceCard({ report }: { report: GrowthSignalLatestDto }) {
  return (
    <section className="card">
      <h2>데이터 신뢰도</h2>
      <div className="confidence-grid" style={{ marginTop: 16 }}>
        <div className="confidence-grade">{report.data_confidence.grade}</div>
        <div>
          <strong>{Math.round(report.data_confidence.score)}점</strong>
          <p>{report.data_confidence.message ?? "현재 연결된 데이터를 기준으로 진단했습니다."}</p>
        </div>
      </div>
      {report.missing_data.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <h3>보강하면 좋은 데이터</h3>
          <div className="timeline" style={{ marginTop: 10 }}>
            {report.missing_data.map((item) => (
              <div className="timeline-item" key={item.type}>
                <div className="dot" />
                <div>
                  <strong>{item.label}</strong>
                  <div className="subtle">{item.message}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

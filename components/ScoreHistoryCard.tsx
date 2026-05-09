import type { ComponentScoresDto } from "@/lib/dto";

type ScoreHistoryItem = {
  score_id: string;
  score_date: string;
  growth_signal_score: number;
  unlock_potential_score: number;
  reachable_score: number;
  data_confidence_grade: string;
  component_scores?: ComponentScoresDto;
};

export function ScoreHistoryCard({ history }: { history: ScoreHistoryItem[] }) {
  const items = history.slice(0, 6);

  return (
    <section className="card">
      <div className="topbar" style={{ marginBottom: 14 }}>
        <div>
          <div className="eyebrow">Score History</div>
          <h2>최근 점수 변화</h2>
          <p className="subtle">
            미션을 완료할수록 점수와 데이터 신뢰도 변화가 누적됩니다.
          </p>
        </div>
      </div>

      {items.length ? (
        <div className="history-list">
          {items.map((item, index) => {
            const prev = items[index + 1];
            const diff = prev ? item.growth_signal_score - prev.growth_signal_score : null;

            return (
              <div className="history-item" key={item.score_id}>
                <div>
                  <strong>{Math.round(item.growth_signal_score)}점</strong>
                  <span>{new Date(item.score_date).toLocaleDateString("ko-KR")}</span>
                </div>

                <div className="history-line" />

                <div className={diff != null && diff >= 0 ? "history-diff up" : "history-diff"}>
                  {diff == null ? "첫 측정" : `${diff >= 0 ? "+" : ""}${diff.toFixed(1)}점`}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="empty">
          아직 점수 히스토리가 없습니다. 미션 완료 또는 재진단 후 변화가 표시됩니다.
        </div>
      )}
    </section>
  );
}

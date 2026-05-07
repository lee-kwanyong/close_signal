import type { ComponentScoresDto } from "@/lib/dto";
import { componentLabel, formatScore } from "@/lib/format";

const order: Array<keyof ComponentScoresDto> = [
  "market_opportunity",
  "competition_position",
  "digital_discovery",
  "conversion_readiness",
  "trust_reaction",
  "action_velocity",
  "operation_basic",
];

export function ComponentScoreGrid({ scores }: { scores: ComponentScoresDto }) {
  return (
    <section className="card soft">
      <h2>성장 구성 점수</h2>
      <p>
        Growth Signal을 구성하는 상권, 경쟁, 검색 노출, 전환 준비도, 신뢰
        반응, 실행 속도, 운영 기본 점수입니다.
      </p>

      <div className="component-list">
        {order.map((key) => {
          const score = scores[key];
          const width = Math.max(0, Math.min(100, score ?? 0));

          return (
            <div className="score-row" key={key}>
              <div className="label">{componentLabel(key)}</div>
              <div className="bar">
                <span
                  style={
                    {
                      "--bar-width": `${width}%`,
                    } as React.CSSProperties
                  }
                />
              </div>
              <div className="value">{formatScore(score)}</div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

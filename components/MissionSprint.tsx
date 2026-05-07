import type { CurrentSprintDto } from "@/lib/dto";
import { MissionCard } from "@/components/MissionCard";

export function MissionSprint({ customerId, sprint }: { customerId: string; sprint: CurrentSprintDto }) {
  return (
    <section className="card">
      <div className="mission-top">
        <div>
          <h2>{sprint.sprint_name}</h2>
          <p>이번 주에는 3개만 완료하세요. 완료하면 점수가 바로 움직입니다.</p>
        </div>
        <div className="metric" style={{ minWidth: 130 }}>
          <strong>+{Math.round(sprint.target_score_lift)}점</strong>
          <span>목표 상승폭</span>
        </div>
      </div>
      <div className="missions" style={{ marginTop: 16 }}>
        {sprint.weekly_missions.length ? (
          sprint.weekly_missions.map((mission) => (
            <MissionCard key={mission.mission_id} customerId={customerId} mission={mission} />
          ))
        ) : (
          <div className="empty">
            아직 생성된 미션이 없습니다. 폐업위험 진단을 실행하면 추천 액션과 주간 미션이 만들어집니다.
          </div>
        )}
      </div>
    </section>
  );
}

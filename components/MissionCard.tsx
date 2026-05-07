"use client";

import Link from "next/link";
import { useState } from "react";
import type { MissionDto } from "@/lib/dto";
import { growthSignalApi } from "@/lib/api";
import { missionTypeBadge, missionTypeLabel } from "@/lib/format";
import { StatusBadge } from "@/components/StatusBadge";

export function MissionCard({ customerId, mission }: { customerId: string; mission: MissionDto }) {
  const [status, setStatus] = useState(mission.status);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function completeMission() {
    setBusy(true);
    try {
      const result = await growthSignalApi.completeAction(mission.action_id, `${mission.title} 완료`);
      setStatus("completed");
      setFeedback(result.score_feedback?.message ?? "미션 완료 처리되었습니다.");
      await growthSignalApi.trackEvent({
        customer_id: customerId,
        event_name: "ACTION_COMPLETED",
        entity_type: "action_instance",
        entity_id: mission.action_id,
        metadata: { source: "mission_card" }
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <article className="mission-card">
      <div className="mission-top">
        <div>
          <StatusBadge tone={missionTypeBadge(mission.mission_type)}>{missionTypeLabel(mission.mission_type)}</StatusBadge>
          <h3>{mission.title}</h3>
        </div>
        <StatusBadge tone={status === "completed" ? "green" : "brand"}>{status}</StatusBadge>
      </div>
      <div className="mission-meta">
        <StatusBadge tone="green">+{Math.round(mission.expected_lift)}점 예상</StatusBadge>
        {mission.estimated_minutes && <StatusBadge tone="purple">{mission.estimated_minutes}분</StatusBadge>}
        {mission.day_number && <StatusBadge tone="orange">Day {mission.day_number}</StatusBadge>}
      </div>
      {feedback && <p style={{ color: "var(--green)", fontWeight: 800 }}>{feedback}</p>}
      <div className="actions-row">
        <Link className="btn" href={`/customers/${customerId}/actions/${mission.action_id}`}>실행 가이드 보기</Link>
        <button className="btn primary" disabled={busy || status === "completed"} onClick={completeMission}>
          {busy ? "처리 중" : "완료했어요"}
        </button>
      </div>
    </article>
  );
}

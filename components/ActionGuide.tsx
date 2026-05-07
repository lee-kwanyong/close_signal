"use client";

import { useState } from "react";
import type { ActionDetailDto } from "@/lib/dto";
import { growthSignalApi } from "@/lib/api";
import { StatusBadge } from "@/components/StatusBadge";
import { missionTypeBadge, missionTypeLabel } from "@/lib/format";

export function ActionGuide({ action }: { action: ActionDetailDto }) {
  const [feedback, setFeedback] = useState<string | null>(null);
  const [evidenceUrl, setEvidenceUrl] = useState("");
  const [busy, setBusy] = useState(false);

  async function complete() {
    setBusy(true);
    try {
      const result = await growthSignalApi.completeAction(action.action_id, `${action.title} 완료`);
      setFeedback(result.score_feedback?.message ?? "미션 완료 처리되었습니다.");
    } finally {
      setBusy(false);
    }
  }

  async function submitEvidence() {
    if (!evidenceUrl.trim()) return;
    setBusy(true);
    try {
      await growthSignalApi.submitEvidence(action.action_id, {
        evidence_type: "url",
        evidence_url: evidenceUrl,
        evidence_text: `${action.title} 증빙 URL`
      });
      setFeedback("증빙이 제출되었습니다. 데이터 신뢰도가 상승합니다.");
      setEvidenceUrl("");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card">
      <StatusBadge tone={missionTypeBadge(action.mission_type)}>{missionTypeLabel(action.mission_type)}</StatusBadge>
      <h1 style={{ marginTop: 12 }}>{action.title}</h1>
      <p>{action.description}</p>
      <div className="mission-meta">
        <StatusBadge tone="green">+{Math.round(action.expected_total_lift)}점 예상</StatusBadge>
        {action.estimated_minutes && <StatusBadge tone="purple">{action.estimated_minutes}분</StatusBadge>}
        <StatusBadge tone="brand">{action.status}</StatusBadge>
      </div>
      {action.safety_note && <p style={{ color: "var(--orange)", fontWeight: 800 }}>{action.safety_note}</p>}

      {action.guide.checklist && (
        <div className="card soft" style={{ marginTop: 18 }}>
          <h3>체크리스트</h3>
          <div className="timeline" style={{ marginTop: 12 }}>
            {action.guide.checklist.map((item) => (
              <div className="timeline-item" key={item}>
                <div className="dot" />
                <div>{item}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {action.guide.fields && (
        <div className="card soft" style={{ marginTop: 18 }}>
          <h3>작성 필드</h3>
          <div className="mission-meta">
            {action.guide.fields.map((field) => <StatusBadge key={field} tone="brand">{field}</StatusBadge>)}
          </div>
        </div>
      )}

      {feedback && <p style={{ color: "var(--green)", fontWeight: 900 }}>{feedback}</p>}

      <div className="actions-row">
        <button className="btn primary" disabled={busy} onClick={complete}>완료했어요</button>
      </div>

      <div className="card soft" style={{ marginTop: 18 }}>
        <h3>증빙 URL 제출</h3>
        <p>지도 URL, 등록 완료 페이지, 이미지 링크 등을 넣으면 데이터 신뢰도가 올라갑니다.</p>
        <div style={{ display: "flex", gap: 10 }}>
          <input
            style={{ flex: 1, border: "1px solid var(--line)", borderRadius: 12, padding: 12 }}
            value={evidenceUrl}
            onChange={(event) => setEvidenceUrl(event.target.value)}
            placeholder="https://..."
          />
          <button className="btn" disabled={busy || !evidenceUrl.trim()} onClick={submitEvidence}>제출</button>
        </div>
      </div>
    </section>
  );
}

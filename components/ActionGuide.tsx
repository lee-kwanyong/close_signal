"use client";

import { useState } from "react";
import type { ActionDetailDto, CompleteActionResponseDto } from "@/lib/dto";
import { growthSignalApi } from "@/lib/api";
import { StatusBadge } from "@/components/StatusBadge";
import { missionTypeBadge, missionTypeLabel } from "@/lib/format";

function formatScore(value?: number | null) {
  return value == null ? "-" : `${Math.round(value)}점`;
}

export function ActionGuide({ action }: { action: ActionDetailDto }) {
  const [feedback, setFeedback] =
    useState<CompleteActionResponseDto["score_feedback"] | null>(null);
  const [evidenceUrl, setEvidenceUrl] = useState("");
  const [busy, setBusy] = useState(false);

  async function complete() {
    setBusy(true);

    try {
      const result = await growthSignalApi.completeAction(
        action.action_id,
        `${action.title} 완료`
      );

      setFeedback(result.score_feedback ?? { message: "미션 완료 처리되었습니다." });
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

      setFeedback({
        message: "증빙이 제출되었습니다. 데이터 신뢰도가 상승합니다."
      });

      setEvidenceUrl("");
    } finally {
      setBusy(false);
    }
  }

  const changedComponents = feedback?.changed_components
    ? Object.entries(feedback.changed_components)
    : [];

  return (
    <section className="card">
      <StatusBadge tone={missionTypeBadge(action.mission_type)}>
        {missionTypeLabel(action.mission_type)}
      </StatusBadge>

      <h1 style={{ marginTop: 12 }}>{action.title}</h1>
      <p>{action.description}</p>

      <div className="mission-meta">
        <StatusBadge tone="green">+{Math.round(action.expected_total_lift)}점 예상</StatusBadge>
        {action.estimated_minutes ? (
          <StatusBadge tone="purple">{action.estimated_minutes}분</StatusBadge>
        ) : null}
        <StatusBadge tone="brand">{action.status}</StatusBadge>
      </div>

      {action.safety_note ? (
        <p style={{ color: "var(--orange)", fontWeight: 800 }}>
          {action.safety_note}
        </p>
      ) : null}

      {action.guide.checklist ? (
        <div className="card soft" style={{ marginTop: 18 }}>
          <h3>체크리스트</h3>
          <div className="timeline" style={{ marginTop: 12 }}>
            {action.guide.checklist.map((item) => (
              <label className="timeline-item check-row" key={item}>
                <input type="checkbox" />
                <div>{item}</div>
              </label>
            ))}
          </div>
        </div>
      ) : null}

      {action.guide.fields ? (
        <div className="card soft" style={{ marginTop: 18 }}>
          <h3>작성 필드</h3>
          <div className="mission-meta">
            {action.guide.fields.map((field) => (
              <StatusBadge key={field} tone="brand">
                {field}
              </StatusBadge>
            ))}
          </div>
        </div>
      ) : null}

      {feedback ? (
        <div className="completion-feedback">
          <span className="badge green">미션 완료 피드백</span>
          <h3>{feedback.message}</h3>

          <div className="score-change-row">
            <div>
              <span>완료 전</span>
              <strong>{formatScore(feedback.before_growth_signal_score)}</strong>
            </div>

            <div className="score-arrow">→</div>

            <div>
              <span>완료 후</span>
              <strong>{formatScore(feedback.after_growth_signal_score)}</strong>
            </div>
          </div>

          {changedComponents.length ? (
            <div className="mission-meta">
              {changedComponents.map(([key, value]) => (
                <StatusBadge key={key} tone="green">
                  {key}: {Math.round(value.before)} → {Math.round(value.after)}
                </StatusBadge>
              ))}
            </div>
          ) : null}

          <p className="subtle">
            외부 데이터로 확인되면 해당 컴포넌트 점수와 데이터 신뢰도가 추가 반영됩니다.
          </p>
        </div>
      ) : null}

      <div className="actions-row">
        <button className="btn primary" disabled={busy} onClick={complete}>
          완료했어요
        </button>
      </div>

      <div className="card soft" style={{ marginTop: 18 }}>
        <h3>증빙 URL 제출</h3>
        <p>지도 URL, 등록 완료 페이지, 이미지 링크 등을 넣으면 데이터 신뢰도가 올라갑니다.</p>

        <div style={{ display: "flex", gap: 10 }}>
          <input
            style={{
              flex: 1,
              border: "1px solid var(--line)",
              borderRadius: 12,
              padding: 12
            }}
            value={evidenceUrl}
            onChange={(event) => setEvidenceUrl(event.target.value)}
            placeholder="https://..."
          />

          <button className="btn" disabled={busy || !evidenceUrl.trim()} onClick={submitEvidence}>
            제출
          </button>
        </div>
      </div>
    </section>
  );
}

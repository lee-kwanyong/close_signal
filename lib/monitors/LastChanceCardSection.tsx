type LastChanceReason = {
  id?: number | string | null;
  reasonCode?: string | null;
  canonicalReasonCode?: string | null;
  title?: string | null;
  detail?: string | null;
  weight?: number | null;
  severity?: string | null;
  dimension?: string | null;
  playbookCode?: string | null;
  evidenceNeeded?: string[] | null;
  successCriteria?: string[] | null;
};

type LastChanceAction = {
  id?: number | string | null;
  playbookCode?: string | null;
  title?: string | null;
  description?: string | null;
  priority?: number | null;
  dueInDays?: number | null;
  status?: string | null;
  actionStatus?: string | null;
  evidenceNeeded?: string[] | null;
  successCriteria?: string[] | null;
  sourceReasonCodes?: string[] | null;
};

type LastChanceEvidence = {
  id?: number | string | null;
  title?: string | null;
  description?: string | null;
  sourceLabel?: string | null;
};

type LastChanceSuccessCriterion = {
  id?: number | string | null;
  title?: string | null;
  description?: string | null;
};

type LastChanceReevaluation = {
  nextReviewAt?: string | null;
  totalRiskDelta?: number | string | null;
  recoverabilityDelta?: number | string | null;
  latestResultStatus?: string | null;
  latestResultText?: string | null;
};

export type LastChanceCardViewModel = {
  snapshotDate?: string | null;
  stage?: string | null;
  whySummary?: string | null;
  actionSummary?: string | null;
  nextReviewAt?: string | null;
  reasons?: LastChanceReason[] | null;
  actions?: LastChanceAction[] | null;
  evidence?: LastChanceEvidence[] | null;
  successCriteria?: LastChanceSuccessCriterion[] | null;
  reevaluation?: LastChanceReevaluation | null;
};

type Props = {
  card?: LastChanceCardViewModel | null;
};

function textValue(value: unknown, fallback = "-") {
  const s = String(value ?? "").trim();
  return s.length > 0 ? s : fallback;
}

function formatDate(value?: string | null) {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function formatScore(value: unknown) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "-";
  return n % 1 === 0 ? String(n) : n.toFixed(1);
}

function stageTone(stage?: string | null) {
  const v = String(stage ?? "").toLowerCase();

  if (v === "last_chance") {
    return "border-rose-200 bg-rose-50 text-rose-700";
  }
  if (v === "urgent") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }
  if (v === "caution") {
    return "border-sky-200 bg-sky-50 text-sky-700";
  }
  if (v === "closed") {
    return "border-slate-300 bg-slate-100 text-slate-700";
  }

  return "border-emerald-200 bg-emerald-50 text-emerald-700";
}

function stageLabel(stage?: string | null) {
  const v = String(stage ?? "").toLowerCase();

  if (v === "last_chance") return "마지막 기회";
  if (v === "urgent") return "긴급";
  if (v === "caution") return "주의";
  if (v === "observe") return "관찰";
  if (v === "closed") return "폐업";
  return "운영";
}

function severityTone(severity?: string | null) {
  const v = String(severity ?? "").toLowerCase();

  if (v === "high" || v === "critical") {
    return "bg-rose-100 text-rose-700";
  }
  if (v === "medium") {
    return "bg-amber-100 text-amber-700";
  }
  return "bg-slate-100 text-slate-600";
}

function priorityTone(priority?: number | null) {
  const p = Number(priority ?? 0);

  if (p <= 1) return "bg-rose-100 text-rose-700";
  if (p === 2) return "bg-amber-100 text-amber-700";
  return "bg-slate-100 text-slate-600";
}

function statusTone(status?: string | null) {
  const v = String(status ?? "").toLowerCase();

  if (v === "completed" || v === "done") {
    return "bg-emerald-100 text-emerald-700";
  }
  if (v === "accepted" || v === "in_progress") {
    return "bg-sky-100 text-sky-700";
  }
  if (v === "dismissed") {
    return "bg-slate-200 text-slate-600";
  }
  return "bg-slate-100 text-slate-600";
}

function flattenEvidenceFromActions(actions: LastChanceAction[]) {
  const items = actions.flatMap((action) =>
    (action.evidenceNeeded ?? []).map((entry, index) => ({
      id: `${action.playbookCode ?? action.title ?? "action"}-evidence-${index}`,
      title: entry,
      description: action.title ? `${action.title} 실행 확인 자료` : "실행 확인 자료",
      sourceLabel: action.playbookCode ?? null,
    })),
  );

  const deduped = new Map<string, LastChanceEvidence>();

  for (const item of items) {
    const key = `${item.title}::${item.sourceLabel ?? ""}`;
    if (!deduped.has(key)) {
      deduped.set(key, item);
    }
  }

  return [...deduped.values()];
}

function flattenSuccessCriteriaFromActions(actions: LastChanceAction[]) {
  const items = actions.flatMap((action) =>
    (action.successCriteria ?? []).map((entry, index) => ({
      id: `${action.playbookCode ?? action.title ?? "action"}-success-${index}`,
      title: entry,
      description: action.title ? `${action.title} 완료 후 확인 기준` : "완료 후 확인 기준",
    })),
  );

  const deduped = new Map<string, LastChanceSuccessCriterion>();

  for (const item of items) {
    const key = `${item.title}`;
    if (!deduped.has(key)) {
      deduped.set(key, item);
    }
  }

  return [...deduped.values()];
}

function reasonWeightLabel(reason: LastChanceReason) {
  const weight = Number(reason.weight ?? NaN);
  if (!Number.isFinite(weight)) return null;
  return weight % 1 === 0 ? `weight ${weight}` : `weight ${weight.toFixed(1)}`;
}

export default function LastChanceCardSection({ card }: Props) {
  const reasons = card?.reasons ?? [];
  const actions = card?.actions ?? [];

  const evidence =
    (card?.evidence ?? []).length > 0
      ? (card?.evidence ?? [])
      : flattenEvidenceFromActions(actions);

  const successCriteria =
    (card?.successCriteria ?? []).length > 0
      ? (card?.successCriteria ?? [])
      : flattenSuccessCriteriaFromActions(actions);

  const reevaluation = card?.reevaluation ?? null;

  return (
    <section className="rounded-[32px] border border-slate-200 bg-white p-5 shadow-[0_12px_30px_rgba(15,23,42,0.04)] sm:p-6">
      <div className="flex flex-col gap-4 border-b border-slate-100 pb-5 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${stageTone(card?.stage)}`}
            >
              {stageLabel(card?.stage)}
            </span>

            <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600">
              스냅샷 {formatDate(card?.snapshotDate)}
            </span>

            <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
              다음 재평가 {formatDate(card?.nextReviewAt ?? reevaluation?.nextReviewAt)}
            </span>
          </div>

          <h2 className="mt-3 text-xl font-bold tracking-[-0.02em] text-slate-950 sm:text-2xl">
            마지막 기회 카드
          </h2>

          <p className="mt-2 text-sm leading-6 text-slate-500">
            이유와 액션을 먼저 보고, 아래에서 증거·성공기준·재평가를 확인하는 구조로
            정리했습니다.
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <section className="rounded-[24px] border border-amber-100 bg-amber-50/70 p-5">
          <div className="text-xs font-semibold uppercase tracking-[0.14em] text-amber-700">
            핵심 이유
          </div>

          <div className="mt-3 rounded-2xl border border-white/80 bg-white px-4 py-4">
            <div className="text-base font-bold text-slate-950">
              {textValue(card?.whySummary, "핵심 원인 요약이 없습니다.")}
            </div>
          </div>

          <div className="mt-4 space-y-3">
            {reasons.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-amber-200 bg-white/80 px-4 py-4 text-sm text-slate-500">
                등록된 원인이 없습니다.
              </div>
            ) : (
              reasons.map((reason, index) => (
                <article
                  key={String(reason.id ?? `${reason.reasonCode ?? "reason"}-${index}`)}
                  className="rounded-2xl border border-white/80 bg-white px-4 py-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)]"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700">
                      이유 {index + 1}
                    </span>

                    {reason.severity ? (
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${severityTone(reason.severity)}`}
                      >
                        {String(reason.severity)}
                      </span>
                    ) : null}

                    {reasonWeightLabel(reason) ? (
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                        {reasonWeightLabel(reason)}
                      </span>
                    ) : null}
                  </div>

                  <div className="mt-3 text-base font-bold text-slate-950">
                    {textValue(reason.title, "원인")}
                  </div>

                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    {textValue(reason.detail, "설명이 없습니다.")}
                  </p>

                  {(reason.dimension || reason.playbookCode) && (
                    <div className="mt-3 flex flex-wrap gap-2 text-xs">
                      {reason.dimension ? (
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 font-medium text-slate-500">
                          {String(reason.dimension)}
                        </span>
                      ) : null}

                      {reason.playbookCode ? (
                        <span className="rounded-full bg-violet-100 px-2.5 py-1 font-medium text-violet-600">
                          {String(reason.playbookCode)}
                        </span>
                      ) : null}
                    </div>
                  )}
                </article>
              ))
            )}
          </div>
        </section>

        <section className="rounded-[24px] border border-emerald-100 bg-emerald-50/70 p-5">
          <div className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700">
            바로 실행할 액션
          </div>

          <div className="mt-3 rounded-2xl border border-white/80 bg-white px-4 py-4">
            <div className="text-base font-bold text-slate-950">
              {textValue(card?.actionSummary, "권장 액션 요약이 없습니다.")}
            </div>
          </div>

          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            {actions.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-emerald-200 bg-white/80 px-4 py-4 text-sm text-slate-500 lg:col-span-2">
                등록된 액션이 없습니다.
              </div>
            ) : (
              actions.map((action, index) => {
                const status = action.actionStatus ?? action.status;

                return (
                  <article
                    key={String(action.id ?? `${action.playbookCode ?? "action"}-${index}`)}
                    className="rounded-2xl border border-white/80 bg-white px-4 py-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)]"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                        액션
                      </span>

                      {action.priority != null ? (
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${priorityTone(action.priority)}`}
                        >
                          priority {action.priority}
                        </span>
                      ) : null}

                      {action.dueInDays != null ? (
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                          {action.dueInDays}일 내
                        </span>
                      ) : null}

                      {status ? (
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusTone(status)}`}
                        >
                          {String(status)}
                        </span>
                      ) : null}
                    </div>

                    <div className="mt-3 text-base font-bold text-slate-950">
                      {textValue(action.title, "액션")}
                    </div>

                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      {textValue(action.description, "설명이 없습니다.")}
                    </p>

                    {action.playbookCode ? (
                      <div className="mt-3 text-xs font-medium text-violet-500">
                        playbook: {action.playbookCode}
                      </div>
                    ) : null}

                    {(action.evidenceNeeded?.length ?? 0) > 0 ? (
                      <div className="mt-4">
                        <div className="text-xs font-semibold text-slate-400">필요 증거</div>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {action.evidenceNeeded!.slice(0, 3).map((item, idx) => (
                            <span
                              key={`${action.playbookCode ?? action.title}-e-${idx}`}
                              className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600"
                            >
                              {item}
                            </span>
                          ))}
                        </div>
                      </div>
                    ) : null}

                    {(action.successCriteria?.length ?? 0) > 0 ? (
                      <div className="mt-4">
                        <div className="text-xs font-semibold text-slate-400">성공 기준</div>
                        <ul className="mt-2 space-y-1.5">
                          {action.successCriteria!.slice(0, 2).map((item, idx) => (
                            <li
                              key={`${action.playbookCode ?? action.title}-s-${idx}`}
                              className="text-sm leading-6 text-slate-600"
                            >
                              · {item}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                  </article>
                );
              })
            )}
          </div>
        </section>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <section className="rounded-[24px] border border-slate-200 bg-slate-50 p-5">
          <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
            증거
          </div>

          <div className="mt-4 space-y-3">
            {evidence.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-4 text-sm text-slate-500">
                필요한 증거가 없습니다.
              </div>
            ) : (
              evidence.map((item, index) => (
                <article
                  key={String(item.id ?? `evidence-${index}`)}
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-4"
                >
                  <div className="text-sm font-bold text-slate-900">
                    {textValue(item.title, "증거")}
                  </div>

                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    {textValue(item.description, "-")}
                  </p>

                  {item.sourceLabel ? (
                    <div className="mt-2 text-xs font-medium text-violet-500">
                      {item.sourceLabel}
                    </div>
                  ) : null}
                </article>
              ))
            )}
          </div>
        </section>

        <section className="rounded-[24px] border border-slate-200 bg-slate-50 p-5">
          <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
            성공기준
          </div>

          <div className="mt-4 space-y-3">
            {successCriteria.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-4 text-sm text-slate-500">
                성공기준이 없습니다.
              </div>
            ) : (
              successCriteria.map((item, index) => (
                <article
                  key={String(item.id ?? `success-${index}`)}
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-4"
                >
                  <div className="text-sm font-bold text-slate-900">
                    {textValue(item.title, "성공기준")}
                  </div>

                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    {textValue(item.description, "-")}
                  </p>
                </article>
              ))
            )}
          </div>
        </section>

        <section className="rounded-[24px] border border-slate-200 bg-slate-50 p-5">
          <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
            재평가
          </div>

          <div className="mt-4 grid gap-3">
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
              <div className="text-xs font-semibold text-slate-400">다음 재평가일</div>
              <div className="mt-2 text-base font-bold text-slate-950">
                {formatDate(card?.nextReviewAt ?? reevaluation?.nextReviewAt)}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
              <div className="text-xs font-semibold text-slate-400">총 위험 변화</div>
              <div className="mt-2 text-base font-bold text-slate-950">
                {formatScore(reevaluation?.totalRiskDelta)}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
              <div className="text-xs font-semibold text-slate-400">구조 가능성 변화</div>
              <div className="mt-2 text-base font-bold text-slate-950">
                {formatScore(reevaluation?.recoverabilityDelta)}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
              <div className="text-xs font-semibold text-slate-400">최근 결과</div>
              <div className="mt-2 text-sm font-semibold text-slate-900">
                {textValue(reevaluation?.latestResultStatus, "-")}
              </div>

              <p className="mt-2 text-sm leading-6 text-slate-600">
                {textValue(reevaluation?.latestResultText, "최근 결과 메모가 없습니다.")}
              </p>
            </div>
          </div>
        </section>
      </div>
    </section>
  );
}
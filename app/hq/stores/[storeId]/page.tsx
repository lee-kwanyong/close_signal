import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

type Params = Promise<{
  storeId: string;
}>;

type StoreDetailRow = {
  brand_id: number;
  brand_name: string;
  store_id: number;
  store_name: string;
  store_code: string | null;
  store_status: string | null;
  open_state: string | null;
  is_open: boolean | null;
  opened_on: string | null;
  closed_on: string | null;
  snapshot_date: string | null;
  latest_status_snapshot_date: string | null;
  latest_upload_batch_id: number | null;
  latest_upload_name: string | null;
  latest_upload_status: string | null;
  latest_upload_created_at: string | null;
  summary_text: string | null;
  store_risk_score: number | null;
  recovery_potential_score: number | null;
  action_priority_score: number | null;
  recommendation: string | null;
  risk_grade: string | null;
  feature_snapshot: unknown;
  reasons: unknown;
  actions: unknown;
  action_runs: unknown;
  status_history: unknown;
  upload_history: unknown;
};

function formatNumber(value?: number | null) {
  if (value === null || value === undefined || Number.isNaN(value)) return "0";
  return new Intl.NumberFormat("ko-KR").format(value);
}

function formatScore(value?: number | null) {
  if (value === null || value === undefined || Number.isNaN(value)) return "-";
  return `${Math.round(Number(value))}`;
}

function formatSignedPercent(value?: number | null, digits = 1) {
  if (value === null || value === undefined || Number.isNaN(value)) return "-";
  const num = Number(value);
  const sign = num > 0 ? "+" : "";
  return `${sign}${num.toFixed(digits)}%`;
}

function formatDate(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function formatDateTime(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function scoreTone(value?: number | null) {
  const num = Number(value ?? 0);
  if (num >= 85) return "border-red-200 bg-red-50 text-red-700";
  if (num >= 70) return "border-orange-200 bg-orange-50 text-orange-700";
  if (num >= 55) return "border-amber-200 bg-amber-50 text-amber-700";
  return "border-emerald-200 bg-emerald-50 text-emerald-700";
}

function openStateTone(value?: string | null) {
  const v = String(value || "").toLowerCase();

  if (v === "closed") return "border-red-200 bg-red-50 text-red-700";
  if (v === "paused") return "border-amber-200 bg-amber-50 text-amber-700";
  if (v === "candidate") return "border-sky-200 bg-sky-50 text-sky-700";
  return "border-emerald-200 bg-emerald-50 text-emerald-700";
}

function openStateLabel(value?: string | null) {
  const v = String(value || "").toLowerCase();

  if (v === "closed") return "폐점";
  if (v === "paused") return "휴점";
  if (v === "candidate") return "후보";
  if (v === "operating") return "운영중";
  return value || "-";
}

function storeStatusLabel(value?: string | null) {
  const v = String(value || "").toLowerCase();

  if (v === "active") return "정상";
  if (v === "warning") return "주의";
  if (v === "paused") return "휴점";
  if (v === "closed") return "폐점";
  if (v === "candidate") return "후보";
  return value || "-";
}

function actionStatusTone(value?: string | null) {
  const v = String(value || "").toLowerCase();

  if (v === "recommended") return "border-sky-200 bg-sky-50 text-sky-700";
  if (v === "accepted") return "border-amber-200 bg-amber-50 text-amber-700";
  if (v === "in_progress") return "border-orange-200 bg-orange-50 text-orange-700";
  if (v === "done") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (v === "dismissed") return "border-slate-200 bg-slate-50 text-slate-600";
  return "border-slate-200 bg-slate-50 text-slate-700";
}

function uploadStatusTone(value?: string | null) {
  const v = String(value || "").toLowerCase();

  if (v === "completed") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (v === "completed_with_errors") return "border-amber-200 bg-amber-50 text-amber-700";
  if (v === "processing") return "border-sky-200 bg-sky-50 text-sky-700";
  if (v === "failed") return "border-red-200 bg-red-50 text-red-700";
  return "border-slate-200 bg-slate-50 text-slate-700";
}

function eventTone(value?: string | null) {
  const v = String(value || "").toLowerCase();

  if (v === "new") return "border-sky-200 bg-sky-50 text-sky-700";
  if (v === "reopened") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (v === "paused") return "border-amber-200 bg-amber-50 text-amber-700";
  if (v === "closed") return "border-red-200 bg-red-50 text-red-700";
  return "border-slate-200 bg-slate-50 text-slate-700";
}

function eventLabel(value?: string | null) {
  const v = String(value || "").toLowerCase();

  if (v === "new") return "신규";
  if (v === "reopened") return "재오픈";
  if (v === "paused") return "휴점전환";
  if (v === "closed") return "폐점전환";
  if (v === "unchanged") return "변화없음";
  return value || "-";
}

function asArray(value: unknown) {
  return Array.isArray(value) ? value : [];
}

function asRecord(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function safeNumber(value: unknown) {
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

function safeString(value: unknown) {
  if (typeof value === "string") return value;
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return "";
}

function MetricCard({
  label,
  value,
  sub,
  tone = "border-slate-200 bg-white text-slate-950",
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: string;
}) {
  return (
    <div className={`rounded-3xl border p-5 shadow-sm ${tone}`}>
      <div className="text-xs font-semibold uppercase tracking-[0.16em]">{label}</div>
      <div className="mt-3 text-3xl font-semibold tracking-tight">{value}</div>
      {sub ? <div className="mt-2 text-sm leading-6 text-slate-600">{sub}</div> : null}
    </div>
  );
}

function SectionTitle({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
      <div>
        <h2 className="text-lg font-semibold tracking-tight text-slate-950">{title}</h2>
        {description ? <p className="mt-1 text-sm text-slate-500">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}

export default async function HQStoreDetailPage({
  params,
}: {
  params: Params;
}) {
  const resolved = await params;
  const storeId = Number(resolved.storeId);

  if (!Number.isFinite(storeId)) {
    notFound();
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_hq_store_detail", {
    p_store_id: storeId,
  });

  if (error) {
    console.error("get_hq_store_detail error", error);
    notFound();
  }

  const row = Array.isArray(data) ? ((data[0] as StoreDetailRow | undefined) ?? null) : null;

  if (!row) {
    notFound();
  }

  const feature = asRecord(row.feature_snapshot);
  const reasons = asArray(row.reasons);
  const actions = asArray(row.actions);
  const runs = asArray(row.action_runs);
  const statusHistory = asArray(row.status_history);
  const uploadHistory = asArray(row.upload_history);

  return (
    <main className="min-h-screen">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
        <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl">
              <div className="text-sm font-semibold uppercase tracking-[0.18em] text-sky-700">
                HQ STORE DETAIL
              </div>

              <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
                {row.store_name}
              </h1>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                {row.brand_name} · {row.region_name || row.region_code || "-"} ·{" "}
                {row.category_name || row.category_id || "-"} · 점포코드 {row.store_code || "-"}
              </p>

              {row.summary_text ? (
                <p className="mt-4 text-sm leading-7 text-slate-600">{row.summary_text}</p>
              ) : null}

              <div className="mt-4 flex flex-wrap gap-2">
                <span
                  className={`inline-flex items-center rounded-full border px-3 py-1.5 text-sm font-semibold ${scoreTone(
                    row.store_risk_score,
                  )}`}
                >
                  위험 {formatScore(row.store_risk_score)}
                </span>

                <span
                  className={`inline-flex items-center rounded-full border px-3 py-1.5 text-sm font-semibold ${openStateTone(
                    row.open_state,
                  )}`}
                >
                  {openStateLabel(row.open_state)}
                </span>

                <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm font-semibold text-slate-700">
                  {storeStatusLabel(row.store_status)}
                </span>

                <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm font-semibold text-slate-700">
                  회생 {formatScore(row.recovery_potential_score)}
                </span>

                <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm font-semibold text-slate-700">
                  우선순위 {formatScore(row.action_priority_score)}
                </span>

                <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm text-slate-600">
                  {row.recommendation || "-"}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Link
                href="/hq/stores"
                className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                목록으로
              </Link>

              <Link
                href={`/hq/stores?brandId=${row.brand_id}`}
                className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                같은 브랜드
              </Link>

              <Link
                href={`/hq/uploads?brandId=${row.brand_id}`}
                className="inline-flex h-11 items-center justify-center rounded-xl border border-sky-300 bg-sky-50 px-4 text-sm font-semibold text-sky-700 transition hover:bg-sky-100"
              >
                업로드 보기
              </Link>

              <Link
                href={`/hq/actions?brandId=${row.brand_id}`}
                className="inline-flex h-11 items-center justify-center rounded-xl bg-slate-950 px-4 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                액션 보드
              </Link>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label="최신 분석 기준일"
            value={formatDate(row.snapshot_date)}
            sub={`상태 스냅샷 ${formatDate(row.latest_status_snapshot_date)}`}
          />
          <MetricCard
            label="개업일"
            value={formatDate(row.opened_on)}
            sub={`폐업일 ${formatDate(row.closed_on)}`}
          />
          <MetricCard
            label="최근 업로드 배치"
            value={row.latest_upload_batch_id ? `#${row.latest_upload_batch_id}` : "-"}
            sub={row.latest_upload_name || "업로드 기록 없음"}
            tone="border-sky-200 bg-sky-50 text-sky-700"
          />
          <MetricCard
            label="최근 업로드 상태"
            value={row.latest_upload_status || "-"}
            sub={formatDateTime(row.latest_upload_created_at)}
            tone={uploadStatusTone(row.latest_upload_status)}
          />
        </section>

        <section className="grid grid-cols-1 gap-6 xl:grid-cols-[1.05fr_0.95fr]">
          <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
            <SectionTitle
              title="오픈·폐점 상태 이력"
              description="최근 상태 스냅샷과 어떤 이벤트로 바뀌었는지 확인합니다."
            />

            {statusHistory.length === 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-10 text-sm text-slate-500">
                상태 이력이 없습니다.
              </div>
            ) : (
              <div className="grid gap-3">
                {statusHistory.map((item, index) => {
                  const record = asRecord(item);

                  return (
                    <div
                      key={`status-history-${index}`}
                      className="rounded-2xl border border-slate-200 bg-white p-4"
                    >
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <div className="text-base font-semibold text-slate-950">
                              기준일 {formatDate(safeString(record.snapshot_date))}
                            </div>

                            <span
                              className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${eventTone(
                                safeString(record.event_type),
                              )}`}
                            >
                              {eventLabel(safeString(record.event_type))}
                            </span>

                            <span
                              className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${openStateTone(
                                safeString(record.open_state),
                              )}`}
                            >
                              {openStateLabel(safeString(record.open_state))}
                            </span>

                            <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-600">
                              {storeStatusLabel(safeString(record.store_status))}
                            </span>
                          </div>

                          <div className="mt-2 text-sm text-slate-500">
                            {safeString(record.event_message) || "상태 메시지 없음"}
                          </div>

                          <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
                            <span>개업일 {formatDate(safeString(record.opened_on))}</span>
                            <span>폐업일 {formatDate(safeString(record.closed_on))}</span>
                            <span>
                              영업중 {record.is_open === true ? "예" : record.is_open === false ? "아니오" : "-"}
                            </span>
                          </div>
                        </div>

                        <div className="min-w-full sm:min-w-[250px]">
                          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                            <div className="text-[11px] uppercase tracking-wide text-slate-500">
                              연결 업로드 배치
                            </div>
                            <div className="mt-1 text-base font-semibold text-slate-950">
                              {safeNumber(record.batch_id) ? `#${safeNumber(record.batch_id)}` : "-"}
                            </div>
                            <div className="mt-1 text-sm text-slate-500">
                              {safeString(record.upload_name) || "연결된 업로드 없음"}
                            </div>
                            <div className="mt-2">
                              <span
                                className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${uploadStatusTone(
                                  safeString(record.upload_status),
                                )}`}
                              >
                                {safeString(record.upload_status) || "-"}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
            <SectionTitle
              title="최근 업로드 이력"
              description="이 점포가 어떤 업로드 배치에서 생성/수정되었는지 확인합니다."
            />

            {uploadHistory.length === 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-10 text-sm text-slate-500">
                업로드 이력이 없습니다.
              </div>
            ) : (
              <div className="grid gap-3">
                {uploadHistory.map((item, index) => {
                  const record = asRecord(item);

                  return (
                    <div
                      key={`upload-history-${index}`}
                      className="rounded-2xl border border-slate-200 bg-white p-4"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="text-base font-semibold text-slate-950">
                          배치 #{safeNumber(record.batch_id) ?? "-"}
                        </div>

                        <span
                          className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${uploadStatusTone(
                            safeString(record.upload_status),
                          )}`}
                        >
                          {safeString(record.upload_status) || "-"}
                        </span>

                        <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-600">
                          행 {safeNumber(record.row_no) ?? "-"}
                        </span>
                      </div>

                      <div className="mt-2 text-sm text-slate-500">
                        {safeString(record.upload_name) || "업로드명 없음"} · 기준일{" "}
                        {formatDate(safeString(record.snapshot_date))}
                      </div>

                      <div className="mt-2 text-sm text-slate-600">
                        {safeString(record.result_message) || "처리 메시지 없음"}
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
                        <span>ingest {safeString(record.ingest_status) || "-"}</span>
                        <span>dedupe {safeString(record.dedupe_key) || "-"}</span>
                        <span>업로드시각 {formatDateTime(safeString(record.created_at))}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        <section className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_1fr]">
          <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
            <SectionTitle
              title="핵심 위험 사유"
              description="이 점포가 왜 위험하거나 개입 우선순위가 높은지 설명합니다."
            />

            {reasons.length === 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-10 text-sm text-slate-500">
                위험 사유가 없습니다.
              </div>
            ) : (
              <div className="grid gap-3">
                {reasons.map((reason, index) => {
                  const record = asRecord(reason);

                  return (
                    <div
                      key={`reason-${index}`}
                      className="rounded-2xl border border-slate-200 bg-white p-4"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700">
                          #{safeNumber(record.rank_order) ?? index + 1}
                        </span>

                        <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-600">
                          {safeString(record.reason_bucket) || "reason"}
                        </span>

                        <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-600">
                          {safeString(record.direction) || "-"}
                        </span>
                      </div>

                      <div className="mt-3 text-base font-semibold text-slate-950">
                        {safeString(record.reason_label) || safeString(record.reason_code) || "사유"}
                      </div>

                      <div className="mt-2 text-sm leading-7 text-slate-600">
                        {safeString(record.description) ||
                          safeString(record.metric_value_text) ||
                          "설명 없음"}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
            <SectionTitle
              title="추천 액션"
              description="본사 / SV / 점주가 실행해야 하는 액션입니다."
            />

            {actions.length === 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-10 text-sm text-slate-500">
                액션이 없습니다.
              </div>
            ) : (
              <div className="grid gap-3">
                {actions.map((action, index) => {
                  const record = asRecord(action);

                  return (
                    <div
                      key={`action-${index}`}
                      className="rounded-2xl border border-slate-200 bg-white p-4"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="text-base font-semibold text-slate-950">
                          {safeString(record.title) || safeString(record.action_code) || "액션"}
                        </div>

                        <span
                          className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${actionStatusTone(
                            safeString(record.status),
                          )}`}
                        >
                          {safeString(record.status) || "-"}
                        </span>

                        <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-600">
                          P{safeNumber(record.priority) ?? "-"}
                        </span>

                        <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-600">
                          {safeString(record.owner_type) || "-"}
                        </span>
                      </div>

                      {safeString(record.why_text) ? (
                        <div className="mt-3 text-sm leading-7 text-slate-600">
                          {safeString(record.why_text)}
                        </div>
                      ) : null}

                      {safeString(record.playbook_text) ? (
                        <div className="mt-2 text-sm leading-7 text-slate-600">
                          {safeString(record.playbook_text)}
                        </div>
                      ) : null}

                      <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
                        <span>액션코드 {safeString(record.action_code) || "-"}</span>
                        <span>마감 {formatDate(safeString(record.due_date))}</span>
                        <span>예상효과 {safeString(record.expected_effect) || "-"}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        <section className="grid grid-cols-1 gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
            <SectionTitle
              title="핵심 지표"
              description="최근 분석 기준으로 이 점포의 주요 주변 지표를 요약합니다."
            />

            <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <div className="text-[11px] uppercase tracking-wide text-slate-500">상주인구</div>
                <div className="mt-1 text-lg font-semibold text-slate-950">
                  {formatNumber(safeNumber(feature.resident_population))}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <div className="text-[11px] uppercase tracking-wide text-slate-500">인구 12M</div>
                <div className="mt-1 text-lg font-semibold text-slate-950">
                  {formatSignedPercent(safeNumber(feature.resident_population_change_12m))}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <div className="text-[11px] uppercase tracking-wide text-slate-500">생활인구 12M</div>
                <div className="mt-1 text-lg font-semibold text-slate-950">
                  {formatSignedPercent(safeNumber(feature.living_population_change_12m))}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <div className="text-[11px] uppercase tracking-wide text-slate-500">경쟁점</div>
                <div className="mt-1 text-lg font-semibold text-slate-950">
                  {formatNumber(safeNumber(feature.direct_competitor_count))}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <div className="text-[11px] uppercase tracking-wide text-slate-500">포화지수</div>
                <div className="mt-1 text-lg font-semibold text-slate-950">
                  {formatScore(safeNumber(feature.saturation_index))}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <div className="text-[11px] uppercase tracking-wide text-slate-500">매출지수</div>
                <div className="mt-1 text-lg font-semibold text-slate-950">
                  {formatScore(safeNumber(feature.estimated_sales_index))}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <div className="text-[11px] uppercase tracking-wide text-slate-500">검색관심 30D</div>
                <div className="mt-1 text-lg font-semibold text-slate-950">
                  {formatSignedPercent(safeNumber(feature.search_interest_change_30d))}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <div className="text-[11px] uppercase tracking-wide text-slate-500">리뷰지수</div>
                <div className="mt-1 text-lg font-semibold text-slate-950">
                  {formatScore(safeNumber(feature.review_rating_index))}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <div className="text-[11px] uppercase tracking-wide text-slate-500">리뷰 90D</div>
                <div className="mt-1 text-lg font-semibold text-slate-950">
                  {formatSignedPercent(safeNumber(feature.review_volume_change_90d))}
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
            <SectionTitle
              title="액션 실행 로그"
              description="최근 액션 실행 결과와 증거를 확인합니다."
            />

            {runs.length === 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-10 text-sm text-slate-500">
                액션 실행 로그가 없습니다.
              </div>
            ) : (
              <div className="grid gap-3">
                {runs.map((run, index) => {
                  const record = asRecord(run);

                  return (
                    <div
                      key={`run-${index}`}
                      className="rounded-2xl border border-slate-200 bg-white p-4"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="text-base font-semibold text-slate-950">
                          action #{safeNumber(record.action_id) ?? "-"}
                        </div>

                        <span
                          className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${actionStatusTone(
                            safeString(record.run_status),
                          )}`}
                        >
                          {safeString(record.run_status) || "-"}
                        </span>
                      </div>

                      <div className="mt-2 text-sm text-slate-600">
                        {safeString(record.result_summary) || "결과 요약 없음"}
                      </div>

                      <div className="mt-3 text-xs text-slate-500">
                        실행시각 {formatDateTime(safeString(record.created_at))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { mutateHqActionStatusAction } from "@/app/hq/actions";

type Params = Promise<{
  storeId: string;
}>;

type SearchParams = Promise<{
  success?: string;
  error?: string;
}>;

type StoreDetailRow = {
  brand_id: number;
  brand_name: string;
  store_id: number;
  store_name: string;
  store_code: string | null;
  store_status: string | null;
  region_code: string | null;
  region_name: string | null;
  category_id: number | null;
  category_name: string | null;
  snapshot_date: string | null;
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

function scoreTone(value?: number | null) {
  const num = Number(value ?? 0);
  if (num >= 85) return "border-red-200 bg-red-50 text-red-700";
  if (num >= 70) return "border-orange-200 bg-orange-50 text-orange-700";
  if (num >= 55) return "border-amber-200 bg-amber-50 text-amber-700";
  return "border-emerald-200 bg-emerald-50 text-emerald-700";
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
  return typeof value === "string" ? value : "";
}

function getMessage(success?: string, error?: string) {
  if (success === "accepted") return "액션이 수락되었습니다.";
  if (success === "started") return "액션이 진행중으로 변경되었습니다.";
  if (success === "done") return "액션이 완료 처리되었습니다.";
  if (success === "dismissed") return "액션이 해제되었습니다.";
  if (success === "reset") return "액션이 다시 recommended 상태로 돌아갔습니다.";

  if (error === "invalid_request") return "요청 값이 올바르지 않습니다.";
  if (error === "action_not_found") return "대상 액션을 찾지 못했습니다.";
  if (error === "score_not_found") return "연결된 점수 정보를 찾지 못했습니다.";
  if (error === "accept_failed") return "액션 수락 처리에 실패했습니다.";
  if (error === "start_failed") return "액션 시작 처리에 실패했습니다.";
  if (error === "done_failed") return "액션 완료 처리에 실패했습니다.";
  if (error === "dismiss_failed") return "액션 해제 처리에 실패했습니다.";
  if (error === "reset_failed") return "액션 초기화에 실패했습니다.";
  if (error === "run_insert_failed") return "액션 실행 이력 저장에 실패했습니다.";
  if (error === "run_update_failed") return "액션 실행 이력 갱신에 실패했습니다.";
  if (error === "unknown_intent") return "알 수 없는 요청입니다.";

  return "";
}

function MetricCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{label}</div>
      <div className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">{value}</div>
      {sub ? <div className="mt-2 text-sm leading-6 text-slate-500">{sub}</div> : null}
    </div>
  );
}

function DetailActionButtons({
  actionId,
  status,
  next,
}: {
  actionId: number;
  status?: string | null;
  next: string;
}) {
  const normalized = String(status || "").toLowerCase();

  return (
    <form action={mutateHqActionStatusAction} className="mt-4 flex flex-wrap gap-2">
      <input type="hidden" name="action_id" value={actionId} />
      <input type="hidden" name="next" value={next} />

      {normalized === "recommended" ? (
        <>
          <button
            type="submit"
            name="intent"
            value="accept"
            className="inline-flex h-10 items-center justify-center rounded-xl bg-slate-950 px-4 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            수락
          </button>
          <button
            type="submit"
            name="intent"
            value="dismiss"
            className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            해제
          </button>
        </>
      ) : null}

      {normalized === "accepted" ? (
        <>
          <button
            type="submit"
            name="intent"
            value="start"
            className="inline-flex h-10 items-center justify-center rounded-xl bg-slate-950 px-4 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            시작
          </button>
          <button
            type="submit"
            name="intent"
            value="dismiss"
            className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            해제
          </button>
        </>
      ) : null}

      {normalized === "in_progress" ? (
        <>
          <button
            type="submit"
            name="intent"
            value="done"
            className="inline-flex h-10 items-center justify-center rounded-xl bg-emerald-600 px-4 text-sm font-semibold text-white transition hover:bg-emerald-700"
          >
            완료
          </button>
          <button
            type="submit"
            name="intent"
            value="dismiss"
            className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            해제
          </button>
        </>
      ) : null}

      {(normalized === "done" || normalized === "dismissed") && (
        <button
          type="submit"
          name="intent"
          value="reset"
          className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          다시 추천
        </button>
      )}
    </form>
  );
}

export default async function HQStoreDetailPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams?: SearchParams;
}) {
  const resolved = await params;
  const resolvedSearch = (await searchParams) || {};
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
  const next = `/hq/stores/${row.store_id}`;
  const message = getMessage(resolvedSearch.success, resolvedSearch.error);

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
                {row.category_name || row.category_id || "-"} · 기준일 {formatDate(row.snapshot_date)}
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
                href="/hq/actions"
                className="inline-flex h-11 items-center justify-center rounded-xl bg-slate-950 px-4 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                액션 보드
              </Link>
            </div>
          </div>
        </section>

        {message ? (
          <section
            className={`rounded-2xl border px-4 py-3 text-sm shadow-sm ${
              resolvedSearch.error
                ? "border-red-200 bg-red-50 text-red-700"
                : "border-emerald-200 bg-emerald-50 text-emerald-700"
            }`}
          >
            {message}
          </section>
        ) : null}

        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label="위험 점수"
            value={formatScore(row.store_risk_score)}
            sub={`등급 ${row.risk_grade || "-"}`}
          />
          <MetricCard
            label="회생 가능성"
            value={formatScore(row.recovery_potential_score)}
            sub={`권고 ${row.recommendation || "-"}`}
          />
          <MetricCard
            label="액션 우선순위"
            value={formatScore(row.action_priority_score)}
            sub={`점포상태 ${row.store_status || "-"}`}
          />
          <MetricCard
            label="경쟁점"
            value={formatNumber(safeNumber(feature.direct_competitor_count))}
            sub={`매출지수 ${formatScore(safeNumber(feature.estimated_sales_index))}`}
          />
        </section>

        <section className="grid grid-cols-1 gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-5">
              <h2 className="text-lg font-semibold tracking-tight text-slate-950">왜 안 되는가</h2>
              <p className="mt-1 text-sm text-slate-500">
                점포 위험에 직접 연결된 원인과 증거 수치입니다.
              </p>
            </div>

            <div className="grid gap-3">
              {reasons.length === 0 ? (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-500">
                  표시할 사유가 없습니다.
                </div>
              ) : (
                reasons.map((reason: any, index) => (
                  <div
                    key={`${reason?.reason_id || index}`}
                    className="rounded-2xl border border-slate-200 bg-white p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-base font-semibold text-slate-950">
                          {reason?.reason_label || reason?.reason_code || "사유"}
                        </div>
                        <div className="mt-1 text-sm text-slate-500">
                          {reason?.reason_bucket || "-"} · {reason?.direction || "-"}
                        </div>
                      </div>
                      <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-600">
                        #{reason?.rank_order || index + 1}
                      </span>
                    </div>

                    {(reason?.metric_key || reason?.metric_value_text) ? (
                      <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                        {reason?.metric_key ? `${reason.metric_key}: ` : ""}
                        {reason?.metric_value_text || "-"}
                      </div>
                    ) : null}
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-5">
              <h2 className="text-lg font-semibold tracking-tight text-slate-950">회생 액션</h2>
              <p className="mt-1 text-sm text-slate-500">
                본사, SV, 점주가 실행해야 할 조치입니다.
              </p>
            </div>

            <div className="grid gap-3">
              {actions.length === 0 ? (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-500">
                  표시할 액션이 없습니다.
                </div>
              ) : (
                actions.map((action: any, index) => (
                  <div
                    key={`${action?.action_id || index}`}
                    className="rounded-2xl border border-slate-200 bg-white p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-base font-semibold text-slate-950">
                          {action?.title || action?.action_code || "액션"}
                        </div>
                        <div className="mt-1 text-sm text-slate-500">
                          {action?.owner_type || "-"} · 상태 {action?.status || "-"}
                        </div>
                      </div>
                      <span className="inline-flex items-center rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700">
                        P{action?.priority || "-"}
                      </span>
                    </div>

                    {action?.why_text ? (
                      <p className="mt-3 text-sm leading-6 text-slate-600">{action.why_text}</p>
                    ) : null}

                    {action?.playbook_text ? (
                      <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm leading-6 text-slate-700">
                        {action.playbook_text}
                      </div>
                    ) : null}

                    {action?.expected_effect ? (
                      <div className="mt-3 text-sm text-slate-500">
                        예상효과: {action.expected_effect}
                      </div>
                    ) : null}

                    {action?.action_id ? (
                      <DetailActionButtons
                        actionId={Number(action.action_id)}
                        status={typeof action?.status === "string" ? action.status : null}
                        next={next}
                      />
                    ) : null}
                  </div>
                ))
              )}
            </div>
          </div>
        </section>

        <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5">
            <h2 className="text-lg font-semibold tracking-tight text-slate-950">입지·운영 지표</h2>
            <p className="mt-1 text-sm text-slate-500">
              왜 이 점포가 위험한지 설명하는 핵심 운영 지표입니다.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              label="거주인구"
              value={formatNumber(safeNumber(feature.resident_population))}
              sub={`12M ${formatSignedPercent(safeNumber(feature.resident_population_change_12m))}`}
            />
            <MetricCard
              label="생활인구"
              value={formatNumber(safeNumber(feature.living_population))}
              sub={`3M ${formatSignedPercent(safeNumber(feature.living_population_change_3m))}`}
            />
            <MetricCard
              label="접근성"
              value={formatNumber(safeNumber(feature.nearest_subway_distance_m))}
              sub={`버스 ${formatNumber(safeNumber(feature.bus_stop_count_500m))}개`}
            />
            <MetricCard
              label="건물 적합도"
              value={formatScore(safeNumber(feature.building_commercial_fit_score))}
              sub={`앵커 ${formatScore(safeNumber(feature.anchor_facility_score))}`}
            />
            <MetricCard
              label="경쟁점 수"
              value={formatNumber(safeNumber(feature.direct_competitor_count))}
              sub={`브랜드압박 ${formatScore(safeNumber(feature.competitor_brand_pressure_index))}`}
            />
            <MetricCard
              label="포화지수"
              value={formatScore(safeNumber(feature.saturation_index))}
              sub={`매출지수 ${formatScore(safeNumber(feature.estimated_sales_index))}`}
            />
            <MetricCard
              label="사업자 상태"
              value={safeString(feature.business_status) || "-"}
              sub={`이상플래그 ${String(feature.abnormal_business_flag ?? false)}`}
            />
            <MetricCard
              label="관광수요"
              value={formatScore(safeNumber(feature.tourism_demand_score))}
              sub={`날씨민감 ${formatScore(safeNumber(feature.weather_sensitivity_score))}`}
            />
          </div>
        </section>

        <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5">
            <h2 className="text-lg font-semibold tracking-tight text-slate-950">개입 결과 추적</h2>
            <p className="mt-1 text-sm text-slate-500">
              액션이 실제로 위험 점수와 매출 지표에 어떤 변화를 만들었는지 봅니다.
            </p>
          </div>

          {runs.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-500">
              아직 기록된 액션 실행 이력이 없습니다.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-[980px] text-left">
                <thead className="border-b border-slate-200 bg-slate-50 text-sm text-slate-500">
                  <tr>
                    <th className="px-4 py-3 font-medium">상태</th>
                    <th className="px-4 py-3 font-medium">시작</th>
                    <th className="px-4 py-3 font-medium">종료</th>
                    <th className="px-4 py-3 font-medium">위험 전</th>
                    <th className="px-4 py-3 font-medium">위험 후</th>
                    <th className="px-4 py-3 font-medium">매출 전</th>
                    <th className="px-4 py-3 font-medium">매출 후</th>
                    <th className="px-4 py-3 font-medium">결과 요약</th>
                  </tr>
                </thead>
                <tbody>
                  {runs.map((run: any, index) => (
                    <tr
                      key={`${run?.run_id || index}`}
                      className="border-b border-slate-100 align-top last:border-b-0"
                    >
                      <td className="px-4 py-4">{run?.run_status || "-"}</td>
                      <td className="px-4 py-4">{formatDate(run?.started_at)}</td>
                      <td className="px-4 py-4">{formatDate(run?.finished_at)}</td>
                      <td className="px-4 py-4">{formatScore(run?.before_risk_score)}</td>
                      <td className="px-4 py-4">{formatScore(run?.after_risk_score)}</td>
                      <td className="px-4 py-4">{formatScore(run?.before_sales_index)}</td>
                      <td className="px-4 py-4">{formatScore(run?.after_sales_index)}</td>
                      <td className="px-4 py-4 text-sm leading-6 text-slate-600">
                        {run?.result_summary || run?.owner_note || "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
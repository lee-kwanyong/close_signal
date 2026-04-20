import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { mutateHqActionStatusAction } from "@/app/hq/actions";

type SearchParams = Promise<{
  brandId?: string;
  status?: string;
  page?: string;
  success?: string;
  error?: string;
}>;

type BrandOption = {
  id: number;
  brand_name: string;
};

type ActionRow = {
  action_id: number;
  brand_id: number;
  brand_name: string;
  store_id: number;
  store_name: string;
  region_code: string | null;
  region_name: string | null;
  category_id: number | null;
  category_name: string | null;
  snapshot_date: string | null;
  action_code: string;
  title: string;
  why_text: string | null;
  playbook_text: string | null;
  owner_type: string | null;
  priority: number | null;
  status: string | null;
  due_date: string | null;
  expected_effect: string | null;
  store_risk_score: number | null;
  recovery_potential_score: number | null;
  action_priority_score: number | null;
  recent_run_status: string | null;
  recent_result_summary: string | null;
};

const PAGE_SIZE = 30;

function toOptionalNumber(value?: string) {
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

function toPage(value?: string) {
  const num = Number(value);
  return Number.isFinite(num) && num > 0 ? Math.floor(num) : 1;
}

function formatNumber(value?: number | null) {
  if (value === null || value === undefined || Number.isNaN(value)) return "0";
  return new Intl.NumberFormat("ko-KR").format(value);
}

function formatScore(value?: number | null) {
  if (value === null || value === undefined || Number.isNaN(value)) return "-";
  return `${Math.round(Number(value))}`;
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

function buildHref(
  basePath: string,
  params: Record<string, string | number | undefined | null>,
) {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    qs.set(key, String(value));
  });
  const query = qs.toString();
  return query ? `${basePath}?${query}` : basePath;
}

function statusTone(value?: string | null) {
  const v = String(value || "").toLowerCase();
  if (v === "recommended") return "border-sky-200 bg-sky-50 text-sky-700";
  if (v === "accepted") return "border-amber-200 bg-amber-50 text-amber-700";
  if (v === "in_progress") return "border-orange-200 bg-orange-50 text-orange-700";
  if (v === "done") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (v === "dismissed") return "border-slate-200 bg-slate-50 text-slate-600";
  return "border-slate-200 bg-slate-50 text-slate-700";
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

function ActionButtons({
  actionId,
  next,
  status,
}: {
  actionId: number;
  next: string;
  status?: string | null;
}) {
  const normalized = String(status || "").toLowerCase();

  return (
    <form action={mutateHqActionStatusAction} className="flex flex-wrap gap-2">
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

export default async function HQActionsPage({
  searchParams,
}: {
  searchParams?: SearchParams;
}) {
  const resolved = (await searchParams) || {};
  const page = toPage(resolved.page);
  const selectedBrandId = toOptionalNumber(resolved.brandId);
  const selectedStatus = (resolved.status || "").trim();
  const offset = (page - 1) * PAGE_SIZE;
  const currentHref = buildHref("/hq/actions", {
    brandId: selectedBrandId ?? undefined,
    status: selectedStatus || undefined,
    page,
  });

  const supabase = await createClient();

  const [brandsResult, actionsResult] = await Promise.all([
    supabase.from("hq_brands").select("id, brand_name").eq("is_active", true).order("brand_name"),
    supabase.rpc("get_hq_action_board", {
      p_brand_id: selectedBrandId,
      p_status: selectedStatus || null,
      p_limit: PAGE_SIZE,
      p_offset: offset,
    }),
  ]);

  const brands = (brandsResult.data || []) as BrandOption[];
  const rows = (actionsResult.data || []) as ActionRow[];

  const openCount = rows.filter((row) =>
    ["recommended", "accepted", "in_progress"].includes(String(row.status || "")),
  ).length;
  const doneCount = rows.filter((row) => String(row.status || "") === "done").length;
  const avgPriority =
    rows.length > 0 ? rows.reduce((sum, row) => sum + Number(row.priority ?? 0), 0) / rows.length : 0;

  const prevHref = buildHref("/hq/actions", {
    brandId: selectedBrandId ?? undefined,
    status: selectedStatus || undefined,
    page: page > 1 ? page - 1 : undefined,
  });

  const nextHref = buildHref("/hq/actions", {
    brandId: selectedBrandId ?? undefined,
    status: selectedStatus || undefined,
    page: rows.length === PAGE_SIZE ? page + 1 : undefined,
  });

  const message = getMessage(resolved.success, resolved.error);

  return (
    <main className="min-h-screen">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
        <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="text-sm font-semibold uppercase tracking-[0.18em] text-sky-700">
                HQ ACTION BOARD
              </div>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
                회생 액션 보드
              </h1>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                본사, SV, 점주가 어떤 액션을 언제 수행해야 하는지와 실제 개입 결과를
                같이 관리합니다.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Link
                href="/hq"
                className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                HQ 대시보드
              </Link>
              <Link
                href="/hq/stores"
                className="inline-flex h-11 items-center justify-center rounded-xl bg-slate-950 px-4 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                위험 점포 보기
              </Link>
            </div>
          </div>
        </section>

        {message ? (
          <section
            className={`rounded-2xl border px-4 py-3 text-sm shadow-sm ${
              resolved.error
                ? "border-red-200 bg-red-50 text-red-700"
                : "border-emerald-200 bg-emerald-50 text-emerald-700"
            }`}
          >
            {message}
          </section>
        ) : null}

        <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-3xl border border-sky-200 bg-sky-50 p-5 shadow-sm">
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-sky-700">
              진행중 액션
            </div>
            <div className="mt-3 text-3xl font-semibold tracking-tight text-sky-700">
              {formatNumber(openCount)}
            </div>
          </div>

          <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm">
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">
              완료 액션
            </div>
            <div className="mt-3 text-3xl font-semibold tracking-tight text-emerald-700">
              {formatNumber(doneCount)}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              평균 우선순위
            </div>
            <div className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
              {formatScore(avgPriority)}
            </div>
          </div>
        </section>

        <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
          <form className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                브랜드
              </label>
              <select
                name="brandId"
                defaultValue={selectedBrandId ? String(selectedBrandId) : ""}
                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none"
              >
                <option value="">전체 브랜드</option>
                {brands.map((brand) => (
                  <option key={brand.id} value={brand.id}>
                    {brand.brand_name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                상태
              </label>
              <select
                name="status"
                defaultValue={selectedStatus}
                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none"
              >
                <option value="">전체</option>
                <option value="recommended">recommended</option>
                <option value="accepted">accepted</option>
                <option value="in_progress">in_progress</option>
                <option value="done">done</option>
                <option value="dismissed">dismissed</option>
              </select>
            </div>

            <div className="md:col-span-2 flex items-end gap-2">
              <button
                type="submit"
                className="inline-flex h-[50px] flex-1 items-center justify-center rounded-2xl bg-slate-950 px-4 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                적용
              </button>
              <Link
                href="/hq/actions"
                className="inline-flex h-[50px] flex-1 items-center justify-center rounded-2xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                초기화
              </Link>
            </div>
          </form>
        </section>

        <section className="grid gap-4">
          {rows.length === 0 ? (
            <div className="rounded-[28px] border border-slate-200 bg-white px-6 py-10 text-sm text-slate-500 shadow-sm">
              표시할 액션이 없습니다.
            </div>
          ) : (
            rows.map((row) => (
              <div
                key={row.action_id}
                className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm"
              >
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-lg font-semibold tracking-tight text-slate-950">
                        {row.title}
                      </h2>
                      <span
                        className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${statusTone(
                          row.status,
                        )}`}
                      >
                        {row.status || "-"}
                      </span>
                      <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700">
                        P{row.priority ?? "-"}
                      </span>
                      <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-600">
                        {row.owner_type || "-"}
                      </span>
                    </div>

                    <div className="mt-2 text-sm text-slate-500">
                      {row.brand_name} · {row.store_name} · {row.region_name || row.region_code || "-"} ·{" "}
                      {row.category_name || row.category_id || "-"} · 기준일 {formatDate(row.snapshot_date)}
                    </div>

                    {row.why_text ? (
                      <p className="mt-4 text-sm leading-7 text-slate-600">{row.why_text}</p>
                    ) : null}

                    {row.playbook_text ? (
                      <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm leading-7 text-slate-700">
                        {row.playbook_text}
                      </div>
                    ) : null}

                    <div className="mt-4 flex flex-wrap gap-3 text-sm text-slate-500">
                      <span>액션코드 {row.action_code}</span>
                      <span>마감 {formatDate(row.due_date)}</span>
                      <span>최근실행 {row.recent_run_status || "-"}</span>
                    </div>

                    {row.recent_result_summary ? (
                      <div className="mt-3 text-sm text-slate-600">
                        최근 결과: {row.recent_result_summary}
                      </div>
                    ) : null}

                    {row.expected_effect ? (
                      <div className="mt-2 text-sm text-slate-600">
                        예상 효과: {row.expected_effect}
                      </div>
                    ) : null}

                    <div className="mt-4">
                      <ActionButtons
                        actionId={row.action_id}
                        status={row.status}
                        next={currentHref}
                      />
                    </div>
                  </div>

                  <div className="grid min-w-full grid-cols-2 gap-3 sm:min-w-[340px] sm:grid-cols-3 xl:min-w-[420px]">
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                      <div className="text-[11px] uppercase tracking-wide text-slate-500">
                        위험 점수
                      </div>
                      <div className="mt-1 text-lg font-semibold text-slate-950">
                        {formatScore(row.store_risk_score)}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                      <div className="text-[11px] uppercase tracking-wide text-slate-500">
                        회생 가능성
                      </div>
                      <div className="mt-1 text-lg font-semibold text-slate-950">
                        {formatScore(row.recovery_potential_score)}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                      <div className="text-[11px] uppercase tracking-wide text-slate-500">
                        액션 우선순위
                      </div>
                      <div className="mt-1 text-lg font-semibold text-slate-950">
                        {formatScore(row.action_priority_score)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </section>

        <section className="flex items-center justify-between gap-3">
          <Link
            href={prevHref}
            aria-disabled={page <= 1}
            className={`inline-flex h-11 items-center justify-center rounded-xl px-4 text-sm font-semibold transition ${
              page <= 1
                ? "pointer-events-none border border-slate-200 text-slate-300"
                : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
            }`}
          >
            이전
          </Link>
          <div className="text-sm text-slate-500">페이지 {page}</div>
          <Link
            href={nextHref}
            aria-disabled={rows.length < PAGE_SIZE}
            className={`inline-flex h-11 items-center justify-center rounded-xl px-4 text-sm font-semibold transition ${
              rows.length < PAGE_SIZE
                ? "pointer-events-none border border-slate-200 text-slate-300"
                : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
            }`}
          >
            다음
          </Link>
        </section>
      </div>
    </main>
  );
}
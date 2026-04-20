import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

type Params = Promise<{
  batchId: string;
}>;

type SearchParams = Promise<{
  status?: string;
  page?: string;
}>;

type BatchRow = {
  id: number;
  brand_id: number;
  upload_name: string | null;
  source_kind: string | null;
  upload_status: string | null;
  snapshot_date: string | null;
  total_rows: number | null;
  success_rows: number | null;
  failed_rows: number | null;
  created_store_count: number | null;
  updated_store_count: number | null;
  skipped_store_count: number | null;
  meta: unknown;
  created_at: string | null;
  updated_at: string | null;
};

type BrandRow = {
  id: number;
  brand_name: string;
};

type UploadRow = {
  id: number;
  batch_id: number;
  brand_id: number;
  row_no: number;
  dedupe_key: string | null;
  raw_payload: unknown;
  normalized_payload: unknown;
  ingest_status: string | null;
  result_message: string | null;
  hq_store_id: number | null;
  created_at: string | null;
};

type StoreRow = {
  id: number;
  store_name: string;
  store_code: string | null;
};

const PAGE_SIZE = 50;

function toPage(value?: string) {
  const num = Number(value);
  return Number.isFinite(num) && num > 0 ? Math.floor(num) : 1;
}

function formatNumber(value?: number | null) {
  if (value === null || value === undefined || Number.isNaN(value)) return "0";
  return new Intl.NumberFormat("ko-KR").format(value);
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

function batchStatusTone(value?: string | null) {
  const v = String(value || "").toLowerCase();

  if (v === "completed") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (v === "completed_with_errors") return "border-amber-200 bg-amber-50 text-amber-700";
  if (v === "processing") return "border-sky-200 bg-sky-50 text-sky-700";
  if (v === "failed") return "border-red-200 bg-red-50 text-red-700";

  return "border-slate-200 bg-slate-50 text-slate-700";
}

function rowStatusTone(value?: string | null) {
  const v = String(value || "").toLowerCase();

  if (v === "success") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (v === "failed") return "border-red-200 bg-red-50 text-red-700";
  if (v === "skipped") return "border-amber-200 bg-amber-50 text-amber-700";
  if (v === "pending") return "border-sky-200 bg-sky-50 text-sky-700";

  return "border-slate-200 bg-slate-50 text-slate-700";
}

function asRecord(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function prettyJson(value: unknown, maxLength = 2400) {
  if (value === null || value === undefined) return "-";

  try {
    const text = JSON.stringify(value, null, 2);
    if (!text) return "-";
    if (text.length <= maxLength) return text;
    return `${text.slice(0, maxLength)}\n...`;
  } catch {
    return String(value);
  }
}

function StatusFilterChip({
  href,
  label,
  active,
}: {
  href: string;
  label: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={`inline-flex h-10 items-center justify-center rounded-xl px-4 text-sm font-semibold transition ${
        active
          ? "border border-slate-950 bg-slate-950 text-white"
          : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
      }`}
    >
      {label}
    </Link>
  );
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

export default async function HQUploadBatchDetailPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams?: SearchParams;
}) {
  const resolvedParams = await params;
  const resolvedSearch = (await searchParams) || {};

  const batchId = Number(resolvedParams.batchId);
  const page = toPage(resolvedSearch.page);
  const selectedStatus = (resolvedSearch.status || "").trim().toLowerCase();
  const offset = (page - 1) * PAGE_SIZE;

  if (!Number.isFinite(batchId) || batchId <= 0) {
    notFound();
  }

  const supabase = await createClient();

  const batchResult = await supabase
    .from("hq_store_upload_batches")
    .select("*")
    .eq("id", batchId)
    .single();

  if (batchResult.error || !batchResult.data) {
    notFound();
  }

  const batch = batchResult.data as BatchRow;

  const [brandResult, rowsResult] = await Promise.all([
    supabase
      .from("hq_brands")
      .select("id, brand_name")
      .eq("id", batch.brand_id)
      .single(),
    (() => {
      let query = supabase
        .from("hq_store_upload_rows")
        .select(
          "id, batch_id, brand_id, row_no, dedupe_key, raw_payload, normalized_payload, ingest_status, result_message, hq_store_id, created_at",
        )
        .eq("batch_id", batchId)
        .order("row_no", { ascending: true })
        .range(offset, offset + PAGE_SIZE - 1);

      if (selectedStatus) {
        query = query.eq("ingest_status", selectedStatus);
      }

      return query;
    })(),
  ]);

  const brand = (brandResult.data || null) as BrandRow | null;
  const rows = (rowsResult.data || []) as UploadRow[];

  const storeIds = Array.from(
    new Set(
      rows
        .map((row) => row.hq_store_id)
        .filter((value): value is number => Number.isFinite(value as number) && Number(value) > 0),
    ),
  );

  let storesById = new Map<number, StoreRow>();

  if (storeIds.length > 0) {
    const storesResult = await supabase
      .from("hq_stores")
      .select("id, store_name, store_code")
      .in("id", storeIds);

    const stores = (storesResult.data || []) as StoreRow[];
    storesById = new Map(stores.map((store) => [store.id, store]));
  }

  const meta = asRecord(batch.meta);

  const prevHref = buildHref(`/hq/uploads/${batchId}`, {
    status: selectedStatus || undefined,
    page: page > 1 ? page - 1 : undefined,
  });

  const nextHref = buildHref(`/hq/uploads/${batchId}`, {
    status: selectedStatus || undefined,
    page: rows.length === PAGE_SIZE ? page + 1 : undefined,
  });

  const allHref = buildHref(`/hq/uploads/${batchId}`, {});
  const successHref = buildHref(`/hq/uploads/${batchId}`, { status: "success" });
  const failedHref = buildHref(`/hq/uploads/${batchId}`, { status: "failed" });
  const skippedHref = buildHref(`/hq/uploads/${batchId}`, { status: "skipped" });

  return (
    <main className="min-h-screen">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
        <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl">
              <div className="text-sm font-semibold uppercase tracking-[0.18em] text-sky-700">
                HQ UPLOAD BATCH DETAIL
              </div>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
                {batch.upload_name || `업로드 배치 #${batch.id}`}
              </h1>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                {brand?.brand_name || `브랜드 #${batch.brand_id}`} · 기준일{" "}
                {formatDate(batch.snapshot_date)} · 생성시각 {formatDateTime(batch.created_at)}
              </p>

              <div className="mt-4 flex flex-wrap gap-2">
                <span
                  className={`inline-flex items-center rounded-full border px-3 py-1.5 text-sm font-semibold ${batchStatusTone(
                    batch.upload_status,
                  )}`}
                >
                  {batch.upload_status || "-"}
                </span>
                <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm font-semibold text-slate-700">
                  batch #{batch.id}
                </span>
                <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm text-slate-600">
                  source {batch.source_kind || "-"}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Link
                href={buildHref("/hq/uploads", { brandId: batch.brand_id })}
                className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                업로드 목록
              </Link>
              <Link
                href={buildHref("/hq/stores", { brandId: batch.brand_id })}
                className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                점포 보기
              </Link>
              <Link
                href="/hq"
                className="inline-flex h-11 items-center justify-center rounded-xl bg-slate-950 px-4 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                HQ 대시보드
              </Link>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label="총 행"
            value={formatNumber(batch.total_rows)}
            sub={`현재 페이지 ${formatNumber(rows.length)}행`}
          />
          <MetricCard
            label="성공"
            value={formatNumber(batch.success_rows)}
            sub={`실패 ${formatNumber(batch.failed_rows)}행`}
            tone="border-emerald-200 bg-emerald-50 text-emerald-700"
          />
          <MetricCard
            label="생성 점포"
            value={formatNumber(batch.created_store_count)}
            sub={`업데이트 ${formatNumber(batch.updated_store_count)}행`}
            tone="border-sky-200 bg-sky-50 text-sky-700"
          />
          <MetricCard
            label="스킵"
            value={formatNumber(batch.skipped_store_count)}
            sub={`마지막 갱신 ${formatDateTime(batch.updated_at)}`}
            tone="border-amber-200 bg-amber-50 text-amber-700"
          />
        </section>

        <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="text-lg font-semibold tracking-tight text-slate-950">
                행 상태 필터
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                성공 / 실패 / 스킵 행을 나눠서 바로 확인합니다.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <StatusFilterChip href={allHref} label="전체" active={!selectedStatus} />
              <StatusFilterChip
                href={successHref}
                label={`성공 ${formatNumber(batch.success_rows)}`}
                active={selectedStatus === "success"}
              />
              <StatusFilterChip
                href={failedHref}
                label={`실패 ${formatNumber(batch.failed_rows)}`}
                active={selectedStatus === "failed"}
              />
              <StatusFilterChip
                href={skippedHref}
                label={`스킵 ${formatNumber(batch.skipped_store_count)}`}
                active={selectedStatus === "skipped"}
              />
            </div>
          </div>

          {rows.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-10 text-sm text-slate-500">
              표시할 행이 없습니다.
            </div>
          ) : (
            <div className="grid gap-3">
              {rows.map((row) => {
                const linkedStore =
                  row.hq_store_id && storesById.has(row.hq_store_id)
                    ? storesById.get(row.hq_store_id) || null
                    : null;

                return (
                  <div
                    key={row.id}
                    className="rounded-2xl border border-slate-200 bg-white p-5"
                  >
                    <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="text-base font-semibold text-slate-950">
                            행 #{row.row_no}
                          </div>

                          <span
                            className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${rowStatusTone(
                              row.ingest_status,
                            )}`}
                          >
                            {row.ingest_status || "-"}
                          </span>

                          {row.hq_store_id ? (
                            <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-600">
                              store #{row.hq_store_id}
                            </span>
                          ) : null}
                        </div>

                        <div className="mt-2 text-sm text-slate-600">
                          {row.result_message || "처리 메시지 없음"}
                        </div>

                        <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-500">
                          <span>dedupe {row.dedupe_key || "-"}</span>
                          <span>기록시각 {formatDateTime(row.created_at)}</span>
                        </div>

                        {linkedStore ? (
                          <div className="mt-4">
                            <Link
                              href={`/hq/stores/${linkedStore.id}`}
                              className="inline-flex items-center rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-sm font-semibold text-sky-700 transition hover:bg-sky-100"
                            >
                              연결 점포: {linkedStore.store_name}
                              {linkedStore.store_code ? ` (${linkedStore.store_code})` : ""}
                            </Link>
                          </div>
                        ) : null}
                      </div>

                      <div className="grid min-w-full gap-3 xl:min-w-[430px]">
                        <details className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                          <summary className="cursor-pointer list-none text-sm font-semibold text-slate-900">
                            normalized payload 보기
                          </summary>
                          <pre className="mt-3 overflow-x-auto whitespace-pre-wrap break-words text-xs leading-6 text-slate-600">
                            {prettyJson(row.normalized_payload)}
                          </pre>
                        </details>

                        <details className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                          <summary className="cursor-pointer list-none text-sm font-semibold text-slate-900">
                            raw payload 보기
                          </summary>
                          <pre className="mt-3 overflow-x-auto whitespace-pre-wrap break-words text-xs leading-6 text-slate-600">
                            {prettyJson(row.raw_payload)}
                          </pre>
                        </details>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className="grid grid-cols-1 gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold tracking-tight text-slate-950">
              배치 메타
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              업로더, 스냅샷 요약 등 배치 메타를 그대로 확인합니다.
            </p>

            <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <pre className="overflow-x-auto whitespace-pre-wrap break-words text-xs leading-6 text-slate-600">
                {prettyJson(meta)}
              </pre>
            </div>
          </div>

          <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold tracking-tight text-slate-950">
              페이지 이동
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              실패 행이 많은 배치도 페이지 단위로 계속 확인할 수 있습니다.
            </p>

            <div className="mt-6 flex items-center justify-between gap-3">
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
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
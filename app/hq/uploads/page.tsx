import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

type SearchParams = Promise<{
  brandId?: string;
}>;

type BrandOption = {
  id: number;
  brand_name: string;
};

type BatchRow = {
  id: number;
  brand_id: number;
  upload_name: string | null;
  upload_status: string | null;
  snapshot_date: string | null;
  total_rows: number | null;
  success_rows: number | null;
  failed_rows: number | null;
  created_store_count: number | null;
  updated_store_count: number | null;
  skipped_store_count: number | null;
  created_at: string | null;
  meta?: unknown;
};

type SnapshotEventRow = {
  brand_id: number;
  snapshot_date: string | null;
  event_type: string | null;
  open_state: string | null;
};

type SnapshotEventSummary = {
  snapshotDate: string;
  newCount: number;
  reopenedCount: number;
  pausedCount: number;
  closedCount: number;
  unchangedCount: number;
};

function toOptionalNumber(value?: string) {
  const num = Number(value);
  return Number.isFinite(num) && num > 0 ? num : null;
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

function eventTone(label: "new" | "reopened" | "paused" | "closed") {
  if (label === "new") return "border-sky-200 bg-sky-50 text-sky-700";
  if (label === "reopened") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (label === "paused") return "border-amber-200 bg-amber-50 text-amber-700";
  return "border-red-200 bg-red-50 text-red-700";
}

function aggregateSnapshotEvents(rows: SnapshotEventRow[]) {
  const map = new Map<string, SnapshotEventSummary>();

  rows.forEach((row) => {
    const snapshotDate = row.snapshot_date || "unknown";

    const current = map.get(snapshotDate) || {
      snapshotDate,
      newCount: 0,
      reopenedCount: 0,
      pausedCount: 0,
      closedCount: 0,
      unchangedCount: 0,
    };

    const eventType = String(row.event_type || "").toLowerCase();

    if (eventType === "new") current.newCount += 1;
    else if (eventType === "reopened") current.reopenedCount += 1;
    else if (eventType === "paused") current.pausedCount += 1;
    else if (eventType === "closed") current.closedCount += 1;
    else current.unchangedCount += 1;

    map.set(snapshotDate, current);
  });

  return [...map.values()].sort((a, b) => {
    if (a.snapshotDate === "unknown") return 1;
    if (b.snapshotDate === "unknown") return -1;
    return a.snapshotDate < b.snapshotDate ? 1 : -1;
  });
}

function StatCard({
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
      {sub ? <div className="mt-2 text-sm text-slate-600">{sub}</div> : null}
    </div>
  );
}

export default async function HQUploadsPage({
  searchParams,
}: {
  searchParams?: SearchParams;
}) {
  const resolved = (await searchParams) || {};
  const selectedBrandId = toOptionalNumber(resolved.brandId);
  const supabase = await createClient();

  let brands: BrandOption[] = [];
  let batches: BatchRow[] = [];
  let snapshotEvents: SnapshotEventRow[] = [];

  const brandsResult = await supabase
    .from("hq_brands")
    .select("id, brand_name")
    .eq("is_active", true)
    .order("brand_name");

  if (!brandsResult.error) {
    brands = (brandsResult.data || []) as BrandOption[];
  }

  let batchesQuery = supabase
    .from("hq_store_upload_batches")
    .select(
      "id, brand_id, upload_name, upload_status, snapshot_date, total_rows, success_rows, failed_rows, created_store_count, updated_store_count, skipped_store_count, created_at, meta",
    )
    .order("created_at", { ascending: false })
    .limit(12);

  if (selectedBrandId) {
    batchesQuery = batchesQuery.eq("brand_id", selectedBrandId);
  }

  const batchesResult = await batchesQuery;
  if (!batchesResult.error) {
    batches = (batchesResult.data || []) as BatchRow[];
  }

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 21);
  const cutoffDate = cutoff.toISOString().slice(0, 10);

  let snapshotQuery = supabase
    .from("hq_store_status_snapshots")
    .select("brand_id, snapshot_date, event_type, open_state")
    .gte("snapshot_date", cutoffDate)
    .order("snapshot_date", { ascending: false })
    .limit(400);

  if (selectedBrandId) {
    snapshotQuery = snapshotQuery.eq("brand_id", selectedBrandId);
  }

  const snapshotResult = await snapshotQuery;
  if (!snapshotResult.error) {
    snapshotEvents = (snapshotResult.data || []) as SnapshotEventRow[];
  }

  const brandsById = new Map<number, string>();
  brands.forEach((brand) => brandsById.set(brand.id, brand.brand_name));

  const eventGroups = aggregateSnapshotEvents(snapshotEvents).slice(0, 10);
  const latestEventGroup = eventGroups[0] || null;
  const latestBatch = batches[0] || null;

  return (
    <main className="min-h-screen">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
        <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <div className="text-sm font-semibold uppercase tracking-[0.18em] text-sky-700">
                HQ STORE UPLOADS
              </div>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
                본사 점포 업로드 배치
              </h1>
              <p className="mt-3 text-sm leading-7 text-slate-600 sm:text-base">
                최근 업로드 배치, 성공/실패 행 수, 그리고 오픈·폐점 스냅샷 전환을
                한 번에 확인합니다.
              </p>

              <div className="mt-5 flex flex-wrap gap-2">
                <Link
                  href="/hq"
                  className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  HQ 대시보드
                </Link>
                <Link
                  href={buildHref("/hq/stores", { brandId: selectedBrandId ?? undefined })}
                  className="inline-flex h-11 items-center justify-center rounded-xl bg-slate-950 px-4 text-sm font-semibold text-white transition hover:bg-slate-800"
                >
                  위험 점포 보기
                </Link>
              </div>
            </div>

            <form className="grid w-full max-w-md grid-cols-1 gap-3 sm:grid-cols-[1fr_auto_auto]">
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  브랜드 필터
                </label>
                <select
                  name="brandId"
                  defaultValue={selectedBrandId ? String(selectedBrandId) : ""}
                  className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none"
                >
                  <option value="">전체 브랜드</option>
                  {brands.map((brand) => (
                    <option key={brand.id} value={brand.id}>
                      {brand.brand_name}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                className="mt-auto inline-flex h-[50px] items-center justify-center rounded-2xl bg-sky-600 px-5 text-sm font-semibold text-white transition hover:bg-sky-700"
              >
                적용
              </button>

              <Link
                href="/hq/uploads"
                className="mt-auto inline-flex h-[50px] items-center justify-center rounded-2xl border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                초기화
              </Link>
            </form>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="최근 업로드 배치"
            value={formatNumber(batches.length)}
            sub={selectedBrandId ? "선택 브랜드 기준 최근 12건" : "전체 브랜드 기준 최근 12건"}
            tone="border-sky-200 bg-sky-50 text-sky-700"
          />
          <StatCard
            label="최신 기준일"
            value={formatDate(latestBatch?.snapshot_date)}
            sub={
              latestBatch
                ? `${brandsById.get(latestBatch.brand_id) || `브랜드 #${latestBatch.brand_id}`}`
                : "업로드 배치 없음"
            }
            tone="border-slate-200 bg-white text-slate-950"
          />
          <StatCard
            label="최근 폐점 전환"
            value={formatNumber(latestEventGroup?.closedCount)}
            sub={latestEventGroup ? `기준일 ${formatDate(latestEventGroup.snapshotDate)}` : "데이터 없음"}
            tone="border-red-200 bg-red-50 text-red-700"
          />
          <StatCard
            label="최근 재오픈"
            value={formatNumber(latestEventGroup?.reopenedCount)}
            sub={latestEventGroup ? `기준일 ${formatDate(latestEventGroup.snapshotDate)}` : "데이터 없음"}
            tone="border-emerald-200 bg-emerald-50 text-emerald-700"
          />
        </section>

        <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5">
            <h2 className="text-lg font-semibold tracking-tight text-slate-950">
              최근 업로드 배치
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              최근에 들어온 ingest 실행 결과와 생성/업데이트 건수를 같이 봅니다.
            </p>
          </div>

          {batches.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-10 text-sm text-slate-500">
              표시할 업로드 배치가 없습니다.
            </div>
          ) : (
            <div className="grid gap-3">
              {batches.map((batch) => {
                const brandName = brandsById.get(batch.brand_id) || `브랜드 #${batch.brand_id}`;

                return (
                  <div
                    key={batch.id}
                    className="rounded-2xl border border-slate-200 bg-white p-5"
                  >
                    <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-base font-semibold text-slate-950">
                            {batch.upload_name || `업로드 #${batch.id}`}
                          </h3>
                          <span
                            className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${batchStatusTone(
                              batch.upload_status,
                            )}`}
                          >
                            {batch.upload_status || "-"}
                          </span>
                        </div>

                        <div className="mt-2 text-sm text-slate-500">
                          {brandName} · 기준일 {formatDate(batch.snapshot_date)} · 실행시각{" "}
                          {formatDateTime(batch.created_at)}
                        </div>

                        <div className="mt-4 flex flex-wrap gap-2">
                          <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-600">
                            총 {formatNumber(batch.total_rows)}행
                          </span>
                          <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                            성공 {formatNumber(batch.success_rows)}
                          </span>
                          <span className="inline-flex items-center rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-semibold text-red-700">
                            실패 {formatNumber(batch.failed_rows)}
                          </span>
                        </div>

                        <div className="mt-4 flex flex-wrap gap-2">
                          <Link
                            href={`/hq/uploads/${batch.id}`}
                            className="inline-flex h-10 items-center justify-center rounded-xl bg-slate-950 px-4 text-sm font-semibold text-white transition hover:bg-slate-800"
                          >
                            배치 상세
                          </Link>

                          <Link
                            href={buildHref("/hq/stores", { brandId: batch.brand_id })}
                            className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                          >
                            점포 보기
                          </Link>
                        </div>
                      </div>

                      <div className="grid min-w-full grid-cols-2 gap-3 sm:min-w-[340px] sm:grid-cols-3">
                        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                          <div className="text-[11px] uppercase tracking-wide text-slate-500">
                            생성
                          </div>
                          <div className="mt-1 text-lg font-semibold text-slate-950">
                            {formatNumber(batch.created_store_count)}
                          </div>
                        </div>

                        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                          <div className="text-[11px] uppercase tracking-wide text-slate-500">
                            업데이트
                          </div>
                          <div className="mt-1 text-lg font-semibold text-slate-950">
                            {formatNumber(batch.updated_store_count)}
                          </div>
                        </div>

                        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                          <div className="text-[11px] uppercase tracking-wide text-slate-500">
                            스킵
                          </div>
                          <div className="mt-1 text-lg font-semibold text-slate-950">
                            {formatNumber(batch.skipped_store_count)}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5">
            <h2 className="text-lg font-semibold tracking-tight text-slate-950">
              최근 스냅샷 전환 요약
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              업로드 이후 기준일별로 신규 / 재오픈 / 휴점 / 폐점 전환 건수를 빠르게 봅니다.
            </p>
          </div>

          {eventGroups.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-10 text-sm text-slate-500">
              표시할 스냅샷 전환 데이터가 없습니다.
            </div>
          ) : (
            <div className="grid gap-3">
              {eventGroups.map((group) => (
                <div
                  key={group.snapshotDate}
                  className="rounded-2xl border border-slate-200 bg-white p-5"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <div className="text-base font-semibold text-slate-950">
                        기준일 {formatDate(group.snapshotDate)}
                      </div>
                      <div className="mt-1 text-sm text-slate-500">
                        변동 합계{" "}
                        {formatNumber(
                          group.newCount +
                            group.reopenedCount +
                            group.pausedCount +
                            group.closedCount,
                        )}
                        건
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                      <div className={`rounded-2xl border px-4 py-3 ${eventTone("new")}`}>
                        <div className="text-[11px] uppercase tracking-wide">신규</div>
                        <div className="mt-1 text-lg font-semibold">{formatNumber(group.newCount)}</div>
                      </div>

                      <div className={`rounded-2xl border px-4 py-3 ${eventTone("reopened")}`}>
                        <div className="text-[11px] uppercase tracking-wide">재오픈</div>
                        <div className="mt-1 text-lg font-semibold">
                          {formatNumber(group.reopenedCount)}
                        </div>
                      </div>

                      <div className={`rounded-2xl border px-4 py-3 ${eventTone("paused")}`}>
                        <div className="text-[11px] uppercase tracking-wide">휴점</div>
                        <div className="mt-1 text-lg font-semibold">{formatNumber(group.pausedCount)}</div>
                      </div>

                      <div className={`rounded-2xl border px-4 py-3 ${eventTone("closed")}`}>
                        <div className="text-[11px] uppercase tracking-wide">폐점</div>
                        <div className="mt-1 text-lg font-semibold">{formatNumber(group.closedCount)}</div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
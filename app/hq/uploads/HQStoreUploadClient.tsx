"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type BrandOption = {
  id: number;
  brand_name: string;
};

type RowResult = {
  rowNo: number;
  status: "success" | "failed" | "skipped";
  action: "created" | "updated" | "skipped" | null;
  storeId: number | null;
  message: string;
  dedupeKey: string | null;
};

type SnapshotSummary = {
  inserted_count: number;
  new_count: number;
  reopened_count: number;
  paused_count: number;
  closed_count: number;
  unchanged_count: number;
};

type UploadResult = {
  batchId: number;
  brandId: number;
  uploadName: string | null;
  totalRows: number;
  successRows: number;
  failedRows: number;
  createdStores: number;
  updatedStores: number;
  skippedStores: number;
  snapshot: SnapshotSummary | null;
  rowResults: RowResult[];
};

type UploadResponse =
  | {
      ok: true;
      result: UploadResult;
    }
  | {
      ok: false;
      error?: string;
    };

function formatNumber(value?: number | null) {
  if (value === null || value === undefined || Number.isNaN(value)) return "0";
  return new Intl.NumberFormat("ko-KR").format(value);
}

export default function HQStoreUploadClient({
  brands,
  initialBrandId,
  today,
}: {
  brands: BrandOption[];
  initialBrandId: string;
  today: string;
}) {
  const router = useRouter();

  const [brandId, setBrandId] = useState(initialBrandId);
  const [snapshotDate, setSnapshotDate] = useState(today);
  const [uploadedBy, setUploadedBy] = useState("hq-admin");
  const [rawText, setRawText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [fileInputKey, setFileInputKey] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<UploadResult | null>(null);

  const failedRows = useMemo(
    () => (result?.rowResults || []).filter((row) => row.status === "failed").slice(0, 10),
    [result],
  );

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!brandId) {
      setError("브랜드를 선택해줘.");
      return;
    }

    if (!file && !rawText.trim()) {
      setError("업로드 파일 또는 rawText 중 하나는 필요해.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("brandId", brandId);
      formData.append("snapshotDate", snapshotDate);
      formData.append("uploadedBy", uploadedBy);

      if (file) {
        formData.append("file", file);
      } else {
        formData.append("rawText", rawText);
      }

      const response = await fetch("/api/hq/uploads/stores", {
        method: "POST",
        body: formData,
      });

      const json = (await response.json().catch(() => null)) as UploadResponse | null;

      if (!response.ok || !json || !json.ok) {
        throw new Error(
          (json && "error" in json && json.error) || "점포 업로드 ingest 중 오류가 발생했어.",
        );
      }

      setResult(json.result);
      router.refresh();

      if (!file) return;

      setFile(null);
      setFileInputKey((prev) => prev + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "알 수 없는 오류가 발생했어.");
    } finally {
      setSubmitting(false);
    }
  }

  const sampleText = `storeName,address,storeCode,storeStatus,openedOn,businessNumber
강남점,서울 강남구 테헤란로 1,GN001,active,2026-04-01,123-45-67890
홍대점,서울 마포구 양화로 10,HD001,closed,2024-06-01,234-56-78901`;

  return (
    <div className="space-y-5">
      <form onSubmit={handleSubmit} className="grid gap-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
              브랜드
            </label>
            <select
              value={brandId}
              onChange={(event) => setBrandId(event.target.value)}
              className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none"
            >
              <option value="">브랜드 선택</option>
              {brands.map((brand) => (
                <option key={brand.id} value={brand.id}>
                  {brand.brand_name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
              기준일
            </label>
            <input
              type="date"
              value={snapshotDate}
              onChange={(event) => setSnapshotDate(event.target.value)}
              className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none"
            />
          </div>
        </div>

        <div>
          <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
            업로더
          </label>
          <input
            value={uploadedBy}
            onChange={(event) => setUploadedBy(event.target.value)}
            placeholder="예: hq-admin"
            className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none"
          />
        </div>

        <div>
          <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
            업로드 파일
          </label>
          <input
            key={fileInputKey}
            type="file"
            accept=".csv,.tsv,.xlsx,.xls,.xlsb,.txt"
            onChange={(event) => {
              const nextFile = event.target.files?.[0] || null;
              setFile(nextFile);
            }}
            className="block w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none file:mr-4 file:rounded-xl file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-slate-700"
          />
          <div className="mt-2 text-xs text-slate-500">
            CSV / TSV / XLSX 가능. 파일이 있으면 rawText보다 파일이 우선 처리된다.
          </div>
        </div>

        <div>
          <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
            rawText 붙여넣기
          </label>
          <textarea
            value={rawText}
            onChange={(event) => setRawText(event.target.value)}
            rows={8}
            placeholder={sampleText}
            className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none"
          />
        </div>

        {error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <button
            type="submit"
            disabled={submitting}
            className={`inline-flex h-12 items-center justify-center rounded-2xl px-5 text-sm font-semibold text-white transition ${
              submitting ? "bg-slate-400" : "bg-sky-600 hover:bg-sky-700"
            }`}
          >
            {submitting ? "업로드 중..." : "점포 업로드 실행"}
          </button>

          <button
            type="button"
            onClick={() => {
              setFile(null);
              setFileInputKey((prev) => prev + 1);
              setRawText("");
              setError(null);
              setResult(null);
            }}
            className="inline-flex h-12 items-center justify-center rounded-2xl border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            입력 초기화
          </button>
        </div>
      </form>

      {result ? (
        <div className="space-y-4 rounded-[28px] border border-slate-200 bg-slate-50 p-5">
          <div>
            <div className="text-sm font-semibold uppercase tracking-[0.16em] text-sky-700">
              LAST RESULT
            </div>
            <h3 className="mt-2 text-xl font-semibold tracking-tight text-slate-950">
              배치 #{result.batchId} 업로드 완료
            </h3>
            <div className="mt-2 text-sm text-slate-500">
              총 {formatNumber(result.totalRows)}행 중 성공 {formatNumber(result.successRows)}행,
              실패 {formatNumber(result.failedRows)}행
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3">
              <div className="text-[11px] uppercase tracking-wide text-emerald-700">생성</div>
              <div className="mt-1 text-lg font-semibold text-emerald-700">
                {formatNumber(result.createdStores)}
              </div>
            </div>

            <div className="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3">
              <div className="text-[11px] uppercase tracking-wide text-sky-700">업데이트</div>
              <div className="mt-1 text-lg font-semibold text-sky-700">
                {formatNumber(result.updatedStores)}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
              <div className="text-[11px] uppercase tracking-wide text-slate-500">스킵</div>
              <div className="mt-1 text-lg font-semibold text-slate-950">
                {formatNumber(result.skippedStores)}
              </div>
            </div>

            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3">
              <div className="text-[11px] uppercase tracking-wide text-red-700">실패</div>
              <div className="mt-1 text-lg font-semibold text-red-700">
                {formatNumber(result.failedRows)}
              </div>
            </div>
          </div>

          {result.snapshot ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="text-sm font-semibold text-slate-950">스냅샷 생성 결과</div>
              <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-6">
                <div>
                  <div className="text-[11px] uppercase tracking-wide text-slate-500">전체</div>
                  <div className="mt-1 font-semibold text-slate-950">
                    {formatNumber(result.snapshot.inserted_count)}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] uppercase tracking-wide text-slate-500">신규</div>
                  <div className="mt-1 font-semibold text-slate-950">
                    {formatNumber(result.snapshot.new_count)}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] uppercase tracking-wide text-slate-500">재오픈</div>
                  <div className="mt-1 font-semibold text-slate-950">
                    {formatNumber(result.snapshot.reopened_count)}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] uppercase tracking-wide text-slate-500">휴점</div>
                  <div className="mt-1 font-semibold text-slate-950">
                    {formatNumber(result.snapshot.paused_count)}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] uppercase tracking-wide text-slate-500">폐점</div>
                  <div className="mt-1 font-semibold text-slate-950">
                    {formatNumber(result.snapshot.closed_count)}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] uppercase tracking-wide text-slate-500">변화없음</div>
                  <div className="mt-1 font-semibold text-slate-950">
                    {formatNumber(result.snapshot.unchanged_count)}
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          {failedRows.length > 0 ? (
            <div className="rounded-2xl border border-red-200 bg-white p-4">
              <div className="text-sm font-semibold text-slate-950">실패 행 미리보기</div>
              <div className="mt-3 space-y-2">
                {failedRows.map((row) => (
                  <div
                    key={`failed-row-${row.rowNo}`}
                    className="rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700"
                  >
                    <span className="font-semibold">행 {row.rowNo}</span>
                    <span className="ml-2">{row.message}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
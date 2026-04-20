import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/close-signal/supabase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteParams = Promise<{
  batchId: string;
}>;

type BatchRow = {
  id: number;
  brand_id: number;
  upload_name: string | null;
  upload_status: string | null;
  snapshot_date: string | null;
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

function asRecord(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function asString(value: unknown) {
  if (typeof value === "string") return value;
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  if (typeof value === "boolean") return value ? "true" : "false";
  return "";
}

function sanitizeFilename(value: string) {
  return value
    .trim()
    .replace(/[<>:"/\\|?*\u0000-\u001F]+/g, "-")
    .replace(/\s+/g, "_")
    .replace(/-+/g, "-")
    .replace(/^[-_.]+|[-_.]+$/g, "");
}

function escapeCsvCell(value: unknown) {
  const text = asString(value).replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  return `"${text.replace(/"/g, '""')}"`;
}

function jsonText(value: unknown) {
  try {
    return JSON.stringify(value ?? {}, null, 0);
  } catch {
    return "";
  }
}

function csvLine(values: unknown[]) {
  return values.map(escapeCsvCell).join(",");
}

function resolveRequestedStatus(raw: string | null) {
  const value = String(raw || "").trim().toLowerCase();

  if (value === "success") return "success";
  if (value === "failed") return "failed";
  if (value === "skipped") return "skipped";
  if (value === "pending") return "pending";

  return null;
}

export async function GET(
  request: Request,
  { params }: { params: RouteParams },
) {
  try {
    const { batchId: batchIdParam } = await params;
    const batchId = Number(batchIdParam);

    if (!Number.isFinite(batchId) || batchId <= 0) {
      return NextResponse.json(
        {
          ok: false,
          error: "유효한 batchId가 필요합니다.",
        },
        { status: 400 },
      );
    }

    const url = new URL(request.url);
    const status = resolveRequestedStatus(url.searchParams.get("status"));

    const supabase = createSupabaseAdmin();

    const batchResult = await supabase
      .from("hq_store_upload_batches")
      .select("id, brand_id, upload_name, upload_status, snapshot_date")
      .eq("id", batchId)
      .single();

    if (batchResult.error || !batchResult.data) {
      return NextResponse.json(
        {
          ok: false,
          error: "업로드 배치를 찾지 못했습니다.",
        },
        { status: 404 },
      );
    }

    const batch = batchResult.data as BatchRow;

    let rowsQuery = supabase
      .from("hq_store_upload_rows")
      .select(
        "id, batch_id, brand_id, row_no, dedupe_key, raw_payload, normalized_payload, ingest_status, result_message, hq_store_id, created_at",
      )
      .eq("batch_id", batchId)
      .order("row_no", { ascending: true });

    if (status) {
      rowsQuery = rowsQuery.eq("ingest_status", status);
    }

    const rowsResult = await rowsQuery;

    if (rowsResult.error) {
      return NextResponse.json(
        {
          ok: false,
          error: rowsResult.error.message,
        },
        { status: 500 },
      );
    }

    const rows = (rowsResult.data || []) as UploadRow[];

    const storeIds = Array.from(
      new Set(
        rows
          .map((row) => row.hq_store_id)
          .filter(
            (value): value is number =>
              typeof value === "number" && Number.isFinite(value) && value > 0,
          ),
      ),
    );

    let storesById = new Map<number, StoreRow>();

    if (storeIds.length > 0) {
      const storesResult = await supabase
        .from("hq_stores")
        .select("id, store_name, store_code")
        .in("id", storeIds);

      if (!storesResult.error) {
        const stores = (storesResult.data || []) as StoreRow[];
        storesById = new Map(stores.map((store) => [store.id, store]));
      }
    }

    const header = [
      "batch_id",
      "brand_id",
      "upload_name",
      "upload_status",
      "snapshot_date",
      "row_no",
      "ingest_status",
      "result_message",
      "dedupe_key",
      "hq_store_id",
      "linked_store_name",
      "linked_store_code",
      "created_at",
      "normalized_externalStoreId",
      "normalized_storeCode",
      "normalized_storeName",
      "normalized_storeStatus",
      "normalized_openedOn",
      "normalized_closedOn",
      "normalized_businessNumber",
      "normalized_address",
      "normalized_roadAddress",
      "normalized_regionCode",
      "normalized_regionName",
      "raw_storeName",
      "raw_address",
      "raw_storeCode",
      "raw_storeStatus",
      "raw_openedOn",
      "raw_closedOn",
      "raw_businessNumber",
      "raw_json",
      "normalized_json",
    ];

    const bodyLines = rows.map((row) => {
      const normalized = asRecord(row.normalized_payload);
      const raw = asRecord(row.raw_payload);
      const linkedStore =
        row.hq_store_id && storesById.has(row.hq_store_id)
          ? storesById.get(row.hq_store_id) || null
          : null;

      return csvLine([
        batch.id,
        batch.brand_id,
        batch.upload_name || "",
        batch.upload_status || "",
        batch.snapshot_date || "",
        row.row_no,
        row.ingest_status || "",
        row.result_message || "",
        row.dedupe_key || "",
        row.hq_store_id || "",
        linkedStore?.store_name || "",
        linkedStore?.store_code || "",
        row.created_at || "",
        normalized.externalStoreId,
        normalized.storeCode,
        normalized.storeName,
        normalized.storeStatus,
        normalized.openedOn,
        normalized.closedOn,
        normalized.businessNumber,
        normalized.address,
        normalized.roadAddress,
        normalized.regionCode,
        normalized.regionName,
        raw.storeName,
        raw.address,
        raw.storeCode,
        raw.storeStatus,
        raw.openedOn,
        raw.closedOn,
        raw.businessNumber,
        jsonText(row.raw_payload),
        jsonText(row.normalized_payload),
      ]);
    });

    const csv = ["\uFEFF" + csvLine(header), ...bodyLines].join("\n");

    const baseName = sanitizeFilename(
      batch.upload_name || `hq-upload-batch-${batch.id}`,
    );
    const suffix = status ? `-${status}` : "-all";
    const datePart = batch.snapshot_date || "snapshot";
    const filename = `${baseName}${suffix}-${datePart}.csv`;

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "업로드 배치 CSV export 중 오류가 발생했습니다.",
      },
      { status: 500 },
    );
  }
}
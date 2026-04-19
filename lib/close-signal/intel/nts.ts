type UnknownRecord = Record<string, unknown>;

export type NormalizedNtsStatus =
  | "active"
  | "closed"
  | "suspended"
  | "unknown";

export type NtsStatusLike =
  | string
  | null
  | undefined
  | {
      status?: unknown;
      b_stt?: unknown;
      b_stt_cd?: unknown;
      tax_type?: unknown;
      taxType?: unknown;
      closure?: unknown;
      suspended?: unknown;
      휴업상태?: unknown;
      폐업여부?: unknown;
      폐업일?: unknown;
      휴업일?: unknown;
      [key: string]: unknown;
    };

export type BusinessStatusResult = {
  ok: boolean;
  businessNumber: string | null;
  rawStatus: string | null;
  rawTaxType: string | null;
  normalizedStatus: NormalizedNtsStatus;
  statusLabel: string;
  taxTypeLabel: string | null;
  closed: boolean;
  suspended: boolean;
  active: boolean;
  source: "nts_api" | "mock" | "unavailable";
  raw: unknown;
};

function asRecord(value: unknown): UnknownRecord {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as UnknownRecord)
    : {};
}

function asArray<T = unknown>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function text(...values: unknown[]): string | null {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
    if (typeof value === "boolean") return value ? "true" : "false";
  }
  return null;
}

function digitsOnly(value: unknown) {
  return String(value ?? "").replace(/\D/g, "").trim();
}

function includesAny(source: string, needles: string[]) {
  return needles.some((needle) => source.includes(needle));
}

function normalizeRawStatusString(value: string | null | undefined): NormalizedNtsStatus {
  const raw = String(value ?? "")
    .trim()
    .toLowerCase();

  if (!raw) return "unknown";

  if (
    includesAny(raw, [
      "폐업",
      "closed",
      "closure",
      "휴업폐업",
      "사업종료",
      "말소",
      "cancelled",
      "canceled",
      "종료",
    ])
  ) {
    return "closed";
  }

  if (
    includesAny(raw, [
      "휴업",
      "suspend",
      "suspended",
      "일시중단",
      "중지",
      "pause",
    ])
  ) {
    return "suspended";
  }

  if (
    includesAny(raw, [
      "계속",
      "정상",
      "active",
      "open",
      "영업",
      "운영",
      "사업중",
      "등록",
      "과세",
      "면세",
    ])
  ) {
    return "active";
  }

  return "unknown";
}

export function normalizeNtsStatus(input: NtsStatusLike): NormalizedNtsStatus {
  if (typeof input === "string" || input == null) {
    return normalizeRawStatusString(input);
  }

  const row = asRecord(input);

  const directStatus = text(
    row.status,
    row.b_stt,
    row.b_stt_cd,
    row.tax_type,
    row.taxType,
    row["사업자상태"],
    row["사업자 상태"],
    row["상태"],
    row["납세자상태"],
    row["과세유형"],
  );

  const direct = normalizeRawStatusString(directStatus);
  if (direct !== "unknown") return direct;

  const closure = text(row.closure, row["폐업여부"], row["폐업 여부"], row["폐업"]);
  if (closure) {
    const normalizedClosure = closure.toLowerCase();
    if (includesAny(normalizedClosure, ["y", "yes", "true", "1", "폐업", "closed"])) {
      return "closed";
    }
  }

  const suspended = text(
    row.suspended,
    row["휴업상태"],
    row["휴업 상태"],
    row["휴업여부"],
    row["휴업 여부"],
    row["휴업"],
  );
  if (suspended) {
    const normalizedSuspended = suspended.toLowerCase();
    if (includesAny(normalizedSuspended, ["y", "yes", "true", "1", "휴업", "suspend"])) {
      return "suspended";
    }
  }

  const closedAt = text(
    row["폐업일"],
    row.closed_at,
    row.closedAt,
    row.closure_date,
    row.closureDate,
  );
  if (closedAt) return "closed";

  const suspendedAt = text(
    row["휴업일"],
    row.suspended_at,
    row.suspendedAt,
    row.pause_date,
    row.pauseDate,
  );
  if (suspendedAt) return "suspended";

  return "unknown";
}

export function isNtsClosed(input: NtsStatusLike) {
  return normalizeNtsStatus(input) === "closed";
}

export function isNtsSuspended(input: NtsStatusLike) {
  return normalizeNtsStatus(input) === "suspended";
}

export function isNtsActive(input: NtsStatusLike) {
  return normalizeNtsStatus(input) === "active";
}

export function ntsStatusLabel(input: NtsStatusLike) {
  const normalized = normalizeNtsStatus(input);

  switch (normalized) {
    case "active":
      return "정상 영업";
    case "closed":
      return "폐업";
    case "suspended":
      return "휴업";
    case "unknown":
    default:
      return "확인 필요";
  }
}

function taxTypeLabel(value: string | null) {
  const raw = String(value ?? "").trim();
  return raw || null;
}

function firstRecordCandidate(root: UnknownRecord) {
  const candidates: unknown[] = [
    ...asArray(root.data),
    ...asArray(root.items),
    ...asArray(root.result),
    ...asArray(root.results),
    ...asArray(root.response),
    ...asArray(asRecord(root.body).items),
  ];

  return asRecord(candidates[0] ?? root);
}

function parseNtsApiRow(raw: unknown, businessNumber?: string | null): BusinessStatusResult {
  const root = asRecord(raw);
  const row = firstRecordCandidate(root);

  const rawStatus = text(
    row.b_stt,
    row.status,
    row.b_stt_cd,
    row["사업자상태"],
    row["상태"],
  );

  const rawTaxType = text(
    row.tax_type,
    row.taxType,
    row["과세유형"],
    row["납세자상태"],
  );

  const normalizedStatus = normalizeNtsStatus({
    ...row,
    status: rawStatus,
    tax_type: rawTaxType,
  });

  return {
    ok: true,
    businessNumber: digitsOnly(
      businessNumber ??
        row.b_no ??
        row.business_number ??
        row.businessNumber,
    ) || null,
    rawStatus,
    rawTaxType,
    normalizedStatus,
    statusLabel: ntsStatusLabel(normalizedStatus),
    taxTypeLabel: taxTypeLabel(rawTaxType),
    closed: normalizedStatus === "closed",
    suspended: normalizedStatus === "suspended",
    active: normalizedStatus === "active",
    source: "nts_api",
    raw,
  };
}

function buildMockBusinessStatus(businessNumber?: string | null): BusinessStatusResult {
  const normalizedStatus: NormalizedNtsStatus = "unknown";

  return {
    ok: true,
    businessNumber: digitsOnly(businessNumber) || null,
    rawStatus: null,
    rawTaxType: null,
    normalizedStatus,
    statusLabel: ntsStatusLabel(normalizedStatus),
    taxTypeLabel: null,
    closed: false,
    suspended: false,
    active: false,
    source: "mock",
    raw: null,
  };
}

export async function fetchBusinessStatus(
  businessNumber?: string | null,
): Promise<BusinessStatusResult> {
  const normalizedBusinessNumber = digitsOnly(businessNumber);

  if (!normalizedBusinessNumber) {
    return {
      ok: false,
      businessNumber: null,
      rawStatus: null,
      rawTaxType: null,
      normalizedStatus: "unknown",
      statusLabel: "확인 필요",
      taxTypeLabel: null,
      closed: false,
      suspended: false,
      active: false,
      source: "unavailable",
      raw: null,
    };
  }

  const serviceKey =
    process.env.NTS_API_SERVICE_KEY ||
    process.env.NTS_SERVICE_KEY ||
    process.env.BUSINESS_STATUS_SERVICE_KEY;

  const baseUrl =
    process.env.NTS_API_BASE_URL ||
    "https://api.odcloud.kr/api/nts-businessman/v1/status";

  if (!serviceKey) {
    return buildMockBusinessStatus(normalizedBusinessNumber);
  }

  try {
    const response = await fetch(
      `${baseUrl}?serviceKey=${encodeURIComponent(serviceKey)}`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          b_no: [normalizedBusinessNumber],
        }),
        cache: "no-store",
      },
    );

    const rawText = await response.text();
    let parsed: unknown = null;

    try {
      parsed = rawText ? JSON.parse(rawText) : null;
    } catch {
      parsed = { rawText };
    }

    if (!response.ok) {
      return {
        ok: false,
        businessNumber: normalizedBusinessNumber,
        rawStatus: null,
        rawTaxType: null,
        normalizedStatus: "unknown",
        statusLabel: "확인 필요",
        taxTypeLabel: null,
        closed: false,
        suspended: false,
        active: false,
        source: "unavailable",
        raw: parsed,
      };
    }

    return parseNtsApiRow(parsed, normalizedBusinessNumber);
  } catch (error) {
    return {
      ok: false,
      businessNumber: normalizedBusinessNumber,
      rawStatus: null,
      rawTaxType: null,
      normalizedStatus: "unknown",
      statusLabel: "확인 필요",
      taxTypeLabel: null,
      closed: false,
      suspended: false,
      active: false,
      source: "unavailable",
      raw: error instanceof Error ? { message: error.message } : error,
    };
  }
}
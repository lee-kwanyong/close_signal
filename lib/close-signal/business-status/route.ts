import { NextRequest, NextResponse } from "next/server";
import { fetchBusinessStatus } from "@/lib/close-signal/intel/nts";

function normalizeStatusLabel(rawStatus: string | null, taxType: string | null) {
  const status = String(rawStatus ?? "").trim();
  const tax = String(taxType ?? "").trim();

  if (status.includes("폐업")) return "폐업";
  if (status.includes("휴업")) return "휴업";
  if (status.includes("정상") || status.includes("계속")) return "정상 영업";
  if (tax) return tax;
  return "확인 필요";
}

function normalizeNtsStatus(
  result: Awaited<ReturnType<typeof fetchBusinessStatus>>,
  businessNumber: string,
) {
  const raw = (result.raw ?? {}) as Record<string, unknown>;
  const rawStatus = result.rawStatus;
  const taxType = result.rawTaxType;
  const statusLabel = normalizeStatusLabel(rawStatus, taxType);

  return {
    ok: result.ok,
    businessNumber: result.businessNumber ?? businessNumber,
    status: rawStatus,
    taxType,
    statusLabel,
    normalizedStatus: result.normalizedStatus,
    closed: result.closed,
    suspended: result.suspended,
    active: result.active,
    source: result.source,
    raw,
  };
}

export async function GET(request: NextRequest) {
  try {
    const businessNumber =
      request.nextUrl.searchParams.get("businessNumber") ??
      request.nextUrl.searchParams.get("b_no") ??
      "";

    const normalizedBusinessNumber = businessNumber.replace(/\D/g, "");

    if (!normalizedBusinessNumber) {
      return NextResponse.json(
        {
          ok: false,
          message: "businessNumber가 필요합니다.",
        },
        { status: 400 },
      );
    }

    const result = await fetchBusinessStatus(normalizedBusinessNumber);
    const payload = normalizeNtsStatus(result, normalizedBusinessNumber);

    return NextResponse.json(payload);
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message:
          error instanceof Error
            ? error.message
            : "business-status 처리 중 오류가 발생했습니다.",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const businessNumber = String(
      body?.businessNumber ?? body?.b_no ?? "",
    ).replace(/\D/g, "");

    if (!businessNumber) {
      return NextResponse.json(
        {
          ok: false,
          message: "businessNumber가 필요합니다.",
        },
        { status: 400 },
      );
    }

    const result = await fetchBusinessStatus(businessNumber);
    const payload = normalizeNtsStatus(result, businessNumber);

    return NextResponse.json(payload);
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message:
          error instanceof Error
            ? error.message
            : "business-status 처리 중 오류가 발생했습니다.",
      },
      { status: 500 },
    );
  }
}
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type NtsStatusItem = {
  b_no?: string;
  b_stt?: string;
  b_stt_cd?: string;
  tax_type?: string;
  tax_type_cd?: string;
  end_dt?: string;
  utcc_yn?: string;
  tax_type_change_dt?: string;
  invoice_apply_dt?: string;
};

function normalizeBusinessNumber(input: string) {
  return String(input || "").replace(/\D/g, "").slice(0, 10);
}

function normalizeText(value?: string | null) {
  return String(value || "").replace(/\s/g, "").trim();
}

function json(body: Record<string, unknown>, status = 200) {
  return NextResponse.json(body, { status });
}

function mapBusinessStatus(item?: NtsStatusItem | null) {
  const raw = item?.b_stt || "";
  const value = normalizeText(raw);

  if (value.includes("폐업")) {
    return { code: "closed", label: "폐업" };
  }

  if (value.includes("휴업")) {
    return { code: "suspended", label: "휴업사업자" };
  }

  if (value.includes("계속")) {
    return { code: "active", label: "일반사업자" };
  }

  return { code: "unknown", label: raw || "확인필요" };
}

function getBusinessTypeLabel(item?: NtsStatusItem | null) {
  const rawStatus = normalizeText(item?.b_stt);
  const taxType = normalizeText(item?.tax_type);
  const simpleYn = normalizeText(item?.utcc_yn).toUpperCase();

  if (rawStatus.includes("폐업")) return "폐업";
  if (rawStatus.includes("휴업")) return "휴업사업자";
  if (taxType.includes("법인")) return "법인사업자";
  if (taxType.includes("간이") || simpleYn === "Y") return "간이사업자";
  if (taxType.includes("일반")) return "일반사업자";
  if (taxType.includes("면세")) return "면세사업자";
  if (rawStatus.includes("계속")) return "일반사업자";

  return "확인필요";
}

function getDisplayStatusLabel(item?: NtsStatusItem | null) {
  const rawStatus = normalizeText(item?.b_stt);
  const taxType = normalizeText(item?.tax_type);
  const simpleYn = normalizeText(item?.utcc_yn).toUpperCase();

  if (rawStatus.includes("폐업")) return "폐업";
  if (rawStatus.includes("휴업")) return "휴업사업자";
  if (taxType.includes("법인")) return "법인사업자";
  if (taxType.includes("간이") || simpleYn === "Y") return "간이사업자";
  if (taxType.includes("일반")) return "일반사업자";
  if (taxType.includes("면세")) return "면세사업자";
  if (rawStatus.includes("계속")) return "일반사업자";

  return item?.b_stt || "확인필요";
}

function pickStatusItem(parsed: any): NtsStatusItem | null {
  if (Array.isArray(parsed?.data) && parsed.data[0]) return parsed.data[0];
  if (Array.isArray(parsed?.items) && parsed.items[0]) return parsed.items[0];
  if (Array.isArray(parsed?.result) && parsed.result[0]) return parsed.result[0];
  return null;
}

export async function GET() {
  return json(
    {
      ok: false,
      error: "GET은 지원되지 않습니다. POST로 요청해주세요.",
    },
    405
  );
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const businessNumberRaw = String(body?.businessNumber ?? "");
    const businessNumber = normalizeBusinessNumber(businessNumberRaw);

    if (businessNumber.length !== 10) {
      return json(
        {
          ok: false,
          error: "사업자번호는 숫자 10자리여야 합니다.",
        },
        400
      );
    }

    const apiUrl = process.env.NTS_STATUS_API_URL;
    const serviceKey = process.env.NTS_SERVICE_KEY;

    if (!apiUrl || !serviceKey) {
      return json(
        {
          ok: false,
          error: "국세청 사업자조회 환경변수가 설정되지 않았습니다.",
        },
        500
      );
    }

    const url = new URL(apiUrl);
    url.searchParams.set("serviceKey", serviceKey);
    url.searchParams.set("returnType", "JSON");

    const response = await fetch(url.toString(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      cache: "no-store",
      body: JSON.stringify({
        b_no: [businessNumber],
      }),
    });

    const rawText = await response.text();

    let parsed: any = null;
    try {
      parsed = JSON.parse(rawText);
    } catch {
      return json(
        {
          ok: false,
          error: "국세청 응답을 JSON으로 해석하지 못했습니다.",
          raw: rawText,
        },
        502
      );
    }

    if (!response.ok) {
      return json(
        {
          ok: false,
          error: "국세청 사업자조회 응답이 비정상입니다.",
          status: response.status,
          raw: parsed,
        },
        502
      );
    }

    const item = pickStatusItem(parsed);

    if (!item) {
      return json(
        {
          ok: false,
          error: "사업자 상태 데이터를 찾지 못했습니다.",
          raw: parsed,
        },
        404
      );
    }

    const mapped = mapBusinessStatus(item);
    const businessTypeLabel = getBusinessTypeLabel(item);
    const displayStatusLabel = getDisplayStatusLabel(item);

    return json({
      ok: true,
      input: businessNumber,
      result: {
        businessNumber,
        statusCode: mapped.code,
        statusLabel: displayStatusLabel,
        businessTypeLabel,
        rawStatus: item?.b_stt ?? displayStatusLabel,
        taxType: item?.tax_type ?? null,
        taxTypeCode: item?.tax_type_cd ?? null,
        closureDate: item?.end_dt ?? null,
        simpleTaxpayerYn: item?.utcc_yn ?? null,
        taxTypeChangedAt: item?.tax_type_change_dt ?? null,
        invoiceApplyDate: item?.invoice_apply_dt ?? null,
        raw: item,
      },
    });
  } catch (error) {
    return json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "알 수 없는 오류",
      },
      500
    );
  }
}
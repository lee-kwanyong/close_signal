import { NextResponse } from "next/server";

export const runtime = "nodejs";

function onlyDigits(value: string): string {
  return value.replace(/\D/g, "");
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      businessNumber?: string;
      plan?: string;
    };

    const businessNumber = onlyDigits(body.businessNumber ?? "");
    const plan = body.plan ?? "growth-care-basic";
    const sessionId = crypto.randomUUID();

    const params = new URLSearchParams({
      sessionId,
      plan,
    });

    if (businessNumber) {
      params.set("businessNumber", businessNumber);
    }

    return NextResponse.json({
      success: true,
      data: {
        sessionId,
        plan,
        businessNumber: businessNumber || null,
        checkoutUrl: `/care-program/checkout?${params.toString()}`,
      },
    });
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "CARE_PROGRAM_START_FAILED",
          message: "2차 케어 프로그램 시작 중 오류가 발생했습니다.",
        },
      },
      {
        status: 500,
      }
    );
  }
}
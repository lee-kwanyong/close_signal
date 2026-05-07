import { createHash, randomUUID } from "node:crypto";
import { NextResponse } from "next/server";

import {
  createCustomer,
  createEvent,
  db,
  upsertStoreProfile,
} from "@/lib/db/repositories";
import { runGrowthSignalEngine } from "@/lib/engine/run";

export const runtime = "nodejs";
export const maxDuration = 300;

const REVIEW_PLATFORM_LABELS: Record<string, string> = {
  baemin: "배달의민족",
  yogiyo: "요기요",
  coupang_eats: "쿠팡이츠",
  naver: "네이버 플레이스",
  kakao: "카카오맵",
  google: "구글 비즈니스",
};

function onlyDigits(value: string | null | undefined): string {
  return (value ?? "").replace(/\D/g, "");
}

function normalizeText(value: string | null | undefined): string | null {
  const normalized = value?.trim();

  if (!normalized) {
    return null;
  }

  return normalized;
}

function normalizePlatform(value: string | null | undefined): string | null {
  const normalized = normalizeText(value);

  if (!normalized) {
    return null;
  }

  return normalized in REVIEW_PLATFORM_LABELS ? normalized : null;
}

function hashBusinessNumber(businessNumber: string): string | null {
  const normalized = onlyDigits(businessNumber);

  if (!normalized) {
    return null;
  }

  const secret =
    process.env.BUSINESS_NUMBER_HASH_SECRET ?? "growth-signal-local-dev";

  return createHash("sha256")
    .update(`${secret}:${normalized}`)
    .digest("hex");
}

function getLast4(value: string): string | null {
  const normalized = onlyDigits(value);

  if (!normalized) {
    return null;
  }

  return normalized.slice(-4);
}

function buildFallbackBusinessName(storeName: string | null): string {
  return storeName ?? "Growth Care 신청 매장";
}

async function findExistingCustomerByBusinessNumberHash(
  businessNumberHash: string | null
) {
  if (!businessNumberHash) {
    return null;
  }

  const client = db() as any;

  const { data, error } = await client
    .from("customer")
    .select("customer_id,business_name")
    .eq("business_number_hash", businessNumberHash)
    .order("created_at", {
      ascending: false,
    })
    .limit(1);

  if (error) {
    throw new Error(error.message);
  }

  return data?.[0] ?? null;
}

async function upsertCareLead(params: {
  sessionId: string;
  payload: Record<string, unknown>;
}) {
  const client = db() as any;

  const { data, error } = await client
    .from("care_program_leads")
    .upsert(
      {
        session_id: params.sessionId,
        ...params.payload,
      },
      {
        onConflict: "session_id",
      }
    )
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function POST(request: Request) {
  const startedAt = new Date().toISOString();

  let sessionIdForFailure: string | null = null;
  let leadIdForFailure: string | null = null;

  try {
    const body = (await request.json()) as {
      businessNumber?: string;
      sessionId?: string;
      plan?: string;
      storeName?: string;
      ownerName?: string;
      contact?: string;
      source?: string;
      reviewPlatform?: string;
      reviewAccountIdentifier?: string;
    };

    const businessNumber = onlyDigits(body.businessNumber);
    const sessionId = normalizeText(body.sessionId) ?? `care_${randomUUID()}`;
    sessionIdForFailure = sessionId;

    const plan = normalizeText(body.plan) ?? "growth-care-basic";

    const storeName = normalizeText(body.storeName);
    const ownerName = normalizeText(body.ownerName);
    const contact = normalizeText(body.contact);

    const reviewPlatform = normalizePlatform(body.reviewPlatform);
    const reviewPlatformLabel = reviewPlatform
      ? REVIEW_PLATFORM_LABELS[reviewPlatform]
      : null;

    const reviewAccountIdentifier = normalizeText(
      body.reviewAccountIdentifier
    );

    const businessNumberHash = businessNumber
      ? hashBusinessNumber(businessNumber)
      : null;

    const businessNumberLast4 = businessNumber
      ? getLast4(businessNumber)
      : null;

    /**
     * 중요:
     * createEvent의 entity_id에는 UUID가 들어가야 한다.
     * sessionId는 text라서 넣으면 invalid input syntax for type uuid 에러가 난다.
     * 그래서 먼저 care_program_leads를 upsert하고, 반환된 id(UUID)를 이벤트 entity_id로 사용한다.
     */
    const activatingLead = await upsertCareLead({
      sessionId,
      payload: {
        plan,
        payment_status: "demo_paid",
        care_status: "activating",
        activation_status: "activating",

        business_number_hash: businessNumberHash,
        business_number_last4: businessNumberLast4,

        store_name: storeName,
        owner_name: ownerName,
        contact,

        review_platform: reviewPlatform,
        review_platform_label: reviewPlatformLabel,
        review_account_identifier: reviewAccountIdentifier,
        reviewer_connected: Boolean(reviewAccountIdentifier),

        source: normalizeText(body.source) ?? "care_program_demo_checkout",
        activated_at: startedAt,

        metadata: {
          requestedAt: startedAt,
          hasBusinessNumber: Boolean(businessNumber),
          hasReviewAccountIdentifier: Boolean(reviewAccountIdentifier),
          requestedSteps: [
            "create_or_find_customer",
            "create_store_profile",
            "run_growth_signal",
            "redirect_growth_report",
          ],
        },
      },
    });

    const careLeadId = activatingLead.id as string;
    leadIdForFailure = careLeadId;

    const existingCustomer = await findExistingCustomerByBusinessNumberHash(
      businessNumberHash
    );

    const customer =
      existingCustomer ??
      (await createCustomer({
        business_number: businessNumber || undefined,
        business_name: buildFallbackBusinessName(storeName),
        owner_name: ownerName ?? undefined,
        industry_group: "unknown",
        industry_name: "미분류",
        store_count: 1,
      }));

    const customerId = customer.customer_id as string;

    await upsertStoreProfile(customerId, {
      store_type: "offline",
      main_channel: "growth_signal",
      customer_goal: "2차 케어 프로그램 시작",
      target_customer: "소상공인 고객",
      main_products: null,
      differentiation_keywords: [
        "growth-care",
        "reviewer",
        "risk-check",
        reviewPlatform ?? "no-review-platform",
      ],
      avg_monthly_sales_self_reported: null,
      avg_ticket_size_self_reported: null,
      employee_count: null,
    } as any);

    await createEvent(
      customerId,
      "CARE_PROGRAM_STARTED",
      "care_program_leads",
      careLeadId,
      null,
      {
        plan,
        session_id: sessionId,
        business_number_last4: businessNumberLast4,
        review_platform: reviewPlatform,
        review_account_identifier: reviewAccountIdentifier,
        source: "care_program_complete_api",
      }
    );

    const runResult = await runGrowthSignalEngine(customerId, {
      createSprint: true,
      scoreVersion: "growth-care-demo-v1",
    });

    const growthReportUrl = `/customers/${customerId}/growth-report`;

    const updatedLead = await upsertCareLead({
      sessionId,
      payload: {
        id: careLeadId,

        plan,
        payment_status: "demo_paid",
        care_status: "started",
        activation_status: "growth_report_created",
        activation_error: null,

        customer_id: customerId,
        score_id: runResult.score_id,
        growth_report_url: growthReportUrl,

        business_number_hash: businessNumberHash,
        business_number_last4: businessNumberLast4,
        store_name: storeName,
        owner_name: ownerName,
        contact,

        review_platform: reviewPlatform,
        review_platform_label: reviewPlatformLabel,
        review_account_identifier: reviewAccountIdentifier,
        reviewer_connected: Boolean(reviewAccountIdentifier),

        growth_report_created: true,
        cs_queue_created: false,

        metadata: {
          completedAt: new Date().toISOString(),
          customerId,
          scoreId: runResult.score_id,
          sprintId: runResult.sprint_id,
          missionCount: runResult.mission_count,
          reviewPlatform,
          reviewAccountIdentifier,
          nextSteps: [
            "connect_reviewer",
            "create_cs_queue",
            "monitor_growth_report",
          ],
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        leadId: updatedLead.id,
        sessionId,
        plan,
        paymentStatus: updatedLead.payment_status,
        careStatus: updatedLead.care_status,
        activationStatus: updatedLead.activation_status,

        customerId,
        scoreId: runResult.score_id,
        sprintId: runResult.sprint_id,
        missionCount: runResult.mission_count,

        businessNumberLast4,
        storeName,

        reviewPlatform,
        reviewPlatformLabel,
        reviewAccountIdentifier,

        growthReportUrl,
        nextUrl: `/care-program/started?leadId=${updatedLead.id}&customerId=${customerId}`,
      },
    });
  } catch (error) {
    console.error("[care-program/complete] failed", error);

    try {
      await upsertCareLead({
        sessionId: sessionIdForFailure ?? `care_${randomUUID()}`,
        payload: {
          ...(leadIdForFailure ? { id: leadIdForFailure } : {}),
          care_status: "activation_failed",
          activation_status: "failed",
          activation_error:
            error instanceof Error
              ? error.message
              : "알 수 없는 오류가 발생했습니다.",
        },
      });
    } catch {
      // 실패 기록도 실패한 경우에는 API 응답만 반환한다.
    }

    return NextResponse.json(
      {
        success: false,
        error: {
          code: "CARE_PROGRAM_COMPLETE_FAILED",
          message:
            error instanceof Error
              ? error.message
              : "2차 케어 시작 처리 중 오류가 발생했습니다.",
        },
      },
      {
        status: 500,
      }
    );
  }
}
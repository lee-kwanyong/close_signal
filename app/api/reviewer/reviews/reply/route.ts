import { NextResponse } from "next/server";

import { db } from "@/lib/db/repositories";

export const runtime = "nodejs";

type ReplyAction = "copy" | "update_draft" | "replied" | "reset";

function normalizeText(value: string | null | undefined): string | null {
  const normalized = value?.trim();

  if (!normalized) {
    return null;
  }

  return normalized;
}

function isReplyAction(value: string): value is ReplyAction {
  return ["copy", "update_draft", "replied", "reset"].includes(value);
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      reviewId?: string;
      action?: string;
      replyText?: string;
    };

    const reviewId = normalizeText(body.reviewId);
    const action = normalizeText(body.action);
    const replyText = normalizeText(body.replyText);
    const now = new Date().toISOString();

    if (!reviewId) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "REVIEW_ID_REQUIRED",
            message: "reviewId가 필요합니다.",
          },
        },
        {
          status: 400,
        }
      );
    }

    if (!action || !isReplyAction(action)) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "INVALID_REPLY_ACTION",
            message: "유효한 답글 액션이 아닙니다.",
          },
        },
        {
          status: 400,
        }
      );
    }

    const updatePayload: Record<string, unknown> = {
      reply_updated_at: now,
    };

    if (action === "copy") {
      updatePayload.reply_status = "copied";
      updatePayload.reply_copied_at = now;

      if (replyText) {
        updatePayload.reply_final_text = replyText;
      }
    }

    if (action === "update_draft") {
      updatePayload.reply_status = "drafted";
      updatePayload.reply_final_text = replyText;
    }

    if (action === "replied") {
      updatePayload.reply_status = "replied";
      updatePayload.replied_at = now;

      if (replyText) {
        updatePayload.reply_final_text = replyText;
      }
    }

    if (action === "reset") {
      updatePayload.reply_status = "drafted";
      updatePayload.reply_copied_at = null;
      updatePayload.replied_at = null;

      if (replyText) {
        updatePayload.reply_final_text = replyText;
      }
    }

    const client = db() as any;

    const { data, error } = await client
      .from("review_raw_items")
      .update(updatePayload)
      .eq("id", reviewId)
      .select(
        [
          "id",
          "reply_status",
          "reply_final_text",
          "reply_copied_at",
          "replied_at",
          "reply_updated_at",
        ].join(",")
      )
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("[reviewer/reviews/reply] failed", error);

    return NextResponse.json(
      {
        success: false,
        error: {
          code: "REPLY_UPDATE_FAILED",
          message:
            error instanceof Error
              ? error.message
              : "답글 상태 업데이트 중 오류가 발생했습니다.",
        },
      },
      {
        status: 500,
      }
    );
  }
}
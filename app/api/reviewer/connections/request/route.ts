import { NextResponse } from "next/server";

export const runtime = "nodejs";

type ReviewPlatform =
  | "baemin"
  | "yogiyo"
  | "coupang_eats"
  | "naver"
  | "kakao"
  | "google";

const PLATFORM_LABELS: Record<ReviewPlatform, string> = {
  baemin: "배달의민족 사장님앱",
  yogiyo: "요기요 사장님",
  coupang_eats: "쿠팡이츠 스토어",
  naver: "네이버 플레이스",
  kakao: "카카오맵",
  google: "구글 비즈니스",
};

function normalizeText(value: string | null | undefined): string | null {
  const normalized = value?.trim();

  if (!normalized) {
    return null;
  }

  return normalized;
}

function isReviewPlatform(value: string): value is ReviewPlatform {
  return value in PLATFORM_LABELS;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      platform?: string;
      storeName?: string;
      ownerName?: string;
      contact?: string;
      accountIdentifier?: string;
    };

    const platform = normalizeText(body.platform);

    if (!platform || !isReviewPlatform(platform)) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "INVALID_PLATFORM",
            message: "연동할 리뷰 플랫폼을 선택해주세요.",
          },
        },
        {
          status: 400,
        }
      );
    }

    const storeName = normalizeText(body.storeName);
    const ownerName = normalizeText(body.ownerName);
    const contact = normalizeText(body.contact);
    const accountIdentifier = normalizeText(body.accountIdentifier);

    if (!storeName) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "STORE_NAME_REQUIRED",
            message: "매장명을 입력해주세요.",
          },
        },
        {
          status: 400,
        }
      );
    }

    if (!contact) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "CONTACT_REQUIRED",
            message: "연동 안내를 받을 연락처를 입력해주세요.",
          },
        },
        {
          status: 400,
        }
      );
    }

    const requestId = `reviewer_req_${crypto.randomUUID()}`;

    return NextResponse.json({
      success: true,
      data: {
        requestId,
        platform,
        platformLabel: PLATFORM_LABELS[platform],
        storeName,
        ownerName,
        contact,
        accountIdentifier,
        status: "requested",
        message:
          "연동 요청이 등록되었습니다. 비밀번호는 저장하지 않으며, 공식 API·제휴·관리자 보안 연결·CSV 업로드 방식 중 하나로 안내합니다.",
      },
    });
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "CONNECTION_REQUEST_FAILED",
          message: "리뷰 채널 연동 요청 중 오류가 발생했습니다.",
        },
      },
      {
        status: 500,
      }
    );
  }
}
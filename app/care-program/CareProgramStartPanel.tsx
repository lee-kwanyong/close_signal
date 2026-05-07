"use client";

import { useState } from "react";
import Link from "next/link";

type CareProgramStartPanelProps = {
  businessNumber?: string;
  checkoutStatus?: string;
  sessionId?: string;
  plan?: string;
  demoCheckoutHref: string;
};

const REVIEW_PLATFORM_OPTIONS = [
  {
    value: "",
    label: "선택 안 함",
  },
  {
    value: "baemin",
    label: "배달의민족",
  },
  {
    value: "yogiyo",
    label: "요기요",
  },
  {
    value: "coupang_eats",
    label: "쿠팡이츠",
  },
  {
    value: "naver",
    label: "네이버 플레이스",
  },
  {
    value: "kakao",
    label: "카카오맵",
  },
  {
    value: "google",
    label: "구글 비즈니스",
  },
];

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return "2차 케어 시작 처리 중 오류가 발생했습니다.";
}

export function CareProgramStartPanel({
  businessNumber,
  checkoutStatus,
  sessionId,
  plan = "growth-care-basic",
  demoCheckoutHref,
}: CareProgramStartPanelProps) {
  const [storeName, setStoreName] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [contact, setContact] = useState("");

  const [reviewPlatform, setReviewPlatform] = useState("");
  const [reviewAccountIdentifier, setReviewAccountIdentifier] = useState("");

  const [isCompleting, setIsCompleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isCheckoutSuccess = checkoutStatus === "success";

  async function handleCompleteCareProgram() {
    setIsCompleting(true);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/public/care-program/complete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          businessNumber,
          sessionId,
          plan,
          storeName,
          ownerName,
          contact,
          reviewPlatform,
          reviewAccountIdentifier,
          source: "care_program_page",
        }),
      });

      const payload = await response.json();

      if (!response.ok || !payload?.success) {
        throw new Error(
          payload?.error?.message ?? "2차 케어 시작에 실패했습니다."
        );
      }

      window.location.href = payload.data.nextUrl;
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsCompleting(false);
    }
  }

  return (
    <section className="care-checkout-box">
      <div>
        <div className="eyebrow">Checkout</div>
        <h2>2차 케어 프로그램 시작</h2>

        <p>
          결제 완료 후에는 고객 계정을 생성하고, Growth Care Report와 이번 주
          실행 액션을 자동 생성합니다. Reviewer에서 수집한 리뷰와 정확히
          연결하려면 동일한 리뷰 계정 식별자를 입력하세요.
        </p>

        {businessNumber ? (
          <p className="care-checkout-meta">
            연결된 사업자번호: <strong>{businessNumber}</strong>
          </p>
        ) : (
          <p className="care-checkout-meta">
            사업자번호 없이도 데모 결제 흐름을 확인할 수 있습니다.
          </p>
        )}
      </div>

      <div className="care-payment-summary">
        <div>
          <span>플랜</span>
          <strong>Growth Care Basic</strong>
        </div>

        <div>
          <span>결제 금액</span>
          <strong>월 49,000원</strong>
        </div>

        <div>
          <span>결제 상태</span>
          <strong>{isCheckoutSuccess ? "결제 완료" : "결제 대기"}</strong>
        </div>

        <div>
          <span>다음 단계</span>
          <strong>{isCheckoutSuccess ? "리포트 생성" : "데모 결제"}</strong>
        </div>
      </div>

      {isCheckoutSuccess ? (
        <div className="care-start-form">
          <label>
            <span>매장명</span>
            <input
              value={storeName}
              placeholder="예: 성수 파스타"
              onChange={(event) => setStoreName(event.target.value)}
            />
          </label>

          <label>
            <span>담당자명</span>
            <input
              value={ownerName}
              placeholder="예: 홍길동"
              onChange={(event) => setOwnerName(event.target.value)}
            />
          </label>

          <label>
            <span>연락처</span>
            <input
              value={contact}
              placeholder="예: 010-0000-0000"
              onChange={(event) => setContact(event.target.value)}
            />
          </label>

          <label>
            <span>리뷰 플랫폼</span>
            <select
              value={reviewPlatform}
              onChange={(event) => setReviewPlatform(event.target.value)}
            >
              {REVIEW_PLATFORM_OPTIONS.map((option) => (
                <option key={option.value || "none"} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span>리뷰 계정 식별자</span>
            <input
              value={reviewAccountIdentifier}
              placeholder="예: smoke-baemin-store, 배민 가게번호, 플레이스 URL"
              onChange={(event) =>
                setReviewAccountIdentifier(event.target.value)
              }
            />
          </label>

          <p className="care-checkout-meta">
            Reviewer에서 리뷰를 수집할 때 입력한 계정 식별자와 같은 값을 넣으면
            Growth Care Report가 정확히 이 고객의 리뷰 지표만 보여줍니다.
          </p>
        </div>
      ) : null}

      {isCheckoutSuccess ? (
        <div className="care-success-box">
          <strong>결제 완료 상태입니다</strong>
          <p>
            아래 버튼을 누르면 고객 생성, Growth Care Report 생성, 실행 액션
            생성까지 진행됩니다.
          </p>
        </div>
      ) : null}

      {errorMessage ? (
        <div className="quick-check-error">
          <strong>오류</strong>
          <p>{errorMessage}</p>
        </div>
      ) : null}

      <div className="care-checkout-actions">
        {isCheckoutSuccess ? (
          <button
            className="btn primary"
            type="button"
            onClick={() => void handleCompleteCareProgram()}
            disabled={isCompleting}
          >
            {isCompleting
              ? "Growth Care Report 생성 중..."
              : "2차 케어 등록하고 리포트 생성하기"}
          </button>
        ) : (
          <Link className="btn primary" href={demoCheckoutHref}>
            결제하고 2차 케어 시작하기
          </Link>
        )}

        <Link className="btn" href="/">
          1차 체크 다시 하기
        </Link>
      </div>
    </section>
  );
}
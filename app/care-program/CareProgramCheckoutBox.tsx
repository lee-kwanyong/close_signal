"use client";

import { useState } from "react";

type CareProgramCheckoutBoxProps = {
  businessNumber?: string;
  checkoutStatus?: string;
};

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return "결제 시작 중 오류가 발생했습니다.";
}

export function CareProgramCheckoutBox({
  businessNumber,
  checkoutStatus,
}: CareProgramCheckoutBoxProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isSuccess = checkoutStatus === "success";

  async function handleStartCare() {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/public/care-program/start", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          businessNumber,
          plan: "growth-care-basic",
        }),
      });

      const payload = await response.json();

      if (!response.ok || !payload?.success) {
        throw new Error(
          payload?.error?.message ?? "2차 케어 프로그램 시작에 실패했습니다."
        );
      }

      window.location.href = payload.data.checkoutUrl;
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <section className="care-checkout-box">
      <div>
        <div className="eyebrow">Checkout</div>
        <h2>2차 케어 프로그램 시작</h2>

        <p>
          현재는 실제 결제 모듈 연결 전 단계입니다. 이 버튼은 데모 체크아웃
          화면으로 이동하고, 이후 토스페이먼츠·포트원·Stripe 같은 실제 결제
          모듈을 이 위치에 연결하면 됩니다.
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

      {isSuccess ? (
        <div className="care-success-box">
          <strong>데모 결제 완료</strong>
          <p>
            결제 완료 상태입니다. 다음 단계에서는 여기서 customer 생성,
            store_profile 저장, Growth Care Report 생성, CS 큐 등록을
            연결합니다.
          </p>
        </div>
      ) : null}

      {errorMessage ? (
        <div className="quick-check-error">
          <strong>오류</strong>
          <p>{errorMessage}</p>
        </div>
      ) : null}

      <button
        className="btn primary"
        type="button"
        onClick={() => void handleStartCare()}
        disabled={isLoading}
      >
        {isLoading ? "결제 화면 준비 중..." : "결제하고 2차 케어 시작하기"}
      </button>
    </section>
  );
}
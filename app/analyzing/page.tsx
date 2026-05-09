"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

const STEPS = [
  "사업장 정보 확인",
  "주소와 좌표 정리",
  "지도/검색 노출 확인",
  "상권 수요 분석",
  "주변 경쟁점 분석",
  "Growth Signal Score 계산",
  "이번 주 성장 미션 생성"
];

function AnalyzingInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const customerId = searchParams.get("customerId");
  const [activeStep, setActiveStep] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const progress = useMemo(
    () => Math.round(((activeStep + 1) / STEPS.length) * 100),
    [activeStep]
  );

  useEffect(() => {
    if (!customerId) {
      setError("customerId가 없습니다. 진단을 다시 시작해주세요.");
      return;
    }

    let cancelled = false;

    async function run() {
      try {
        const timer = setInterval(() => {
          setActiveStep((prev) => Math.min(prev + 1, STEPS.length - 1));
        }, 520);

        const businessNumber =
          sessionStorage.getItem(`business_number:${customerId}`) ?? undefined;

        const response = await fetch(`/api/v1/customers/${customerId}/sync/all`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            business_number: businessNumber,
            platforms: ["naver", "kakao", "google"],
            run_score_after: true,
            create_sprint: true,
            score_version: "gs-300-v1"
          })
        });

        const envelope = await response.json();
        clearInterval(timer);

        if (!response.ok || !envelope.success) {
          throw new Error(envelope?.error?.message ?? "분석에 실패했습니다.");
        }

        if (!cancelled) {
          setActiveStep(STEPS.length - 1);
          setTimeout(() => {
            router.replace(`/customers/${customerId}/growth-report`);
          }, 650);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "분석 중 오류가 발생했습니다.");
        }
      }
    }

    run();

    return () => {
      cancelled = true;
    };
  }, [customerId, router]);

  return (
    <main
      style={{
        minHeight: "100vh",
        padding: "46px 24px",
        display: "grid",
        placeItems: "center",
        background:
          "radial-gradient(circle at top left, rgba(51,92,255,0.10), transparent 34%), #f6f7fb"
      }}
    >
      <section className="card" style={{ width: "min(760px, 100%)", padding: 34 }}>
        <div className="eyebrow">Analyzing</div>
        <h1>가게 성장 신호를 분석하고 있습니다.</h1>
        <p className="subtle">잠시 후 Growth Signal Score와 이번 주 미션이 완성됩니다.</p>

        <div
          style={{
            marginTop: 22,
            height: 12,
            background: "#eceff6",
            borderRadius: 999,
            overflow: "hidden"
          }}
        >
          <div
            style={{
              width: `${progress}%`,
              height: "100%",
              background: "linear-gradient(90deg, var(--brand), #74a1ff)",
              transition: "width .35s ease"
            }}
          />
        </div>

        <div className="timeline" style={{ marginTop: 24 }}>
          {STEPS.map((step, index) => (
            <div className="timeline-item" key={step} style={{ opacity: index <= activeStep ? 1 : 0.38 }}>
              <span className="dot" />
              <div>
                <strong>
                  {index < activeStep ? "✓ " : index === activeStep ? "● " : "○ "}
                  {step}
                </strong>
              </div>
            </div>
          ))}
        </div>

        {error ? (
          <div className="card soft" style={{ marginTop: 22 }}>
            <h3 style={{ color: "var(--red)" }}>분석이 중단되었습니다.</h3>
            <p>{error}</p>
            <a className="btn" href="/diagnose">다시 시작하기</a>
          </div>
        ) : null}
      </section>
    </main>
  );
}

export default function AnalyzingPage() {
  return (
    <Suspense fallback={<main style={{ padding: 40 }}>분석 준비 중...</main>}>
      <AnalyzingInner />
    </Suspense>
  );
}

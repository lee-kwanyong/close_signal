"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  const message =
    error?.message?.trim() || "요청을 처리하는 중 예기치 않은 오류가 발생했습니다.";

  return (
    <main className="mx-auto max-w-5xl px-4 pb-14 pt-8 sm:px-6">
      <div className="space-y-6">
        <section className="overflow-hidden rounded-[34px] border border-rose-200 bg-white shadow-[0_18px_54px_rgba(15,23,42,0.06)]">
          <div className="bg-[linear-gradient(135deg,#fff1f2_0%,#fff7ed_45%,#ffffff_100%)] px-6 py-8 sm:px-8">
            <div className="grid gap-8 lg:grid-cols-[1.08fr_0.92fr]">
              <div className="min-w-0">
                <div className="inline-flex items-center rounded-full border border-rose-200 bg-rose-50 px-4 py-1.5 text-[11px] font-black uppercase tracking-[0.18em] text-rose-700">
                  Service Error
                </div>

                <h1 className="mt-5 text-[32px] font-black tracking-[-0.05em] text-slate-950 sm:text-[46px]">
                  화면을 불러오지 못했습니다
                </h1>

                <p className="mt-4 max-w-3xl text-sm leading-8 text-slate-600 sm:text-base">
                  일시적인 처리 오류이거나 데이터 연결 과정에서 문제가 발생했을 수 있습니다.
                  같은 작업을 다시 시도하거나 다른 화면으로 이동한 뒤 다시 들어와 보세요.
                </p>

                <div className="mt-6 rounded-[24px] border border-rose-200 bg-white/90 p-4">
                  <div className="text-xs font-semibold uppercase tracking-[0.14em] text-rose-600">
                    Error Message
                  </div>
                  <p className="mt-2 break-words text-sm leading-7 text-slate-700">
                    {message}
                  </p>
                  {error?.digest ? (
                    <p className="mt-2 text-xs text-slate-500">digest: {error.digest}</p>
                  ) : null}
                </div>

                <div className="mt-6 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => reset()}
                    className="inline-flex h-12 items-center justify-center rounded-2xl border border-rose-600 bg-rose-600 px-5 text-sm font-semibold text-white transition hover:border-rose-700 hover:bg-rose-700"
                  >
                    다시 시도
                  </button>

                  <Link
                    href="/"
                    className="inline-flex h-12 items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    홈으로
                  </Link>
                </div>
              </div>

              <div className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-[0_14px_36px_rgba(15,23,42,0.05)]">
                <div className="text-[11px] font-black uppercase tracking-[0.18em] text-[#0B5CAB]">
                  Quick Route
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                  <RouteCard
                    href="/monitors"
                    title="모니터"
                    description="사업장 운영 화면으로 바로 이동"
                  />
                  <RouteCard
                    href="/signals"
                    title="시그널"
                    description="최근 발견 신호부터 다시 확인"
                  />
                  <RouteCard
                    href="/rankings"
                    title="랭킹"
                    description="지역·업종 위험 순위 다시 보기"
                  />
                  <RouteCard
                    href="/community"
                    title="커뮤니티"
                    description="질문/사례 화면으로 이동"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-[0_14px_38px_rgba(15,23,42,0.05)] sm:p-7">
          <div className="text-[11px] font-black uppercase tracking-[0.18em] text-[#0B5CAB]">
            Guide
          </div>
          <h2 className="mt-2 text-2xl font-black tracking-[-0.04em] text-slate-950">
            먼저 이렇게 확인해 보세요
          </h2>

          <div className="mt-5 grid gap-4 md:grid-cols-3">
            <GuideCard
              title="1. 다시 시도"
              body="일시적 오류인 경우 한 번 더 요청하면 정상적으로 열리는 경우가 많습니다."
            />
            <GuideCard
              title="2. 다른 화면으로 이동"
              body="홈, 시그널, 랭킹, 커뮤니티 등 다른 화면으로 이동한 뒤 다시 들어와 보세요."
            />
            <GuideCard
              title="3. 입력값 확인"
              body="잘못된 경로, 삭제된 데이터, 오래된 링크일 수 있으니 주소나 파라미터를 확인해 보세요."
            />
          </div>
        </section>
      </div>
    </main>
  );
}

function RouteCard({
  href,
  title,
  description,
}: {
  href: string;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="block rounded-[22px] border border-slate-200 bg-slate-50 p-4 transition hover:border-sky-200 hover:bg-sky-50"
    >
      <div className="text-base font-black tracking-[-0.02em] text-slate-950">{title}</div>
      <p className="mt-2 text-sm leading-7 text-slate-600">{description}</p>
    </Link>
  );
}

function GuideCard({
  title,
  body,
}: {
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-5">
      <div className="text-base font-black tracking-[-0.02em] text-slate-950">{title}</div>
      <p className="mt-2 text-sm leading-7 text-slate-600">{body}</p>
    </div>
  );
}
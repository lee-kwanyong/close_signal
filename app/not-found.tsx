import Link from "next/link";

export default function NotFoundPage() {
  return (
    <main className="mx-auto max-w-5xl px-4 pb-14 pt-8 sm:px-6">
      <div className="space-y-6">
        <section className="overflow-hidden rounded-[34px] border border-slate-200 bg-white shadow-[0_18px_54px_rgba(15,23,42,0.06)]">
          <div className="bg-[linear-gradient(135deg,#eef5ff_0%,#f8fbff_46%,#ffffff_100%)] px-6 py-8 sm:px-8">
            <div className="grid gap-8 lg:grid-cols-[1.08fr_0.92fr]">
              <div className="min-w-0">
                <div className="inline-flex items-center rounded-full border border-sky-200 bg-sky-50 px-4 py-1.5 text-[11px] font-black uppercase tracking-[0.18em] text-[#0B5CAB]">
                  404 Not Found
                </div>

                <h1 className="mt-5 text-[32px] font-black tracking-[-0.05em] text-slate-950 sm:text-[46px]">
                  요청한 페이지를 찾을 수 없습니다
                </h1>

                <p className="mt-4 max-w-3xl text-sm leading-8 text-slate-600 sm:text-base">
                  주소가 잘못되었거나, 삭제되었거나, 이동된 페이지일 수 있습니다. 아래 주요
                  화면으로 이동해서 다시 찾아보세요.
                </p>

                <div className="mt-6 flex flex-wrap gap-3">
                  <Link
                    href="/"
                    className="inline-flex h-12 items-center justify-center rounded-2xl border border-[#0B5CAB] bg-[#0B5CAB] px-5 text-sm font-semibold text-white transition hover:border-[#084298] hover:bg-[#084298]"
                  >
                    홈으로
                  </Link>

                  <Link
                    href="/regions"
                    className="inline-flex h-12 items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    지역 허브 보기
                  </Link>
                </div>
              </div>

              <div className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-[0_14px_36px_rgba(15,23,42,0.05)]">
                <div className="text-[11px] font-black uppercase tracking-[0.18em] text-[#0B5CAB]">
                  Recommended Routes
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                  <RouteCard
                    href="/monitors"
                    title="모니터"
                    description="사업장 탐지·개입·재평가 운영 화면"
                  />
                  <RouteCard
                    href="/signals"
                    title="시그널"
                    description="최근 발견된 위험 신호 보기"
                  />
                  <RouteCard
                    href="/rankings"
                    title="랭킹"
                    description="지역·업종 위험 랭킹 보기"
                  />
                  <RouteCard
                    href="/community"
                    title="커뮤니티"
                    description="질문과 사례 허브 보기"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-[0_14px_38px_rgba(15,23,42,0.05)] sm:p-7">
          <div className="text-[11px] font-black uppercase tracking-[0.18em] text-[#0B5CAB]">
            Help
          </div>
          <h2 className="mt-2 text-2xl font-black tracking-[-0.04em] text-slate-950">
            이런 경우에 자주 발생합니다
          </h2>

          <div className="mt-5 grid gap-4 md:grid-cols-3">
            <HelpCard
              title="삭제된 글/데이터"
              body="커뮤니티 글, 시그널, 모니터 등 원본 데이터가 삭제되었을 수 있습니다."
            />
            <HelpCard
              title="주소 직접 입력 오류"
              body="경로 일부가 틀렸거나 regionCode, categoryId, postId 값이 잘못되었을 수 있습니다."
            />
            <HelpCard
              title="이전 링크 사용"
              body="예전 화면 구조에서 저장한 링크라 현재 라우트와 맞지 않을 수 있습니다."
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

function HelpCard({
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
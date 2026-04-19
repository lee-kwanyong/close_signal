import Link from "next/link";

export default async function CommunityRegionPage({
  params,
}: {
  params: Promise<{ regionCode: string }>;
}) {
  const { regionCode } = await params;

  return (
    <main className="min-h-screen bg-white text-slate-900">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
        <section className="rounded-[32px] border border-[#d7f0ea] bg-white p-8 shadow-[0_20px_60px_rgba(15,118,110,0.08)] sm:p-10">
          <div className="inline-flex items-center rounded-full bg-[#ecfdf8] px-3 py-1 text-xs font-semibold text-[#0f766e] ring-1 ring-[#b7efe2]">
            COMMUNITY REGION
          </div>

          <h1 className="mt-5 text-3xl font-extrabold tracking-tight text-slate-950 sm:text-5xl">
            지역 커뮤니티
          </h1>

          <p className="mt-4 text-sm leading-6 text-slate-600 sm:text-base">
            현재 지역 코드: {regionCode}
          </p>

          <div className="mt-6">
            <Link
              href="/community"
              className="inline-flex items-center rounded-2xl border border-[#bfe9df] px-5 py-3 text-sm font-bold text-slate-700 transition hover:bg-[#f4fffc]"
            >
              커뮤니티 홈으로
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
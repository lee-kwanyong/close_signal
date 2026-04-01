import Link from "next/link";

type HeroPanelProps = {
  watchlistCount?: number;
};

export default function HeroPanel({
  watchlistCount = 0,
}: HeroPanelProps) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl">
          <div className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">
            Risk Intelligence Dashboard
          </div>

          <h1 className="mt-4 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
            지역·업종 단위 폐업 위험 신호를 한 화면에서 모니터링합니다.
          </h1>

          <p className="mt-4 text-sm leading-6 text-slate-600 sm:text-base">
            랭킹, 시그널, 관심목록을 연결해 특정 지역과 업종 조합의 리스크 변화를 빠르게 확인할 수 있습니다.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            href="/rankings"
            className="inline-flex h-11 items-center rounded-xl bg-slate-900 px-4 text-sm font-medium text-white transition hover:bg-slate-800"
          >
            리스크 랭킹 보기
          </Link>

          <Link
            href="/signals"
            className="inline-flex h-11 items-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            시그널 보기
          </Link>

          <Link
            href="/watchlist"
            className="inline-flex h-11 items-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            관심목록{watchlistCount > 0 ? ` (${watchlistCount})` : ""}
          </Link>
        </div>
      </div>
    </section>
  );
}
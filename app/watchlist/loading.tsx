function PulseBlock({
  className = "",
}: {
  className?: string;
}) {
  return <div className={`animate-pulse rounded-2xl bg-slate-200/80 ${className}`} />;
}

function HeroSkeleton() {
  return (
    <section className="overflow-hidden rounded-[34px] border border-slate-200 bg-white shadow-[0_18px_54px_rgba(15,23,42,0.06)]">
      <div className="bg-[linear-gradient(135deg,#eef5ff_0%,#f8fbff_46%,#ffffff_100%)] px-6 py-6 sm:px-8">
        <div className="grid gap-8 xl:grid-cols-[1.08fr_0.92fr]">
          <div className="min-w-0">
            <PulseBlock className="h-8 w-36 rounded-full" />
            <PulseBlock className="mt-5 h-12 w-full max-w-[320px]" />
            <PulseBlock className="mt-3 h-12 w-full max-w-[260px]" />

            <div className="mt-5 space-y-3">
              <PulseBlock className="h-4 w-full max-w-[720px]" />
              <PulseBlock className="h-4 w-full max-w-[640px]" />
              <PulseBlock className="h-4 w-full max-w-[560px]" />
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <PulseBlock className="h-12 w-36" />
              <PulseBlock className="h-12 w-36" />
            </div>
          </div>

          <div className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-[0_14px_36px_rgba(15,23,42,0.05)]">
            <PulseBlock className="h-4 w-36" />
            <div className="mt-5 grid grid-cols-2 gap-3">
              <PulseBlock className="h-28 w-full" />
              <PulseBlock className="h-28 w-full" />
              <PulseBlock className="h-28 w-full" />
              <PulseBlock className="h-28 w-full" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function InfoBoxSkeleton() {
  return (
    <div className="rounded-[18px] border border-slate-200 bg-white px-3 py-3">
      <PulseBlock className="h-3 w-16" />
      <PulseBlock className="mt-2 h-5 w-20" />
    </div>
  );
}

function ActionPanelSkeleton() {
  return <PulseBlock className="h-32 w-full" />;
}

function WatchlistCardSkeleton() {
  return (
    <article className="overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-[0_16px_40px_rgba(15,23,42,0.05)]">
      <div className="border-b border-slate-200 bg-[linear-gradient(180deg,#fcfdff_0%,#f7fbff_100%)] px-6 py-4">
        <div className="flex flex-wrap items-center gap-2">
          <PulseBlock className="h-7 w-14 rounded-full" />
          <PulseBlock className="h-7 w-20 rounded-full" />
          <PulseBlock className="h-7 w-20 rounded-full" />
          <PulseBlock className="h-7 w-24 rounded-full" />
          <PulseBlock className="h-7 w-24 rounded-full" />
        </div>
      </div>

      <div className="grid gap-6 px-6 py-6 xl:grid-cols-[minmax(0,1.15fr)_340px]">
        <div className="min-w-0">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 flex-1">
              <PulseBlock className="h-10 w-full max-w-[240px]" />
              <PulseBlock className="mt-3 h-4 w-full max-w-[360px]" />
            </div>

            <PulseBlock className="h-28 w-full max-w-[160px]" />
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
            <InfoBoxSkeleton />
            <InfoBoxSkeleton />
            <InfoBoxSkeleton />
            <InfoBoxSkeleton />
          </div>

          <div className="mt-5 rounded-[24px] border border-slate-200 bg-slate-50 p-5">
            <PulseBlock className="h-4 w-20" />
            <div className="mt-3 flex flex-wrap gap-2">
              <PulseBlock className="h-8 w-24 rounded-full" />
              <PulseBlock className="h-8 w-28 rounded-full" />
              <PulseBlock className="h-8 w-20 rounded-full" />
            </div>
            <PulseBlock className="mt-4 h-4 w-full" />
            <PulseBlock className="mt-2 h-4 w-5/6" />
          </div>

          <div className="mt-5 grid gap-3 lg:grid-cols-3">
            <ActionPanelSkeleton />
            <ActionPanelSkeleton />
            <ActionPanelSkeleton />
          </div>
        </div>

        <div className="space-y-4">
          <PulseBlock className="h-48 w-full" />

          <div className="flex flex-col gap-2">
            <PulseBlock className="h-11 w-full" />
            <PulseBlock className="h-11 w-full" />
            <PulseBlock className="h-11 w-full" />
          </div>
        </div>
      </div>
    </article>
  );
}

export default function WatchlistLoading() {
  return (
    <main
      className="mx-auto max-w-7xl px-4 pb-14 pt-6 sm:px-6"
      aria-busy="true"
      aria-live="polite"
    >
      <div className="space-y-6">
        <HeroSkeleton />

        <section className="space-y-4">
          <WatchlistCardSkeleton />
          <WatchlistCardSkeleton />
          <WatchlistCardSkeleton />
        </section>
      </div>
    </main>
  );
}
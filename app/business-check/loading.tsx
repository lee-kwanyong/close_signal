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
        <div className="grid gap-8 xl:grid-cols-[1.05fr_0.95fr]">
          <div className="min-w-0">
            <PulseBlock className="h-8 w-40 rounded-full" />
            <PulseBlock className="mt-5 h-12 w-full max-w-[420px]" />
            <PulseBlock className="mt-3 h-12 w-full max-w-[360px]" />

            <div className="mt-5 space-y-3">
              <PulseBlock className="h-4 w-full max-w-[700px]" />
              <PulseBlock className="h-4 w-full max-w-[620px]" />
              <PulseBlock className="h-4 w-full max-w-[520px]" />
            </div>

            <div className="mt-6 grid gap-3 md:grid-cols-3">
              <PulseBlock className="h-28 w-full" />
              <PulseBlock className="h-28 w-full" />
              <PulseBlock className="h-28 w-full" />
            </div>
          </div>

          <div className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-[0_14px_36px_rgba(15,23,42,0.05)]">
            <PulseBlock className="h-4 w-24" />
            <PulseBlock className="mt-3 h-8 w-40" />
            <PulseBlock className="mt-3 h-4 w-48" />

            <div className="mt-6">
              <PulseBlock className="h-4 w-24" />
              <PulseBlock className="mt-2 h-12 w-full" />
            </div>

            <PulseBlock className="mt-4 h-16 w-full" />

            <div className="mt-5 flex flex-wrap gap-3">
              <PulseBlock className="h-12 w-36" />
              <PulseBlock className="h-12 w-36" />
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <PulseBlock className="h-28 w-full" />
              <PulseBlock className="h-28 w-full" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function ResultCellSkeleton() {
  return <PulseBlock className="h-24 w-full" />;
}

export default function BusinessCheckLoading() {
  return (
    <main
      className="mx-auto max-w-7xl px-4 pb-14 pt-6 sm:px-6"
      aria-busy="true"
      aria-live="polite"
    >
      <div className="space-y-6">
        <HeroSkeleton />

        <section className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-[0_14px_38px_rgba(15,23,42,0.05)] sm:p-7">
          <PulseBlock className="h-4 w-20" />
          <PulseBlock className="mt-3 h-8 w-40" />
          <PulseBlock className="mt-3 h-4 w-full max-w-[620px]" />

          <div className="mt-6 space-y-5">
            <PulseBlock className="h-40 w-full" />

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <ResultCellSkeleton />
              <ResultCellSkeleton />
              <ResultCellSkeleton />
              <ResultCellSkeleton />
              <ResultCellSkeleton />
              <ResultCellSkeleton />
              <ResultCellSkeleton />
              <ResultCellSkeleton />
              <ResultCellSkeleton />
            </div>

            <PulseBlock className="h-28 w-full" />
          </div>
        </section>
      </div>
    </main>
  );
}
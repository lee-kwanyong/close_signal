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
            <PulseBlock className="mt-5 h-12 w-full max-w-[460px]" />
            <PulseBlock className="mt-3 h-12 w-full max-w-[360px]" />

            <div className="mt-5 space-y-3">
              <PulseBlock className="h-4 w-full max-w-[720px]" />
              <PulseBlock className="h-4 w-full max-w-[640px]" />
              <PulseBlock className="h-4 w-full max-w-[560px]" />
            </div>

            <div className="mt-6 grid gap-3 md:grid-cols-3">
              <PulseBlock className="h-28 w-full" />
              <PulseBlock className="h-28 w-full" />
              <PulseBlock className="h-28 w-full" />
            </div>
          </div>

          <div className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-[0_14px_36px_rgba(15,23,42,0.05)]">
            <PulseBlock className="h-4 w-24" />
            <PulseBlock className="mt-3 h-8 w-36" />
            <PulseBlock className="mt-3 h-4 w-48" />

            <div className="mt-6">
              <PulseBlock className="h-4 w-20" />
              <PulseBlock className="mt-2 h-12 w-full" />
            </div>

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

function SummaryCardSkeleton() {
  return <PulseBlock className="h-28 w-full" />;
}

function ProviderItemSkeleton() {
  return (
    <div className="rounded-[24px] border border-slate-200 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <PulseBlock className="h-6 w-4/5" />
          <PulseBlock className="mt-3 h-4 w-full" />
          <PulseBlock className="mt-2 h-4 w-5/6" />
        </div>

        <PulseBlock className="h-7 w-20 rounded-full" />
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <PulseBlock className="h-6 w-20 rounded-full" />
        <PulseBlock className="h-6 w-24 rounded-full" />
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <PulseBlock className="h-10 w-24" />
        <PulseBlock className="h-10 w-24" />
      </div>
    </div>
  );
}

function ProviderColumnSkeleton() {
  return (
    <section className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-[0_14px_38px_rgba(15,23,42,0.05)] sm:p-7">
      <div className="flex items-start justify-between gap-4">
        <div>
          <PulseBlock className="h-7 w-24 rounded-full" />
          <PulseBlock className="mt-4 h-8 w-40" />
          <PulseBlock className="mt-3 h-4 w-60" />
        </div>
        <PulseBlock className="h-7 w-20 rounded-full" />
      </div>

      <div className="mt-5 space-y-3">
        <ProviderItemSkeleton />
        <ProviderItemSkeleton />
        <ProviderItemSkeleton />
      </div>
    </section>
  );
}

export default function MarketCheckLoading() {
  return (
    <main
      className="mx-auto max-w-7xl px-4 pb-14 pt-6 sm:px-6"
      aria-busy="true"
      aria-live="polite"
    >
      <div className="space-y-6">
        <HeroSkeleton />

        <section className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-[0_14px_38px_rgba(15,23,42,0.05)] sm:p-7">
          <PulseBlock className="h-4 w-44" />
          <PulseBlock className="mt-3 h-8 w-56" />
          <PulseBlock className="mt-3 h-4 w-full max-w-[620px]" />

          <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <SummaryCardSkeleton />
            <SummaryCardSkeleton />
            <SummaryCardSkeleton />
            <SummaryCardSkeleton />
            <SummaryCardSkeleton />
          </div>

          <PulseBlock className="mt-5 h-28 w-full" />
        </section>

        <div className="grid gap-6 xl:grid-cols-2">
          <ProviderColumnSkeleton />
          <ProviderColumnSkeleton />
        </div>
      </div>
    </main>
  );
}
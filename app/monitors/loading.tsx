function PulseBlock({
  className = "",
}: {
  className?: string;
}) {
  return <div className={`animate-pulse rounded-2xl bg-slate-200/80 ${className}`} />;
}

function MetricCardSkeleton() {
  return (
    <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_12px_30px_rgba(15,23,42,0.05)]">
      <PulseBlock className="h-4 w-24" />
      <PulseBlock className="mt-4 h-10 w-24" />
      <PulseBlock className="mt-3 h-4 w-full" />
      <PulseBlock className="mt-2 h-4 w-3/4" />
    </div>
  );
}

function HeroSkeleton() {
  return (
    <section className="overflow-hidden rounded-[34px] border border-slate-200 bg-white shadow-[0_18px_54px_rgba(15,23,42,0.06)]">
      <div className="bg-[linear-gradient(135deg,#eef5ff_0%,#f8fbff_46%,#ffffff_100%)] px-6 py-6 sm:px-8">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0 max-w-4xl">
            <PulseBlock className="h-8 w-40 rounded-full" />
            <PulseBlock className="mt-5 h-12 w-full max-w-[420px]" />
            <PulseBlock className="mt-3 h-4 w-full max-w-[760px]" />
            <PulseBlock className="mt-2 h-4 w-full max-w-[640px]" />

            <div className="mt-6 grid gap-4 md:grid-cols-2 2xl:grid-cols-4">
              <MetricCardSkeleton />
              <MetricCardSkeleton />
              <MetricCardSkeleton />
              <MetricCardSkeleton />
            </div>
          </div>

          <div className="flex w-full max-w-[280px] flex-col gap-3">
            <PulseBlock className="h-12 w-full" />
            <PulseBlock className="h-12 w-full" />
          </div>
        </div>
      </div>
    </section>
  );
}

function FilterSkeleton() {
  return (
    <section className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-[0_14px_38px_rgba(15,23,42,0.05)] sm:p-7">
      <PulseBlock className="h-4 w-28" />
      <PulseBlock className="mt-3 h-8 w-48" />
      <PulseBlock className="mt-3 h-4 w-full max-w-[560px]" />

      <div className="mt-6 grid grid-cols-1 gap-3 lg:grid-cols-[1fr_auto]">
        <PulseBlock className="h-12 w-full" />
        <PulseBlock className="h-12 w-36" />
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <PulseBlock className="h-11 w-20 rounded-2xl" />
        <PulseBlock className="h-11 w-24 rounded-2xl" />
        <PulseBlock className="h-11 w-24 rounded-2xl" />
        <PulseBlock className="h-11 w-20 rounded-2xl" />
        <PulseBlock className="h-11 w-20 rounded-2xl" />
      </div>
    </section>
  );
}

function MonitorCardSkeleton() {
  return (
    <article className="overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-[0_16px_40px_rgba(15,23,42,0.05)]">
      <div className="border-b border-slate-200 bg-[linear-gradient(180deg,#fcfdff_0%,#f7fbff_100%)] px-6 py-4">
        <div className="flex flex-wrap items-center gap-2">
          <PulseBlock className="h-7 w-16 rounded-full" />
          <PulseBlock className="h-7 w-20 rounded-full" />
          <PulseBlock className="h-7 w-24 rounded-full" />
          <PulseBlock className="h-7 w-24 rounded-full" />
        </div>
      </div>

      <div className="grid gap-6 px-6 py-6 xl:grid-cols-[minmax(0,1.15fr)_420px]">
        <div className="min-w-0">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 flex-1">
              <PulseBlock className="h-4 w-24" />
              <PulseBlock className="mt-3 h-10 w-full max-w-[360px]" />
              <PulseBlock className="mt-4 h-4 w-full max-w-[560px]" />
              <div className="mt-4 flex flex-wrap gap-2">
                <PulseBlock className="h-8 w-20 rounded-full" />
                <PulseBlock className="h-8 w-24 rounded-full" />
                <PulseBlock className="h-8 w-28 rounded-full" />
              </div>
            </div>

            <PulseBlock className="h-36 w-full max-w-[220px]" />
          </div>

          <PulseBlock className="mt-5 h-32 w-full" />

          <div className="mt-5 flex flex-wrap gap-2">
            <PulseBlock className="h-11 w-24" />
            <PulseBlock className="h-11 w-28" />
            <PulseBlock className="h-11 w-24" />
            <PulseBlock className="h-11 w-24" />
          </div>
        </div>

        <aside className="grid grid-cols-2 gap-3 sm:grid-cols-2 xl:grid-cols-2">
          <PulseBlock className="h-28 w-full" />
          <PulseBlock className="h-28 w-full" />
          <PulseBlock className="h-28 w-full" />
          <PulseBlock className="h-28 w-full" />
        </aside>
      </div>
    </article>
  );
}

export default function MonitorsLoading() {
  return (
    <main className="mx-auto max-w-7xl px-4 pb-14 pt-6 sm:px-6" aria-busy="true" aria-live="polite">
      <div className="space-y-6">
        <HeroSkeleton />
        <FilterSkeleton />

        <section className="space-y-4">
          <MonitorCardSkeleton />
          <MonitorCardSkeleton />
          <MonitorCardSkeleton />
        </section>
      </div>
    </main>
  );
}
function PulseBlock({
  className = "",
}: {
  className?: string;
}) {
  return <div className={`animate-pulse rounded-2xl bg-slate-200/80 ${className}`} />;
}

function ScoreCardSkeleton() {
  return (
    <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_12px_30px_rgba(15,23,42,0.05)]">
      <PulseBlock className="h-4 w-20" />
      <PulseBlock className="mt-4 h-10 w-24" />
      <div className="mt-3 h-2 rounded-full bg-slate-100">
        <PulseBlock className="h-2 w-2/3 rounded-full" />
      </div>
      <PulseBlock className="mt-3 h-4 w-full" />
      <PulseBlock className="mt-2 h-4 w-4/5" />
    </div>
  );
}

function HeroSkeleton() {
  return (
    <section className="overflow-hidden rounded-[34px] border border-slate-200 bg-white shadow-[0_18px_54px_rgba(15,23,42,0.06)]">
      <div className="bg-[linear-gradient(135deg,#eef5ff_0%,#f8fbff_46%,#ffffff_100%)] px-6 py-6 sm:px-8">
        <div className="flex flex-wrap items-center gap-2">
          <PulseBlock className="h-9 w-24 rounded-full" />
          <PulseBlock className="h-9 w-24 rounded-full" />
          <PulseBlock className="h-9 w-28 rounded-full" />
        </div>

        <div className="mt-6 grid gap-8 xl:grid-cols-[1.15fr_0.85fr]">
          <div className="min-w-0">
            <PulseBlock className="h-12 w-full max-w-[420px]" />
            <PulseBlock className="mt-4 h-4 w-full max-w-[520px]" />
            <PulseBlock className="mt-2 h-4 w-full max-w-[460px]" />

            <div className="mt-5 flex flex-wrap gap-2">
              <PulseBlock className="h-8 w-28 rounded-full" />
              <PulseBlock className="h-8 w-32 rounded-full" />
              <PulseBlock className="h-8 w-24 rounded-full" />
            </div>

            <div className="mt-6 grid gap-3 md:grid-cols-3">
              <PulseBlock className="h-24 w-full" />
              <PulseBlock className="h-24 w-full" />
              <PulseBlock className="h-24 w-full" />
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <PulseBlock className="h-40 w-full" />
            <PulseBlock className="h-12 w-full" />
            <PulseBlock className="h-12 w-full" />
            <PulseBlock className="h-12 w-full" />
          </div>
        </div>
      </div>
    </section>
  );
}

function SectionHeaderSkeleton() {
  return (
    <div>
      <PulseBlock className="h-4 w-24" />
      <PulseBlock className="mt-3 h-8 w-48" />
      <PulseBlock className="mt-3 h-4 w-full max-w-[620px]" />
    </div>
  );
}

function ReasonCardSkeleton() {
  return (
    <div className="rounded-[24px] border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap gap-2">
        <PulseBlock className="h-7 w-16 rounded-full" />
        <PulseBlock className="h-7 w-16 rounded-full" />
        <PulseBlock className="h-7 w-14 rounded-full" />
      </div>
      <PulseBlock className="mt-4 h-7 w-2/3" />
      <PulseBlock className="mt-3 h-4 w-full" />
      <PulseBlock className="mt-2 h-4 w-5/6" />
      <PulseBlock className="mt-2 h-4 w-3/4" />
    </div>
  );
}

function ActionCardSkeleton() {
  return (
    <div className="rounded-[24px] border border-slate-200 bg-slate-50/70 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap gap-2">
            <PulseBlock className="h-7 w-16 rounded-full" />
            <PulseBlock className="h-7 w-20 rounded-full" />
            <PulseBlock className="h-7 w-20 rounded-full" />
          </div>
          <PulseBlock className="mt-4 h-7 w-2/3" />
          <PulseBlock className="mt-3 h-4 w-full" />
          <PulseBlock className="mt-2 h-4 w-5/6" />
        </div>

        <div className="flex flex-col gap-2">
          <PulseBlock className="h-11 w-28" />
          <PulseBlock className="h-11 w-24" />
        </div>
      </div>

      <PulseBlock className="mt-4 h-24 w-full" />
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <PulseBlock className="h-28 w-full" />
        <PulseBlock className="h-28 w-full" />
      </div>
    </div>
  );
}

function TimelineRowSkeleton() {
  return (
    <div className="rounded-[24px] border border-slate-200 bg-slate-50/70 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <PulseBlock className="h-7 w-16 rounded-full" />
          <PulseBlock className="h-5 w-44" />
        </div>
        <PulseBlock className="h-4 w-32" />
      </div>
      <PulseBlock className="mt-3 h-4 w-full" />
      <PulseBlock className="mt-2 h-4 w-4/5" />
    </div>
  );
}

export default function MonitorDetailLoading() {
  return (
    <main className="mx-auto max-w-7xl px-4 pb-14 pt-6 sm:px-6" aria-busy="true" aria-live="polite">
      <div className="space-y-6">
        <HeroSkeleton />

        <section className="grid gap-4 md:grid-cols-2 2xl:grid-cols-4">
          <ScoreCardSkeleton />
          <ScoreCardSkeleton />
          <ScoreCardSkeleton />
          <ScoreCardSkeleton />
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.02fr_0.98fr]">
          <section className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-[0_14px_38px_rgba(15,23,42,0.05)] sm:p-7">
            <SectionHeaderSkeleton />
            <div className="mt-6 space-y-3">
              <ReasonCardSkeleton />
              <ReasonCardSkeleton />
              <ReasonCardSkeleton />
            </div>
          </section>

          <section className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-[0_14px_38px_rgba(15,23,42,0.05)] sm:p-7">
            <SectionHeaderSkeleton />
            <div className="mt-6 space-y-4">
              <ActionCardSkeleton />
              <ActionCardSkeleton />
            </div>
          </section>
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.02fr_0.98fr]">
          <section className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-[0_14px_38px_rgba(15,23,42,0.05)] sm:p-7">
            <SectionHeaderSkeleton />
            <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <PulseBlock className="h-24 w-full" />
              <PulseBlock className="h-24 w-full" />
              <PulseBlock className="h-24 w-full" />
              <PulseBlock className="h-24 w-full" />
            </div>
            <div className="mt-4 grid gap-4 xl:grid-cols-2">
              <PulseBlock className="h-40 w-full" />
              <PulseBlock className="h-40 w-full" />
            </div>
          </section>

          <section className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-[0_14px_38px_rgba(15,23,42,0.05)] sm:p-7">
            <SectionHeaderSkeleton />
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <PulseBlock className="h-24 w-full" />
              <PulseBlock className="h-24 w-full" />
              <PulseBlock className="h-24 w-full" />
              <PulseBlock className="h-24 w-full" />
            </div>
            <PulseBlock className="mt-4 h-28 w-full" />
          </section>
        </section>

        <section className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-[0_14px_38px_rgba(15,23,42,0.05)] sm:p-7">
          <SectionHeaderSkeleton />
          <div className="mt-6 space-y-3">
            <TimelineRowSkeleton />
            <TimelineRowSkeleton />
            <TimelineRowSkeleton />
            <TimelineRowSkeleton />
          </div>
        </section>
      </div>
    </main>
  );
}
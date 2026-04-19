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
      <div className="bg-[linear-gradient(135deg,#eef5ff_0%,#f8fbff_48%,#ffffff_100%)] px-6 py-6 sm:px-8">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0 max-w-4xl">
            <PulseBlock className="h-8 w-36 rounded-full" />
            <PulseBlock className="mt-5 h-12 w-full max-w-[320px]" />
            <PulseBlock className="mt-3 h-12 w-full max-w-[260px]" />

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

          <div className="flex w-full max-w-[220px] flex-col gap-3">
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
      <PulseBlock className="mt-3 h-8 w-44" />
      <PulseBlock className="mt-3 h-4 w-full max-w-[620px]" />
    </div>
  );
}

function InputSkeleton() {
  return (
    <div>
      <PulseBlock className="h-4 w-20" />
      <PulseBlock className="mt-2 h-12 w-full" />
      <PulseBlock className="mt-2 h-4 w-2/3" />
    </div>
  );
}

function TextareaSkeleton({
  tall = false,
}: {
  tall?: boolean;
}) {
  return (
    <div>
      <PulseBlock className="h-4 w-24" />
      <PulseBlock className={`mt-2 w-full rounded-[24px] ${tall ? "h-44" : "h-32"}`} />
      <PulseBlock className="mt-2 h-4 w-2/3" />
    </div>
  );
}

function SectionCardSkeleton({
  twoColumn = true,
  withTextarea = false,
}: {
  twoColumn?: boolean;
  withTextarea?: boolean;
}) {
  return (
    <section className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-[0_14px_38px_rgba(15,23,42,0.05)] sm:p-7">
      <SectionHeaderSkeleton />

      <div className={`mt-6 grid gap-5 ${twoColumn ? "md:grid-cols-2" : ""}`}>
        <InputSkeleton />
        {twoColumn ? <InputSkeleton /> : null}
        {twoColumn ? <InputSkeleton /> : null}
        {twoColumn ? <InputSkeleton /> : null}
      </div>

      {withTextarea ? (
        <div className="mt-5">
          <TextareaSkeleton tall />
        </div>
      ) : null}
    </section>
  );
}

function SubmitSkeleton() {
  return (
    <section className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-[0_14px_38px_rgba(15,23,42,0.05)] sm:p-7">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <PulseBlock className="h-4 w-20" />
          <PulseBlock className="mt-3 h-8 w-40" />
          <PulseBlock className="mt-3 h-4 w-full max-w-[560px]" />
          <PulseBlock className="mt-2 h-4 w-full max-w-[460px]" />
        </div>

        <div className="flex flex-wrap gap-3">
          <PulseBlock className="h-12 w-24" />
          <PulseBlock className="h-12 w-32" />
        </div>
      </div>
    </section>
  );
}

export default function NewMonitorLoading() {
  return (
    <main
      className="mx-auto max-w-6xl px-4 pb-14 pt-6 sm:px-6"
      aria-busy="true"
      aria-live="polite"
    >
      <div className="space-y-6">
        <HeroSkeleton />

        <SectionCardSkeleton />
        <SectionCardSkeleton />
        <SectionCardSkeleton withTextarea />
        <SectionCardSkeleton withTextarea />

        <SubmitSkeleton />
      </div>
    </main>
  );
}
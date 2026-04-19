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
        <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0 max-w-4xl">
            <PulseBlock className="h-8 w-40 rounded-full" />
            <PulseBlock className="mt-5 h-12 w-full max-w-[360px]" />
            <PulseBlock className="mt-3 h-4 w-full max-w-[720px]" />
            <PulseBlock className="mt-2 h-4 w-full max-w-[620px]" />
            <PulseBlock className="mt-2 h-4 w-full max-w-[540px]" />

            <div className="mt-6 flex flex-wrap gap-2">
              <PulseBlock className="h-11 w-28 rounded-2xl" />
              <PulseBlock className="h-11 w-24 rounded-2xl" />
              <PulseBlock className="h-11 w-24 rounded-2xl" />
              <PulseBlock className="h-11 w-20 rounded-2xl" />
            </div>
          </div>

          <div className="w-full max-w-[340px] rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_10px_24px_rgba(15,23,42,0.04)]">
            <PulseBlock className="h-4 w-28" />
            <PulseBlock className="mt-3 h-10 w-20" />
            <PulseBlock className="mt-3 h-4 w-full" />
            <PulseBlock className="mt-2 h-4 w-5/6" />
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

function ContextCardSkeleton() {
  return <PulseBlock className="h-32 w-full" />;
}

function FieldSkeleton({
  textarea = false,
}: {
  textarea?: boolean;
}) {
  return (
    <div>
      <PulseBlock className="h-4 w-20" />
      <PulseBlock className={`mt-2 w-full ${textarea ? "h-56 rounded-[24px]" : "h-12 rounded-2xl"}`} />
      <PulseBlock className="mt-2 h-4 w-2/3" />
    </div>
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
          <PulseBlock className="h-12 w-28" />
        </div>
      </div>
    </section>
  );
}

export default function CommunityWriteLoading() {
  return (
    <main
      className="mx-auto max-w-6xl px-4 pb-14 pt-6 sm:px-6"
      aria-busy="true"
      aria-live="polite"
    >
      <div className="space-y-6">
        <HeroSkeleton />

        <section className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-[0_14px_38px_rgba(15,23,42,0.05)] sm:p-7">
          <SectionHeaderSkeleton />
          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <ContextCardSkeleton />
            <ContextCardSkeleton />
            <ContextCardSkeleton />
          </div>
        </section>

        <section className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-[0_14px_38px_rgba(15,23,42,0.05)] sm:p-7">
          <SectionHeaderSkeleton />
          <div className="mt-6 space-y-5">
            <FieldSkeleton />
            <FieldSkeleton textarea />
          </div>
        </section>

        <SubmitSkeleton />
      </div>
    </main>
  );
}
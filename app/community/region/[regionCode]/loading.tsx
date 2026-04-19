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
            <div className="flex flex-wrap items-center gap-3">
              <PulseBlock className="h-10 w-28 rounded-full" />
            </div>

            <PulseBlock className="mt-6 h-8 w-36 rounded-full" />
            <PulseBlock className="mt-5 h-12 w-full max-w-[360px]" />
            <PulseBlock className="mt-3 h-4 w-full max-w-[720px]" />
            <PulseBlock className="mt-2 h-4 w-full max-w-[640px]" />
            <PulseBlock className="mt-2 h-4 w-full max-w-[560px]" />

            <div className="mt-6">
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

function SectionHeaderSkeleton() {
  return (
    <div>
      <PulseBlock className="h-4 w-24" />
      <PulseBlock className="mt-3 h-8 w-44" />
      <PulseBlock className="mt-3 h-4 w-full max-w-[620px]" />
    </div>
  );
}

function CategoryCardSkeleton() {
  return (
    <article className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-[0_8px_20px_rgba(15,23,42,0.03)]">
      <div className="flex flex-wrap gap-2">
        <PulseBlock className="h-7 w-24 rounded-full" />
        <PulseBlock className="h-7 w-16 rounded-full" />
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        <PulseBlock className="h-20 w-full" />
        <PulseBlock className="h-20 w-full" />
        <PulseBlock className="h-20 w-full" />
      </div>

      <PulseBlock className="mt-4 h-4 w-full" />
      <PulseBlock className="mt-2 h-4 w-5/6" />

      <div className="mt-4 flex flex-wrap gap-2">
        <PulseBlock className="h-10 w-24" />
        <PulseBlock className="h-10 w-24" />
      </div>
    </article>
  );
}

function PostCardSkeleton() {
  return (
    <article className="rounded-[24px] border border-slate-200 bg-slate-50 p-5">
      <div className="flex flex-wrap gap-2">
        <PulseBlock className="h-7 w-24 rounded-full" />
        <PulseBlock className="h-7 w-20 rounded-full" />
        <PulseBlock className="h-7 w-16 rounded-full" />
      </div>

      <PulseBlock className="mt-3 h-7 w-4/5" />
      <PulseBlock className="mt-3 h-4 w-full" />
      <PulseBlock className="mt-2 h-4 w-full" />
      <PulseBlock className="mt-2 h-4 w-4/5" />

      <div className="mt-4 flex flex-wrap gap-2">
        <PulseBlock className="h-4 w-20" />
        <PulseBlock className="h-4 w-16" />
        <PulseBlock className="h-4 w-16" />
      </div>
    </article>
  );
}

function SignalCardSkeleton() {
  return (
    <article className="rounded-[24px] border border-slate-200 bg-slate-50 p-5">
      <div className="flex flex-wrap gap-2">
        <PulseBlock className="h-7 w-20 rounded-full" />
        <PulseBlock className="h-7 w-20 rounded-full" />
      </div>

      <div className="mt-4 grid grid-cols-[1fr_96px] gap-4">
        <div className="min-w-0">
          <PulseBlock className="h-6 w-4/5" />
          <PulseBlock className="mt-3 h-4 w-full" />
          <PulseBlock className="mt-2 h-4 w-5/6" />
          <PulseBlock className="mt-3 h-4 w-28" />
        </div>

        <PulseBlock className="h-24 w-full" />
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <PulseBlock className="h-10 w-24" />
        <PulseBlock className="h-10 w-28" />
        <PulseBlock className="h-10 w-24" />
      </div>
    </article>
  );
}

export default function RegionCommunityLoading() {
  return (
    <main
      className="mx-auto max-w-7xl px-4 pb-14 pt-6 sm:px-6"
      aria-busy="true"
      aria-live="polite"
    >
      <div className="space-y-6">
        <HeroSkeleton />

        <section className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-[0_14px_38px_rgba(15,23,42,0.05)] sm:p-7">
          <SectionHeaderSkeleton />

          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <CategoryCardSkeleton />
            <CategoryCardSkeleton />
            <CategoryCardSkeleton />
            <CategoryCardSkeleton />
            <CategoryCardSkeleton />
            <CategoryCardSkeleton />
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.02fr_0.98fr]">
          <section className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-[0_14px_38px_rgba(15,23,42,0.05)] sm:p-7">
            <SectionHeaderSkeleton />
            <div className="mt-6 space-y-4">
              <PostCardSkeleton />
              <PostCardSkeleton />
              <PostCardSkeleton />
            </div>
          </section>

          <section className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-[0_14px_38px_rgba(15,23,42,0.05)] sm:p-7">
            <SectionHeaderSkeleton />
            <div className="mt-6 space-y-4">
              <SignalCardSkeleton />
              <SignalCardSkeleton />
              <SignalCardSkeleton />
            </div>
          </section>
        </section>
      </div>
    </main>
  );
}
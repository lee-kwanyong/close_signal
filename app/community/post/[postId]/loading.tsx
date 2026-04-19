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
        <div className="flex flex-wrap items-center gap-3">
          <PulseBlock className="h-10 w-32 rounded-full" />
          <PulseBlock className="h-10 w-28 rounded-full" />
          <PulseBlock className="h-10 w-24 rounded-full" />
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          <PulseBlock className="h-7 w-24 rounded-full" />
          <PulseBlock className="h-7 w-16 rounded-full" />
          <PulseBlock className="h-7 w-20 rounded-full" />
        </div>

        <div className="mt-5 grid gap-8 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="min-w-0">
            <PulseBlock className="h-12 w-full max-w-[520px]" />
            <div className="mt-5 flex flex-wrap gap-3">
              <PulseBlock className="h-4 w-24" />
              <PulseBlock className="h-4 w-20" />
              <PulseBlock className="h-4 w-20" />
              <PulseBlock className="h-4 w-20" />
            </div>

            <div className="mt-6 grid gap-3 md:grid-cols-3">
              <PulseBlock className="h-24 w-full" />
              <PulseBlock className="h-24 w-full" />
              <PulseBlock className="h-24 w-full" />
            </div>
          </div>

          <div className="grid gap-3">
            <PulseBlock className="h-32 w-full" />
            <PulseBlock className="h-32 w-full" />
            <PulseBlock className="h-32 w-full" />
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
      <PulseBlock className="mt-3 h-8 w-40" />
      <PulseBlock className="mt-3 h-4 w-full max-w-[620px]" />
    </div>
  );
}

function BodyCardSkeleton() {
  return <PulseBlock className="h-80 w-full rounded-[24px]" />;
}

function SignalCardSkeleton() {
  return (
    <div className="space-y-4">
      <div className="rounded-[26px] border border-slate-200 bg-slate-50 p-5">
        <div className="flex flex-wrap gap-2">
          <PulseBlock className="h-7 w-20 rounded-full" />
          <PulseBlock className="h-7 w-20 rounded-full" />
        </div>
        <PulseBlock className="mt-4 h-8 w-3/4" />
        <PulseBlock className="mt-3 h-4 w-full" />
        <PulseBlock className="mt-2 h-4 w-5/6" />
        <div className="mt-4 flex flex-wrap gap-2">
          <PulseBlock className="h-10 w-24" />
          <PulseBlock className="h-10 w-24" />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <PulseBlock className="h-32 w-full" />
        <PulseBlock className="h-32 w-full" />
      </div>
    </div>
  );
}

function CommentItemSkeleton() {
  return (
    <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
      <div className="flex flex-wrap gap-2">
        <PulseBlock className="h-4 w-24" />
        <PulseBlock className="h-4 w-20" />
      </div>
      <PulseBlock className="mt-3 h-4 w-full" />
      <PulseBlock className="mt-2 h-4 w-full" />
      <PulseBlock className="mt-2 h-4 w-4/5" />
    </div>
  );
}

function CommentFormSkeleton() {
  return (
    <div className="rounded-[24px] border border-slate-200 bg-white p-5">
      <PulseBlock className="h-5 w-24" />
      <PulseBlock className="mt-4 h-36 w-full rounded-[20px]" />
      <div className="mt-3 flex justify-end">
        <PulseBlock className="h-11 w-28" />
      </div>
    </div>
  );
}

function RelatedSignalCardSkeleton() {
  return (
    <article className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
      <div className="flex flex-wrap gap-2">
        <PulseBlock className="h-7 w-20 rounded-full" />
        <PulseBlock className="h-7 w-20 rounded-full" />
      </div>
      <PulseBlock className="mt-3 h-6 w-4/5" />
      <PulseBlock className="mt-3 h-4 w-full" />
      <PulseBlock className="mt-2 h-4 w-5/6" />
      <PulseBlock className="mt-3 h-4 w-40" />
      <div className="mt-4 flex flex-wrap gap-2">
        <PulseBlock className="h-10 w-24" />
        <PulseBlock className="h-10 w-28" />
      </div>
    </article>
  );
}

export default function CommunityPostDetailLoading() {
  return (
    <main
      className="mx-auto max-w-7xl px-4 pb-14 pt-6 sm:px-6"
      aria-busy="true"
      aria-live="polite"
    >
      <div className="space-y-6">
        <HeroSkeleton />

        <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
          <section className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-[0_14px_38px_rgba(15,23,42,0.05)] sm:p-7">
            <SectionHeaderSkeleton />
            <div className="mt-6">
              <BodyCardSkeleton />
            </div>
          </section>

          <section className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-[0_14px_38px_rgba(15,23,42,0.05)] sm:p-7">
            <SectionHeaderSkeleton />
            <div className="mt-6">
              <SignalCardSkeleton />
            </div>
          </section>
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.02fr_0.98fr]">
          <section className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-[0_14px_38px_rgba(15,23,42,0.05)] sm:p-7">
            <SectionHeaderSkeleton />
            <div className="mt-6 space-y-4">
              <CommentItemSkeleton />
              <CommentItemSkeleton />
              <CommentItemSkeleton />
            </div>

            <div className="mt-6">
              <CommentFormSkeleton />
            </div>
          </section>

          <section className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-[0_14px_38px_rgba(15,23,42,0.05)] sm:p-7">
            <SectionHeaderSkeleton />
            <div className="mt-6 space-y-4">
              <RelatedSignalCardSkeleton />
              <RelatedSignalCardSkeleton />
              <RelatedSignalCardSkeleton />
            </div>
          </section>
        </section>
      </div>
    </main>
  );
}
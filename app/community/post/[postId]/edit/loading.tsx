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
          <PulseBlock className="h-10 w-28 rounded-full" />
          <PulseBlock className="h-10 w-24 rounded-full" />
        </div>

        <div className="mt-6 grid gap-8 xl:grid-cols-[1.08fr_0.92fr]">
          <div className="min-w-0">
            <PulseBlock className="h-8 w-32 rounded-full" />
            <PulseBlock className="mt-5 h-12 w-full max-w-[280px]" />
            <PulseBlock className="mt-3 h-4 w-full max-w-[700px]" />
            <PulseBlock className="mt-2 h-4 w-full max-w-[620px]" />

            <div className="mt-6 flex flex-wrap gap-2">
              <PulseBlock className="h-7 w-24 rounded-full" />
              <PulseBlock className="h-7 w-24 rounded-full" />
              <PulseBlock className="h-7 w-20 rounded-full" />
            </div>
          </div>

          <div className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-[0_14px_36px_rgba(15,23,42,0.05)]">
            <PulseBlock className="h-4 w-36" />

            <div className="mt-5 grid grid-cols-2 gap-3">
              <PulseBlock className="h-24 w-full" />
              <PulseBlock className="h-24 w-full" />
              <PulseBlock className="h-24 w-full" />
              <PulseBlock className="h-24 w-full" />
              <PulseBlock className="h-24 w-full" />
              <PulseBlock className="h-24 w-full" />
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

function FieldSkeleton() {
  return (
    <div>
      <PulseBlock className="h-4 w-20" />
      <PulseBlock className="mt-2 h-12 w-full" />
      <PulseBlock className="mt-2 h-4 w-2/3" />
    </div>
  );
}

function TextareaSkeleton() {
  return (
    <div>
      <PulseBlock className="h-4 w-20" />
      <PulseBlock className="mt-2 h-72 w-full rounded-[24px]" />
      <PulseBlock className="mt-2 h-4 w-2/3" />
    </div>
  );
}

function EditFormSkeleton() {
  return (
    <section className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-[0_14px_38px_rgba(15,23,42,0.05)] sm:p-7">
      <SectionHeaderSkeleton />

      <div className="mt-6 grid gap-5 md:grid-cols-2">
        <FieldSkeleton />
        <FieldSkeleton />
        <div className="md:col-span-2">
          <FieldSkeleton />
        </div>
        <div className="md:col-span-2">
          <TextareaSkeleton />
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <PulseBlock className="h-12 w-28" />
        <PulseBlock className="h-12 w-24" />
      </div>
    </section>
  );
}

function SideCardSkeleton({
  destructive = false,
}: {
  destructive?: boolean;
}) {
  return (
    <section className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-[0_14px_38px_rgba(15,23,42,0.05)]">
      <PulseBlock className="h-4 w-20" />
      <PulseBlock className="mt-3 h-8 w-32" />
      <PulseBlock className="mt-3 h-4 w-full" />
      <PulseBlock className="mt-2 h-4 w-5/6" />
      <PulseBlock className={`mt-4 h-12 w-full ${destructive ? "" : ""}`} />
    </section>
  );
}

export default function CommunityPostEditLoading() {
  return (
    <main
      className="mx-auto max-w-6xl px-4 pb-14 pt-6 sm:px-6"
      aria-busy="true"
      aria-live="polite"
    >
      <div className="space-y-6">
        <HeroSkeleton />

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
          <EditFormSkeleton />

          <aside className="space-y-6">
            <SideCardSkeleton destructive />
            <SideCardSkeleton />
          </aside>
        </div>
      </div>
    </main>
  );
}
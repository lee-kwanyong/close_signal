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
            <PulseBlock className="h-8 w-32 rounded-full" />
            <PulseBlock className="mt-5 h-12 w-full max-w-[260px]" />

            <div className="mt-5 space-y-3">
              <PulseBlock className="h-4 w-full max-w-[700px]" />
              <PulseBlock className="h-4 w-full max-w-[620px]" />
              <PulseBlock className="h-4 w-full max-w-[520px]" />
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <PulseBlock className="h-12 w-36" />
              <PulseBlock className="h-12 w-36" />
            </div>
          </div>

          <div className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-[0_14px_36px_rgba(15,23,42,0.05)]">
            <div className="flex items-center gap-4 rounded-[24px] border border-slate-200 bg-slate-50 p-4">
              <PulseBlock className="h-16 w-16 rounded-full" />

              <div className="min-w-0 flex-1">
                <PulseBlock className="h-6 w-32" />
                <PulseBlock className="mt-2 h-4 w-full" />
                <PulseBlock className="mt-2 h-4 w-3/4" />
              </div>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3">
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

function FormFieldSkeleton() {
  return (
    <div>
      <PulseBlock className="h-4 w-24" />
      <PulseBlock className="mt-2 h-12 w-full" />
      <PulseBlock className="mt-2 h-4 w-2/3" />
    </div>
  );
}

function AccountFormSkeleton() {
  return (
    <section className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-[0_14px_38px_rgba(15,23,42,0.05)] sm:p-7">
      <PulseBlock className="h-4 w-28" />
      <PulseBlock className="mt-3 h-8 w-48" />
      <PulseBlock className="mt-3 h-4 w-full max-w-[560px]" />

      <div className="mt-6 grid gap-5 md:grid-cols-2">
        <FormFieldSkeleton />
        <FormFieldSkeleton />
        <FormFieldSkeleton />
        <FormFieldSkeleton />

        <div className="md:col-span-2">
          <FormFieldSkeleton />
        </div>

        <div className="md:col-span-2">
          <PulseBlock className="h-4 w-20" />
          <PulseBlock className="mt-2 h-48 w-full" />
          <PulseBlock className="mt-2 h-4 w-2/3" />
        </div>
      </div>

      <PulseBlock className="mt-6 h-24 w-full" />

      <div className="mt-6 flex flex-wrap justify-end gap-3">
        <PulseBlock className="h-11 w-32" />
        <PulseBlock className="h-11 w-28" />
      </div>
    </section>
  );
}

function SideCardSkeleton() {
  return (
    <section className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-[0_14px_38px_rgba(15,23,42,0.05)]">
      <PulseBlock className="h-4 w-28" />
      <PulseBlock className="mt-3 h-6 w-32" />
      <PulseBlock className="mt-3 h-4 w-full" />

      <div className="mt-4 space-y-3">
        <PulseBlock className="h-20 w-full" />
        <PulseBlock className="h-20 w-full" />
        <PulseBlock className="h-20 w-full" />
      </div>
    </section>
  );
}

export default function AccountLoading() {
  return (
    <main
      className="mx-auto max-w-6xl px-4 pb-14 pt-6 sm:px-6"
      aria-busy="true"
      aria-live="polite"
    >
      <div className="space-y-6">
        <HeroSkeleton />

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
          <AccountFormSkeleton />

          <aside className="space-y-6">
            <SideCardSkeleton />
            <SideCardSkeleton />
          </aside>
        </div>
      </div>
    </main>
  );
}
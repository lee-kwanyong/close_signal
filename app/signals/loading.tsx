export default function SignalsLoadingPage() {
  return (
    <main className="min-h-screen bg-sky-50 text-slate-900">
      <section className="mx-auto max-w-7xl px-3 py-4 sm:px-4 sm:py-5">
        <div className="space-y-4 animate-pulse">
          <section className="rounded-[24px] border border-sky-100 bg-sky-50 p-4 shadow-[0_10px_26px_rgba(14,165,233,0.08)] sm:p-5">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
              <div className="min-w-0 flex-1">
                <div className="h-3 w-36 rounded-full bg-slate-200" />
                <div className="mt-3 h-8 w-64 rounded-full bg-slate-200" />
                <div className="mt-2 h-4 w-full max-w-xl rounded-full bg-slate-200" />
              </div>

              <div className="flex gap-2">
                <div className="h-9 w-24 rounded-xl bg-slate-200" />
                <div className="h-9 w-24 rounded-xl bg-slate-200" />
              </div>
            </div>

            <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <div
                  key={`metric-skeleton-${index}`}
                  className="rounded-2xl border border-slate-200 bg-white p-3"
                >
                  <div className="h-3 w-24 rounded-full bg-slate-200" />
                  <div className="mt-2 h-6 w-20 rounded-full bg-slate-200" />
                  <div className="mt-2 h-3 w-full rounded-full bg-slate-200" />
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-[22px] border border-sky-100 bg-sky-50 p-3.5 shadow-[0_10px_24px_rgba(14,165,233,0.08)] sm:p-4">
            <div className="h-10 w-full rounded-xl bg-white" />
            <div className="mt-2 flex flex-wrap gap-2">
              {Array.from({ length: 5 }).map((_, index) => (
                <div key={`chip-1-${index}`} className="h-9 w-24 rounded-full bg-white" />
              ))}
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={`chip-2-${index}`} className="h-9 w-20 rounded-full bg-white" />
              ))}
            </div>
          </section>

          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_280px]">
            <section className="rounded-[24px] border border-sky-100 bg-sky-50 p-3.5 shadow-[0_10px_24px_rgba(14,165,233,0.08)] sm:p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <div className="h-3 w-24 rounded-full bg-slate-200" />
                  <div className="mt-2 h-6 w-40 rounded-full bg-slate-200" />
                </div>
                <div className="h-3 w-40 rounded-full bg-slate-200" />
              </div>

              <div className="space-y-2.5">
                {Array.from({ length: 5 }).map((_, index) => (
                  <div
                    key={`row-skeleton-${index}`}
                    className="rounded-[18px] border border-sky-100 bg-white p-3"
                  >
                    <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap gap-1.5">
                          <div className="h-5 w-20 rounded-full bg-slate-200" />
                          <div className="h-5 w-24 rounded-full bg-slate-200" />
                          <div className="h-5 w-24 rounded-full bg-slate-200" />
                          <div className="h-5 w-20 rounded-full bg-slate-200" />
                        </div>

                        <div className="mt-2 h-6 w-72 rounded-full bg-slate-200" />
                        <div className="mt-2 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                          {Array.from({ length: 4 }).map((__, metricIndex) => (
                            <div
                              key={`metric-box-${index}-${metricIndex}`}
                              className="rounded-xl border border-sky-100 bg-sky-50 px-2.5 py-2"
                            >
                              <div className="h-3 w-16 rounded-full bg-slate-200" />
                              <div className="mt-2 h-4 w-20 rounded-full bg-slate-200" />
                            </div>
                          ))}
                        </div>

                        <div className="mt-2 h-10 rounded-xl bg-slate-100" />
                      </div>

                      <div className="grid grid-cols-2 gap-2 xl:w-[220px] xl:grid-cols-1">
                        <div className="h-9 rounded-xl bg-slate-200" />
                        <div className="h-9 rounded-xl bg-slate-200" />
                        <div className="h-9 rounded-xl bg-slate-200" />
                        <div className="h-9 rounded-xl bg-slate-200" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <aside className="space-y-4">
              <div className="rounded-[24px] border border-sky-100 bg-sky-50 p-4 shadow-[0_10px_24px_rgba(14,165,233,0.08)]">
                <div className="h-3 w-24 rounded-full bg-slate-200" />
                <div className="mt-2 h-6 w-28 rounded-full bg-slate-200" />
                <div className="mt-3 space-y-2">
                  <div className="h-14 rounded-xl bg-white" />
                  <div className="h-14 rounded-xl bg-white" />
                  <div className="h-14 rounded-xl bg-white" />
                </div>
              </div>

              <div className="rounded-[24px] border border-sky-100 bg-sky-50 p-4 shadow-[0_10px_24px_rgba(14,165,233,0.08)]">
                <div className="h-3 w-20 rounded-full bg-slate-200" />
                <div className="mt-2 h-6 w-24 rounded-full bg-slate-200" />
                <div className="mt-3 space-y-2">
                  {Array.from({ length: 6 }).map((_, index) => (
                    <div key={`spotlight-${index}`} className="h-14 rounded-xl bg-white" />
                  ))}
                </div>
              </div>
            </aside>
          </div>
        </div>
      </section>
    </main>
  );
}
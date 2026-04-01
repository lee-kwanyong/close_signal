export default function Loading() {
  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="animate-pulse space-y-6">
          <div className="rounded-3xl border border-slate-200 bg-white p-8">
            <div className="h-4 w-32 rounded bg-slate-200" />
            <div className="mt-4 h-10 w-2/3 rounded bg-slate-200" />
            <div className="mt-3 h-4 w-full max-w-2xl rounded bg-slate-200" />
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div
                key={index}
                className="rounded-2xl border border-slate-200 bg-white p-5"
              >
                <div className="h-4 w-24 rounded bg-slate-200" />
                <div className="mt-3 h-8 w-20 rounded bg-slate-200" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
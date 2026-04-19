function Pulse({
  className = "",
}: {
  className?: string;
}) {
  return <div className={`animate-pulse rounded-2xl bg-[#dfe9e5] ${className}`} />;
}

export default function Loading() {
  return (
    <main className="min-h-screen bg-[#fcfefd]">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="space-y-6">
          <div className="rounded-[1.75rem] border border-[#d7ece4] bg-white p-8 shadow-[0_12px_28px_rgba(31,122,99,0.05)]">
            <Pulse className="h-4 w-32" />
            <Pulse className="mt-4 h-10 w-2/3" />
            <Pulse className="mt-3 h-4 w-full max-w-2xl" />
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div
                key={index}
                className="rounded-[1.5rem] border border-[#d7ece4] bg-white p-5 shadow-[0_10px_24px_rgba(31,122,99,0.04)]"
              >
                <Pulse className="h-4 w-24" />
                <Pulse className="mt-3 h-8 w-20" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
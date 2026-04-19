import Link from "next/link";

const policyLinks = [
  { href: "/policies/terms", label: "이용약관" },
  { href: "/policies/ad", label: "광고 운영정책" },
  { href: "/policies/privacy", label: "개인정보처리방침" },
  { href: "/policies/operation", label: "서비스 운영정책" },
  { href: "/policies/dispute", label: "분쟁 처리정책" },
];

export default function AppFooter() {
  return (
    <footer className="mt-10 border-t border-slate-200 bg-[linear-gradient(180deg,#f8fbff_0%,#f4f8fd_100%)]">
      <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6">
        <div className="flex flex-col gap-4 rounded-[22px] border border-slate-200 bg-white px-5 py-4 shadow-[0_10px_24px_rgba(15,23,42,0.04)] sm:flex-row sm:items-center sm:justify-between">
          <Link href="/" className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-sky-200 bg-[linear-gradient(180deg,#eff6ff_0%,#dbeafe_100%)] text-sm font-black tracking-[0.08em] text-[#0B5CAB] shadow-[inset_0_1px_0_rgba(255,255,255,0.85)]">
              CS
            </div>

            <div className="min-w-0">
              <div className="truncate text-sm font-black tracking-[-0.02em] text-slate-950">
                클로징시그날
              </div>
              <div className="truncate text-xs text-slate-500">Policies</div>
            </div>
          </Link>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-slate-500">
            {policyLinks.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="font-medium transition hover:text-[#0B5CAB]"
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
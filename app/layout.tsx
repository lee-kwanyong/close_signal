import type { Metadata } from "next";
import "./globals.css";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Close Signal",
  description: "프렌차이즈 본사를 위한 출점·운영·부진점포 인텔리전스 대시보드",
};

async function AppHeader() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const navItems = [
    { href: "/", label: "대시보드" },
    { href: "/hq", label: "본사운영" },
    { href: "/rankings", label: "출점·위험 랭킹" },
    { href: "/signals", label: "상권 변화 신호" },
    { href: "/watchlist", label: "관심 후보지" },
  ];

  return (
    <header className="sticky top-0 z-50 border-b border-sky-100 bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-sky-500 text-sm font-bold text-white shadow-[0_10px_24px_rgba(14,165,233,0.28)]">
            CS
          </div>

          <div className="flex flex-col">
            <span className="text-[15px] font-semibold tracking-tight text-slate-950">
              Close Signal
            </span>
            <span className="hidden text-[11px] leading-none text-slate-500 sm:block">
              HQ Expansion & Store Intelligence
            </span>
          </div>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-xl px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-sky-50 hover:text-sky-700"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          {user ? (
            <>
              <Link
                href="/watchlist"
                className="hidden rounded-xl border border-sky-200 bg-sky-50 px-4 py-2 text-sm font-medium text-sky-700 transition hover:bg-sky-100 sm:inline-flex"
              >
                내 후보지
              </Link>

              <form action="/auth/signout" method="post">
                <button
                  type="submit"
                  className="inline-flex rounded-xl bg-sky-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-600"
                >
                  로그아웃
                </button>
              </form>
            </>
          ) : (
            <Link
              href="/auth/login"
              className="inline-flex rounded-xl bg-sky-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-600"
            >
              로그인
            </Link>
          )}
        </div>
      </div>

      <div className="border-t border-sky-100 bg-white md:hidden">
        <div className="mx-auto flex max-w-7xl items-center gap-1 overflow-x-auto px-4 py-2 sm:px-6">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-sky-50 hover:text-sky-700"
            >
              {item.label}
            </Link>
          ))}
        </div>
      </div>
    </header>
  );
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased">
        <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.12),_transparent_38%),linear-gradient(to_bottom,_#f8fbff,_#f8fafc)]">
          {await AppHeader()}
          {children}
        </div>
      </body>
    </html>
  );
}
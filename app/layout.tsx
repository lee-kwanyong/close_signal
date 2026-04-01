import type { Metadata } from "next";
import "./globals.css";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Close Signal",
  description: "사업장 상태 변화와 폐업 전조 신호를 모니터링하는 리스크 인텔리전스 대시보드",
};

async function AppHeader() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const navItems = [
    { href: "/", label: "대시보드" },
    { href: "/rankings", label: "리스크 랭킹" },
    { href: "/signals", label: "시그널" },
    { href: "/watchlist", label: "관심목록" },
  ];

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-950 text-sm font-semibold text-white shadow-sm">
            CS
          </div>
          <div className="flex flex-col">
            <span className="text-[15px] font-semibold tracking-tight text-slate-950">
              Close Signal
            </span>
            <span className="hidden text-[11px] leading-none text-slate-500 sm:block">
              Risk Intelligence Dashboard
            </span>
          </div>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-xl px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-950"
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
                className="hidden rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 sm:inline-flex"
              >
                내 관심목록
              </Link>
              <form action="/auth/signout" method="post">
                <button
                  type="submit"
                  className="inline-flex rounded-xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
                >
                  로그아웃
                </button>
              </form>
            </>
          ) : (
            <Link
              href="/auth/login"
              className="inline-flex rounded-xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              로그인
            </Link>
          )}
        </div>
      </div>

      <div className="border-t border-slate-200/70 bg-white md:hidden">
        <div className="mx-auto flex max-w-7xl items-center gap-1 overflow-x-auto px-4 py-2 sm:px-6">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-950"
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
      <body className="bg-slate-50 text-slate-900 antialiased">
        <div className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(148,163,184,0.10),transparent_28%)]">
          {await AppHeader()}
          {children}
        </div>
      </body>
    </html>
  );
}
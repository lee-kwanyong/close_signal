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

  const consumerNavItems = [
    { href: "/", label: "대시보드" },
    { href: "/rankings", label: "출점·위험 랭킹" },
    { href: "/signals", label: "상권 변화 신호" },
    { href: "/watchlist", label: "관심 후보지" },
  ];

  const hqNavItem = { href: "/hq", label: "본사운영" };

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/92 backdrop-blur">
      <div className="mx-auto flex min-h-16 w-full max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
        <Link href="/" className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#169BF4] text-sm font-black text-white shadow-[0_10px_24px_rgba(22,155,244,0.22)]">
            CS
          </div>

          <div className="min-w-0">
            <div className="truncate text-[22px] font-black tracking-[-0.04em] text-slate-950">
              Close Signal
            </div>
            <div className="hidden truncate text-[12px] text-slate-500 sm:block">
              대시보드는 소개, 데이터 확인은 랭킹·시그널
            </div>
          </div>
        </Link>

        <div className="ml-auto hidden items-center gap-4 lg:flex">
          <nav className="flex items-center gap-1">
            {consumerNavItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 hover:text-slate-950"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="h-7 w-px bg-slate-200" />

          <Link
            href={hqNavItem.href}
            className="inline-flex rounded-xl border border-sky-200 bg-sky-50 px-4 py-2 text-sm font-semibold text-[#0A6FD6] transition hover:bg-sky-100"
          >
            {hqNavItem.label}
          </Link>

          <div className="flex items-center gap-2">
            {user ? (
              <>
                <Link
                  href="/watchlist"
                  className="hidden rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 xl:inline-flex"
                >
                  내 후보지
                </Link>
                <form action="/auth/signout" method="post">
                  <button
                    type="submit"
                    className="inline-flex rounded-xl bg-[#169BF4] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#0A84E0]"
                  >
                    로그아웃
                  </button>
                </form>
              </>
            ) : (
              <Link
                href="/auth/login"
                className="inline-flex rounded-xl bg-[#169BF4] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#0A84E0]"
              >
                로그인
              </Link>
            )}
          </div>
        </div>
      </div>

      <div className="border-t border-slate-200/70 bg-white lg:hidden">
        <div className="mx-auto flex max-w-7xl items-center gap-2 overflow-x-auto px-4 py-2 sm:px-6">
          {consumerNavItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="shrink-0 rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700"
            >
              {item.label}
            </Link>
          ))}
          <Link
            href={hqNavItem.href}
            className="shrink-0 rounded-full border border-sky-200 bg-sky-50 px-3 py-2 text-xs font-semibold text-[#0A6FD6]"
          >
            {hqNavItem.label}
          </Link>
          {user ? (
            <form action="/auth/signout" method="post" className="shrink-0">
              <button
                type="submit"
                className="rounded-full bg-[#169BF4] px-3 py-2 text-xs font-semibold text-white"
              >
                로그아웃
              </button>
            </form>
          ) : (
            <Link
              href="/auth/login"
              className="shrink-0 rounded-full bg-[#169BF4] px-3 py-2 text-xs font-semibold text-white"
            >
              로그인
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased">
        <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(22,155,244,0.08),_transparent_38%),linear-gradient(to_bottom,_#f8fafc,_#f8fafc)]">
          <AppHeader />
          {children}
        </div>
      </body>
    </html>
  );
}
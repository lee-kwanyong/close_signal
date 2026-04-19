import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import TopNav from "./TopNav";
import MobileNav from "./MobileNav";

export const dynamic = "force-dynamic";

export default async function AppHeader() {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isLoggedIn = !!user;
  const isAdmin = user?.email === "koliie9039@gmail.com";

  const serviceStatusText = isLoggedIn
    ? "개입 워크스페이스 연결됨"
    : "비회원 모드 · 공개 화면 이용 가능";

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/90 bg-white/95 shadow-[0_8px_24px_rgba(15,23,42,0.06)] backdrop-blur-xl">
      <div className="border-b border-slate-200 bg-[linear-gradient(90deg,#eef5ff_0%,#f8fbff_46%,#ffffff_100%)]">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-2 sm:px-6">
          <div className="flex min-w-0 items-center gap-2 text-[12px] font-semibold text-slate-600">
            <span className="inline-flex h-7 shrink-0 items-center rounded-full border border-sky-200 bg-sky-50 px-3 text-[11px] font-extrabold tracking-[0.16em] text-[#0B5CAB]">
              운영중
            </span>
            <span className="truncate">사업장 중심 위험 탐지 · 개입 · 추적 서비스</span>
          </div>

          <div className="hidden min-w-0 items-center gap-2 text-[12px] text-slate-500 lg:flex">
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
            <span className="truncate">{serviceStatusText}</span>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="flex flex-col gap-4 py-4 xl:flex-row xl:items-center xl:justify-between xl:gap-6">
          <div className="flex min-w-0 items-start gap-4">
            <Link href="/" className="flex min-w-0 items-center gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[20px] border border-sky-200 bg-[linear-gradient(180deg,#eff6ff_0%,#dbeafe_100%)] text-base font-black tracking-[0.08em] text-[#0B5CAB] shadow-[inset_0_1px_0_rgba(255,255,255,0.85),0_10px_22px_rgba(15,23,42,0.08)]">
                CS
              </div>

              <div className="min-w-0">
                <div className="truncate text-[11px] font-extrabold uppercase tracking-[0.24em] text-[#0B5CAB]">
                  Closing Signal
                </div>
                <div className="mt-1 truncate text-[24px] font-black tracking-[-0.04em] text-slate-950">
                  클로징시그날
                </div>
                <div className="mt-1 truncate text-sm text-slate-600">
                  사업장 위험 조기경보 · 마지막 기회 개입 운영시스템
                </div>
              </div>
            </Link>
          </div>

          <div className="hidden xl:block">
            <TopNav isLoggedIn={isLoggedIn} isAdmin={isAdmin} />
          </div>
        </div>
      </div>

      <div className="xl:hidden">
        <MobileNav isLoggedIn={isLoggedIn} isAdmin={isAdmin} />
      </div>
    </header>
  );
}
import Link from "next/link";
import { redirect } from "next/navigation";

import { supabaseServer } from "@/lib/supabase/server";
import { loginAction } from "./actions";

export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function one(value: string | string[] | undefined) {
  return typeof value === "string" ? value.trim() : "";
}

function safeDecode(value: string) {
  if (!value) return "";
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function safeNextPath(value: string) {
  const next = value.trim();

  if (!next) return "/";
  if (!next.startsWith("/")) return "/";
  if (next.startsWith("//")) return "/";
  if (next === "/auth/login") return "/";

  return next;
}

function targetLabel(next: string) {
  if (next.startsWith("/monitors")) return "모니터 화면으로 이동";
  if (next.startsWith("/community")) return "커뮤니티 화면으로 이동";
  if (next.startsWith("/watchlist")) return "관심조합 화면으로 이동";
  if (next.startsWith("/account")) return "내 계정 화면으로 이동";
  return "로그인 후 기본 화면으로 이동";
}

function InfoCard({
  title,
  body,
}: {
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-[24px] border border-slate-200 bg-white p-4">
      <div className="text-base font-black tracking-[-0.02em] text-slate-950">{title}</div>
      <p className="mt-2 text-sm leading-7 text-slate-600">{body}</p>
    </div>
  );
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams?: SearchParams;
}) {
  const sp = (await searchParams) ?? {};
  const next = safeNextPath(one(sp.next));
  const error = safeDecode(one(sp.error));

  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect(next || "/");
  }

  return (
    <main className="mx-auto max-w-6xl px-4 pb-14 pt-6 sm:px-6">
      <div className="space-y-6">
        <section className="overflow-hidden rounded-[34px] border border-slate-200 bg-white shadow-[0_18px_54px_rgba(15,23,42,0.06)]">
          <div className="bg-[linear-gradient(135deg,#eef5ff_0%,#f8fbff_46%,#ffffff_100%)] px-6 py-6 sm:px-8">
            <div className="grid gap-8 xl:grid-cols-[1.08fr_0.92fr]">
              <div className="min-w-0">
                <div className="inline-flex items-center rounded-full border border-sky-200 bg-sky-50 px-4 py-1.5 text-[11px] font-black uppercase tracking-[0.18em] text-[#0B5CAB]">
                  Account Login
                </div>

                <h1 className="mt-5 text-[32px] font-black tracking-[-0.05em] text-slate-950 sm:text-[46px]">
                  로그인
                </h1>

                <p className="mt-4 max-w-3xl text-sm leading-8 text-slate-600 sm:text-base">
                  로그인 후 모니터 운영, 커뮤니티 작성, 관심 조합 관리, 계정 설정을 계속
                  이어서 사용할 수 있습니다.
                </p>

                <div className="mt-6 grid gap-4 md:grid-cols-3">
                  <InfoCard
                    title="모니터 운영"
                    body="등록한 사업장을 탐지, 개입, 재평가 흐름으로 이어서 관리합니다."
                  />
                  <InfoCard
                    title="커뮤니티 참여"
                    body="질문, 고민, 성공사례를 남기고 후속 댓글 흐름에 참여할 수 있습니다."
                  />
                  <InfoCard
                    title="관심 조합 관리"
                    body="저장한 지역·업종을 워치리스트에서 한 번에 확인할 수 있습니다."
                  />
                </div>
              </div>

              <div className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-[0_14px_36px_rgba(15,23,42,0.05)]">
                <div className="text-[11px] font-black uppercase tracking-[0.18em] text-[#0B5CAB]">
                  Access Route
                </div>

                <div className="mt-4 rounded-[24px] border border-slate-200 bg-slate-50 p-4">
                  <div className="text-sm font-semibold text-slate-800">로그인 후 이동</div>
                  <div className="mt-2 text-lg font-black tracking-[-0.02em] text-slate-950">
                    {targetLabel(next)}
                  </div>
                  <div className="mt-2 break-all text-xs text-slate-500">{next}</div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className="rounded-[22px] border border-slate-200 bg-white p-4">
                    <div className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-500">
                      인증 방식
                    </div>
                    <div className="mt-2 text-base font-black text-slate-950">
                      이메일 + 비밀번호
                    </div>
                  </div>
                  <div className="rounded-[22px] border border-slate-200 bg-white p-4">
                    <div className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-500">
                      회원 상태
                    </div>
                    <div className="mt-2 text-base font-black text-slate-950">
                      계정 필요
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <section className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-[0_14px_38px_rgba(15,23,42,0.05)] sm:p-7">
            <div>
              <div className="text-[11px] font-black uppercase tracking-[0.18em] text-[#0B5CAB]">
                Login Form
              </div>
              <h2 className="mt-2 text-2xl font-black tracking-[-0.04em] text-slate-950">
                계정 로그인
              </h2>
              <p className="mt-2 text-sm leading-7 text-slate-600">
                이메일과 비밀번호를 입력하면 원래 보던 화면으로 다시 이동합니다.
              </p>
            </div>

            <form action={loginAction} className="mt-6 space-y-5">
              <input type="hidden" name="next" value={next} />

              <label className="block">
                <div className="mb-2 text-sm font-semibold text-slate-800">이메일</div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  placeholder="you@example.com"
                  className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none placeholder:text-slate-400 transition focus:border-sky-300 focus:ring-4 focus:ring-sky-100"
                />
              </label>

              <label className="block">
                <div className="mb-2 text-sm font-semibold text-slate-800">비밀번호</div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  placeholder="비밀번호를 입력하세요"
                  className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none placeholder:text-slate-400 transition focus:border-sky-300 focus:ring-4 focus:ring-sky-100"
                />
              </label>

              <div
                className={`rounded-[22px] px-4 py-3 text-sm leading-6 ${
                  error
                    ? "border border-rose-200 bg-rose-50 text-rose-700"
                    : "border border-slate-200 bg-slate-50 text-slate-600"
                }`}
              >
                {error || "로그인 후 커뮤니티 작성, 계정 관리, 관심 조합 기능을 사용할 수 있습니다."}
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="submit"
                  className="inline-flex h-12 items-center justify-center rounded-2xl border border-[#0B5CAB] bg-[#0B5CAB] px-6 text-sm font-semibold text-white transition hover:border-[#084298] hover:bg-[#084298]"
                >
                  로그인
                </button>

                <Link
                  href={`/auth/signup${next && next !== "/" ? `?next=${encodeURIComponent(next)}` : ""}`}
                  className="inline-flex h-12 items-center justify-center rounded-2xl border border-slate-200 bg-white px-6 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  회원가입
                </Link>
              </div>
            </form>
          </section>

          <aside className="space-y-6">
            <section className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-[0_14px_38px_rgba(15,23,42,0.05)]">
              <div className="text-[11px] font-black uppercase tracking-[0.18em] text-[#0B5CAB]">
                Quick Access
              </div>

              <div className="mt-4 flex flex-col gap-3">
                <Link
                  href="/signals"
                  className="inline-flex items-center rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  최근 시그널 보기
                </Link>
                <Link
                  href="/rankings"
                  className="inline-flex items-center rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  위험 랭킹 보기
                </Link>
                <Link
                  href="/community"
                  className="inline-flex items-center rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  커뮤니티 보기
                </Link>
              </div>
            </section>

            <section className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-[0_14px_38px_rgba(15,23,42,0.05)]">
              <div className="text-[11px] font-black uppercase tracking-[0.18em] text-[#0B5CAB]">
                Need Account
              </div>
              <h3 className="mt-2 text-lg font-black tracking-[-0.02em] text-slate-950">
                아직 계정이 없나요?
              </h3>
              <p className="mt-2 text-sm leading-7 text-slate-600">
                회원가입 후 커뮤니티 작성, 전문가 공개 설정, 관심 조합 관리 기능을 바로
                사용할 수 있습니다.
              </p>

              <Link
                href={`/auth/signup${next && next !== "/" ? `?next=${encodeURIComponent(next)}` : ""}`}
                className="mt-4 inline-flex h-11 items-center justify-center rounded-2xl border border-sky-200 bg-sky-50 px-4 text-sm font-semibold text-[#0B5CAB] transition hover:border-sky-300 hover:bg-sky-100"
              >
                회원가입으로 이동
              </Link>
            </section>
          </aside>
        </div>
      </div>
    </main>
  );
}
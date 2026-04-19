"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";

function safeNextPath(value: string) {
  const next = value.trim();

  if (!next) return "/";
  if (!next.startsWith("/")) return "/";
  if (next.startsWith("//")) return "/";
  if (next === "/auth/signup") return "/";
  if (next === "/auth/login") return "/";

  return next;
}

function routeLabel(next: string) {
  if (next.startsWith("/monitors")) return "모니터 운영 화면";
  if (next.startsWith("/community")) return "커뮤니티 화면";
  if (next.startsWith("/watchlist")) return "관심조합 화면";
  if (next.startsWith("/account")) return "내 계정 화면";
  return "기본 화면";
}

function GuideCard({
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

export default function SignupPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const next = safeNextPath(searchParams.get("next") || "/");

  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const helperText = useMemo(() => {
    if (error) return error;
    if (done) {
      return "회원가입 요청이 완료되었습니다. 이메일 인증이 설정된 경우 메일을 확인해 주세요.";
    }
    return "기본 정보를 입력하고 계정을 생성하세요.";
  }, [done, error]);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setDone(false);

    try {
      if (!fullName.trim()) {
        throw new Error("이름을 입력해주세요.");
      }

      if (!email.trim()) {
        throw new Error("이메일을 입력해주세요.");
      }

      if (password.length < 6) {
        throw new Error("비밀번호는 6자 이상이어야 합니다.");
      }

      if (password !== passwordConfirm) {
        throw new Error("비밀번호 확인이 일치하지 않습니다.");
      }

      const supabase = supabaseBrowser();

      const { error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo:
            typeof window !== "undefined"
              ? `${window.location.origin}${next}`
              : undefined,
          data: {
            full_name: fullName.trim(),
            username: username.trim(),
            phone: phone.trim(),
          },
        },
      });

      if (error) {
        throw error;
      }

      setDone(true);

      setTimeout(() => {
        router.replace(`/auth/login?next=${encodeURIComponent(next)}`);
        router.refresh();
      }, 1200);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "회원가입 중 오류가 발생했습니다.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-6xl px-4 pb-14 pt-6 sm:px-6">
      <div className="space-y-6">
        <section className="overflow-hidden rounded-[34px] border border-slate-200 bg-white shadow-[0_18px_54px_rgba(15,23,42,0.06)]">
          <div className="bg-[linear-gradient(135deg,#eef5ff_0%,#f8fbff_46%,#ffffff_100%)] px-6 py-6 sm:px-8">
            <div className="grid gap-8 xl:grid-cols-[1.08fr_0.92fr]">
              <div className="min-w-0">
                <div className="inline-flex items-center rounded-full border border-sky-200 bg-sky-50 px-4 py-1.5 text-[11px] font-black uppercase tracking-[0.18em] text-[#0B5CAB]">
                  Create Account
                </div>

                <h1 className="mt-5 text-[32px] font-black tracking-[-0.05em] text-slate-950 sm:text-[46px]">
                  회원가입
                </h1>

                <p className="mt-4 max-w-3xl text-sm leading-8 text-slate-600 sm:text-base">
                  계정을 만들면 커뮤니티 참여, 내 계정 설정, 전문가 공개 설정, 관심 조합
                  관리 기능을 계속 사용할 수 있습니다.
                </p>

                <div className="mt-6 grid gap-4 md:grid-cols-3">
                  <GuideCard
                    title="커뮤니티 참여"
                    body="질문, 고민, 성공사례를 직접 작성하고 댓글 흐름에 참여할 수 있습니다."
                  />
                  <GuideCard
                    title="전문가 프로필"
                    body="내 계정에서 소개와 공개 여부를 설정해 전문가 질문 흐름에 연결할 수 있습니다."
                  />
                  <GuideCard
                    title="운영 연결"
                    body="관심 조합과 시그널 흐름을 이어서 보며 운영 맥락을 축적할 수 있습니다."
                  />
                </div>
              </div>

              <div className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-[0_14px_36px_rgba(15,23,42,0.05)]">
                <div className="text-[11px] font-black uppercase tracking-[0.18em] text-[#0B5CAB]">
                  Access Route
                </div>

                <div className="mt-4 rounded-[24px] border border-slate-200 bg-slate-50 p-4">
                  <div className="text-sm font-semibold text-slate-800">가입 후 기본 이동</div>
                  <div className="mt-2 text-lg font-black tracking-[-0.02em] text-slate-950">
                    {routeLabel(next)}
                  </div>
                  <div className="mt-2 break-all text-xs text-slate-500">{next}</div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className="rounded-[22px] border border-slate-200 bg-white p-4">
                    <div className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-500">
                      인증 방식
                    </div>
                    <div className="mt-2 text-base font-black text-slate-950">
                      이메일 가입
                    </div>
                  </div>
                  <div className="rounded-[22px] border border-slate-200 bg-white p-4">
                    <div className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-500">
                      비밀번호 조건
                    </div>
                    <div className="mt-2 text-base font-black text-slate-950">
                      최소 6자
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
                Signup Form
              </div>
              <h2 className="mt-2 text-2xl font-black tracking-[-0.04em] text-slate-950">
                기본 정보 입력
              </h2>
              <p className="mt-2 text-sm leading-7 text-slate-600">
                생성한 계정 정보는 이후 내 계정 화면에서 계속 수정할 수 있습니다.
              </p>
            </div>

            <form onSubmit={onSubmit} className="mt-6 space-y-5">
              <div className="grid gap-5 sm:grid-cols-2">
                <label className="block">
                  <div className="mb-2 text-sm font-semibold text-slate-800">이름</div>
                  <input
                    id="fullName"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="이름"
                    className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none placeholder:text-slate-400 transition focus:border-sky-300 focus:ring-4 focus:ring-sky-100"
                  />
                </label>

                <label className="block">
                  <div className="mb-2 text-sm font-semibold text-slate-800">닉네임</div>
                  <input
                    id="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="닉네임"
                    className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none placeholder:text-slate-400 transition focus:border-sky-300 focus:ring-4 focus:ring-sky-100"
                  />
                </label>

                <label className="block sm:col-span-2">
                  <div className="mb-2 text-sm font-semibold text-slate-800">이메일</div>
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none placeholder:text-slate-400 transition focus:border-sky-300 focus:ring-4 focus:ring-sky-100"
                  />
                </label>

                <label className="block sm:col-span-2">
                  <div className="mb-2 text-sm font-semibold text-slate-800">연락처</div>
                  <input
                    id="phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="연락처"
                    className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none placeholder:text-slate-400 transition focus:border-sky-300 focus:ring-4 focus:ring-sky-100"
                  />
                </label>

                <label className="block">
                  <div className="mb-2 text-sm font-semibold text-slate-800">비밀번호</div>
                  <input
                    id="password"
                    type="password"
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="비밀번호"
                    className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none placeholder:text-slate-400 transition focus:border-sky-300 focus:ring-4 focus:ring-sky-100"
                  />
                </label>

                <label className="block">
                  <div className="mb-2 text-sm font-semibold text-slate-800">비밀번호 확인</div>
                  <input
                    id="passwordConfirm"
                    type="password"
                    autoComplete="new-password"
                    value={passwordConfirm}
                    onChange={(e) => setPasswordConfirm(e.target.value)}
                    placeholder="비밀번호 확인"
                    className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none placeholder:text-slate-400 transition focus:border-sky-300 focus:ring-4 focus:ring-sky-100"
                  />
                </label>
              </div>

              <div
                className={`rounded-[22px] px-4 py-3 text-sm leading-6 ${
                  error
                    ? "border border-rose-200 bg-rose-50 text-rose-700"
                    : done
                      ? "border border-emerald-200 bg-emerald-50 text-emerald-700"
                      : "border border-slate-200 bg-slate-50 text-slate-600"
                }`}
              >
                {helperText}
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex h-12 items-center justify-center rounded-2xl border border-[#0B5CAB] bg-[#0B5CAB] px-6 text-sm font-semibold text-white transition hover:border-[#084298] hover:bg-[#084298] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? "생성 중..." : "회원가입"}
                </button>

                <Link
                  href={`/auth/login${next && next !== "/" ? `?next=${encodeURIComponent(next)}` : ""}`}
                  className="inline-flex h-12 items-center justify-center rounded-2xl border border-slate-200 bg-white px-6 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  로그인으로 이동
                </Link>
              </div>
            </form>
          </section>

          <aside className="space-y-6">
            <section className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-[0_14px_38px_rgba(15,23,42,0.05)]">
              <div className="text-[11px] font-black uppercase tracking-[0.18em] text-[#0B5CAB]">
                Signup Guide
              </div>
              <div className="mt-4 space-y-3 text-sm leading-7 text-slate-600">
                <p>1. 이메일과 비밀번호로 계정을 만듭니다.</p>
                <p>2. 로그인 후 내 계정에서 소개와 전문가 공개 여부를 정리합니다.</p>
                <p>3. 이후 커뮤니티와 관심 조합 흐름을 이어서 사용할 수 있습니다.</p>
              </div>
            </section>

            <section className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-[0_14px_38px_rgba(15,23,42,0.05)]">
              <div className="text-[11px] font-black uppercase tracking-[0.18em] text-[#0B5CAB]">
                Already Have Account
              </div>
              <h3 className="mt-2 text-lg font-black tracking-[-0.02em] text-slate-950">
                이미 계정이 있나요?
              </h3>
              <p className="mt-2 text-sm leading-7 text-slate-600">
                기존 계정이 있다면 로그인 후 바로 이어서 사용할 수 있습니다.
              </p>

              <Link
                href={`/auth/login${next && next !== "/" ? `?next=${encodeURIComponent(next)}` : ""}`}
                className="mt-4 inline-flex h-11 items-center justify-center rounded-2xl border border-sky-200 bg-sky-50 px-4 text-sm font-semibold text-[#0B5CAB] transition hover:border-sky-300 hover:bg-sky-100"
              >
                로그인으로 이동
              </Link>
            </section>
          </aside>
        </div>
      </div>
    </main>
  );
}
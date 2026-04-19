import type { ReactNode } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { updateAccountAction } from "./actions";

export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function one(value: string | string[] | undefined) {
  return typeof value === "string" ? value.trim() : "";
}

function text(value: unknown) {
  const normalized = String(value ?? "").trim();
  return normalized || "";
}

function firstChar(value: string) {
  return value.slice(0, 1).toUpperCase() || "C";
}

function joined(...values: Array<string | null | undefined>) {
  return values.map((item) => text(item)).filter(Boolean).join(" · ");
}

function profileStatusLabel(isPublicExpert: boolean, expertTitle: string) {
  if (isPublicExpert && expertTitle) return "전문가 공개중";
  if (isPublicExpert) return "공개중";
  return "비공개";
}

function SectionCard({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-[32px] border border-sky-100 bg-sky-50 p-6 shadow-[0_14px_38px_rgba(14,165,233,0.08)] sm:p-7">
      <div>
        <div className="text-[11px] font-black uppercase tracking-[0.18em] text-sky-700">
          {eyebrow}
        </div>
        <h2 className="mt-2 text-2xl font-black tracking-[-0.04em] text-slate-950">
          {title}
        </h2>
        <p className="mt-2 text-sm leading-7 text-slate-600">{description}</p>
      </div>
      <div className="mt-6">{children}</div>
    </section>
  );
}

function MetricBox({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-[22px] border border-sky-200 bg-white p-4">
      <div className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-500">
        {label}
      </div>
      <div className="mt-2 text-lg font-black tracking-[-0.02em] text-slate-950">{value}</div>
      {hint ? <div className="mt-1 text-xs leading-6 text-slate-500">{hint}</div> : null}
    </div>
  );
}

function InputField({
  label,
  name,
  defaultValue,
  placeholder,
  description,
  readOnly = false,
}: {
  label: string;
  name?: string;
  defaultValue?: string;
  placeholder?: string;
  description?: string;
  readOnly?: boolean;
}) {
  return (
    <label className="block">
      <div className="mb-2 text-sm font-semibold text-slate-800">{label}</div>
      <input
        name={name}
        defaultValue={defaultValue}
        readOnly={readOnly}
        placeholder={placeholder}
        className={`h-12 w-full rounded-2xl border px-4 text-sm outline-none transition placeholder:text-slate-400 ${
          readOnly
            ? "border-sky-200 bg-sky-50 text-slate-500"
            : "border-sky-200 bg-white text-slate-900 focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
        }`}
      />
      {description ? (
        <p className="mt-2 text-xs leading-5 text-slate-500">{description}</p>
      ) : null}
    </label>
  );
}

export default async function AccountPage({
  searchParams,
}: {
  searchParams?: SearchParams;
}) {
  const params = (await searchParams) || {};

  const success = one(params.success);
  const error = one(params.error);

  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login?next=/account");
  }

  const meta = (user.user_metadata ?? {}) as Record<string, unknown>;

  const email = text(user.email);
  const fullName = text(meta.full_name);
  const username = text(meta.username);
  const phone = text(meta.phone);
  const expertTitle = text(meta.expert_title);
  const bio = text(meta.bio);
  const isPublicExpert = meta.is_public_expert === true;

  const displayName = username || fullName || email || "사용자";
  const avatar = firstChar(displayName);
  const shortProfile = joined(
    expertTitle || null,
    phone || null,
    profileStatusLabel(isPublicExpert, expertTitle),
  );

  return (
    <main className="mx-auto max-w-6xl bg-white px-4 pb-14 pt-6 sm:px-6">
      <div className="space-y-6">
        <section className="overflow-hidden rounded-[34px] border border-sky-100 bg-sky-50 shadow-[0_18px_54px_rgba(14,165,233,0.08)]">
          <div className="bg-[linear-gradient(135deg,#eff6ff_0%,#f5f9ff_46%,#ffffff_100%)] px-6 py-6 sm:px-8">
            <div className="grid gap-8 xl:grid-cols-[1.08fr_0.92fr]">
              <div className="min-w-0">
                <div className="inline-flex items-center rounded-full border border-sky-200 bg-white px-4 py-1.5 text-[11px] font-black uppercase tracking-[0.18em] text-sky-700">
                  Account Center
                </div>

                <h1 className="mt-5 text-[32px] font-black tracking-[-0.05em] text-slate-950 sm:text-[46px]">
                  내 계정
                </h1>

                <p className="mt-4 max-w-3xl text-sm leading-8 text-slate-600 sm:text-base">
                  계정 기본 정보와 커뮤니티에서 보여줄 프로필 정보를 관리합니다. 전문가 공개 여부와
                  소개문을 정리해 두면 커뮤니티 흐름에서 더 자연스럽게 연결됩니다.
                </p>

                <div className="mt-6 flex flex-wrap gap-3">
                  <Link
                    href="/community"
                    className="inline-flex h-12 items-center justify-center rounded-2xl border border-sky-200 bg-white px-5 text-sm font-semibold text-slate-700 transition hover:border-sky-300 hover:bg-sky-50 hover:text-sky-700"
                  >
                    커뮤니티 보기
                  </Link>
                  <Link
                    href="/community/write?type=expert"
                    className="inline-flex h-12 items-center justify-center rounded-2xl border border-sky-600 bg-sky-600 px-5 text-sm font-semibold text-white transition hover:border-sky-700 hover:bg-sky-700"
                  >
                    전문가 질문 쓰기
                  </Link>
                </div>
              </div>

              <div className="rounded-[30px] border border-sky-200 bg-white p-6 shadow-[0_14px_36px_rgba(14,165,233,0.08)]">
                <div className="flex items-center gap-4 rounded-[24px] border border-sky-200 bg-sky-50 p-4">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full border border-sky-200 bg-white text-2xl font-black text-sky-700">
                    {avatar}
                  </div>

                  <div className="min-w-0">
                    <div className="truncate text-xl font-black tracking-[-0.02em] text-slate-950">
                      {displayName}
                    </div>
                    <div className="mt-1 truncate text-sm text-slate-500">
                      {email || "-"}
                    </div>
                    <div className="mt-1 truncate text-xs text-slate-500">
                      {shortProfile || "기본 프로필만 설정됨"}
                    </div>
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-2 gap-3">
                  <MetricBox label="표시 이름" value={displayName} />
                  <MetricBox
                    label="전문가 공개"
                    value={isPublicExpert ? "공개" : "비공개"}
                  />
                  <MetricBox label="전문가 소개명" value={expertTitle || "-"} />
                  <MetricBox label="연락처" value={phone || "-"} />
                </div>
              </div>
            </div>
          </div>
        </section>

        {success ? (
          <div className="rounded-[24px] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm leading-6 text-emerald-700">
            {success}
          </div>
        ) : null}

        {error ? (
          <div className="rounded-[24px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm leading-6 text-rose-700">
            {error}
          </div>
        ) : null}

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
          <SectionCard
            eyebrow="Profile Form"
            title="기본 정보 수정"
            description="이메일은 읽기 전용이며, 나머지 항목은 언제든지 수정할 수 있습니다."
          >
            <form action={updateAccountAction} className="space-y-6">
              <div className="grid gap-5 md:grid-cols-2">
                <InputField
                  label="이메일"
                  defaultValue={email}
                  readOnly
                  description="로그인 계정 이메일입니다."
                />

                <InputField
                  label="이름"
                  name="fullName"
                  defaultValue={fullName}
                  placeholder="이름"
                  description="실명을 쓰지 않아도 됩니다."
                />

                <InputField
                  label="닉네임"
                  name="username"
                  defaultValue={username}
                  placeholder="닉네임"
                  description="커뮤니티에서 표시될 대표 이름입니다."
                />

                <InputField
                  label="연락처"
                  name="phone"
                  defaultValue={phone}
                  placeholder="연락처"
                  description="선택 사항입니다."
                />

                <div className="md:col-span-2">
                  <InputField
                    label="전문가 소개명"
                    name="expertTitle"
                    defaultValue={expertTitle}
                    placeholder="예: 상권 분석가 / 운영 컨설턴트 / 현장 실무자"
                    description="전문가 공개 시 강조되는 한 줄 소개입니다."
                  />
                </div>

                <label className="block md:col-span-2">
                  <div className="mb-2 text-sm font-semibold text-slate-800">소개</div>
                  <textarea
                    name="bio"
                    defaultValue={bio}
                    rows={8}
                    placeholder="커뮤니티에서 보여줄 소개, 답변 가능한 분야, 현장 경험 등을 적어 주세요."
                    className="w-full rounded-[24px] border border-sky-200 bg-white px-4 py-4 text-sm leading-7 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
                  />
                  <p className="mt-2 text-xs leading-5 text-slate-500">
                    너무 길지 않게 핵심 경험과 답변 가능한 주제를 정리하는 편이 좋습니다.
                  </p>
                </label>
              </div>

              <div className="rounded-[24px] border border-sky-200 bg-white p-4">
                <label className="flex items-start gap-3">
                  <input
                    name="isPublicExpert"
                    type="checkbox"
                    defaultChecked={isPublicExpert}
                    className="mt-1 h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                  />
                  <span>
                    <span className="block text-sm font-semibold text-slate-800">
                      전문가 표시 공개
                    </span>
                    <span className="mt-1 block text-xs leading-6 text-slate-500">
                      체크하면 커뮤니티에서 전문가 질문/답변 흐름에 더 잘 연결됩니다.
                    </span>
                  </span>
                </label>
              </div>

              <div className="flex flex-wrap justify-end gap-3">
                <Link
                  href="/signals"
                  className="inline-flex h-11 items-center justify-center rounded-2xl border border-sky-200 bg-white px-5 text-sm font-semibold text-slate-700 transition hover:border-sky-300 hover:bg-sky-50"
                >
                  최근 시그널 보기
                </Link>
                <button
                  type="submit"
                  className="inline-flex h-11 items-center justify-center rounded-2xl border border-sky-600 bg-sky-600 px-5 text-sm font-semibold text-white transition hover:border-sky-700 hover:bg-sky-700"
                >
                  저장하기
                </button>
              </div>
            </form>
          </SectionCard>

          <div className="space-y-6">
            <SectionCard
              eyebrow="Current Status"
              title="현재 표시 상태"
              description="지금 계정이 커뮤니티에서 어떻게 보이는지 요약합니다."
            >
              <div className="space-y-3">
                <MetricBox label="표시 이름" value={displayName} />
                <MetricBox label="전문가 소개명" value={expertTitle || "-"} />
                <MetricBox
                  label="공개 상태"
                  value={profileStatusLabel(isPublicExpert, expertTitle)}
                />
              </div>
            </SectionCard>

            <SectionCard
              eyebrow="Quick Access"
              title="바로가기"
              description="자주 쓰는 화면으로 바로 이동할 수 있습니다."
            >
              <div className="flex flex-col gap-3">
                <Link
                  href="/community/write?type=expert"
                  className="inline-flex items-center rounded-2xl border border-sky-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-sky-300 hover:bg-sky-50"
                >
                  전문가 질문 쓰기
                </Link>
                <Link
                  href="/watchlist"
                  className="inline-flex items-center rounded-2xl border border-sky-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-sky-300 hover:bg-sky-50"
                >
                  관심 조합 보기
                </Link>
                <Link
                  href="/signals"
                  className="inline-flex items-center rounded-2xl border border-sky-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-sky-300 hover:bg-sky-50"
                >
                  최근 시그널 보기
                </Link>
              </div>
            </SectionCard>
          </div>
        </div>
      </div>
    </main>
  );
}
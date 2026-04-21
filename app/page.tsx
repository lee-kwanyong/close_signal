import Link from "next/link";
import type { ReactNode } from "react";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

async function getUserState() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return {
    isLoggedIn: Boolean(user),
  };
}

function MotionStyle() {
  return (
    <style>{`
      @keyframes closeSignalSweep {
        0% { transform: translateX(-130%); opacity: 0; }
        12% { opacity: 1; }
        88% { opacity: 1; }
        100% { transform: translateX(360%); opacity: 0; }
      }

      @keyframes closeSignalPulseRing {
        0% { transform: scale(0.65); opacity: 0.55; }
        100% { transform: scale(1.9); opacity: 0; }
      }

      .cs-sweep { animation: closeSignalSweep 4.8s ease-in-out infinite; }
      .cs-pulse-ring { animation: closeSignalPulseRing 1.8s ease-out infinite; }

      @media (prefers-reduced-motion: reduce) {
        .cs-sweep,
        .cs-pulse-ring {
          animation: none !important;
        }
      }
    `}</style>
  );
}

function CTAButton({
  href,
  label,
  tone = "primary",
}: {
  href: string;
  label: string;
  tone?: "primary" | "secondary" | "dark" | "ghost";
}) {
  const className =
    tone === "primary"
      ? "inline-flex h-12 items-center justify-center rounded-full bg-[#169BF4] px-6 text-sm font-black text-white shadow-[0_16px_36px_rgba(22,155,244,0.32)] transition duration-200 hover:-translate-y-0.5 hover:bg-[#0A84E0]"
      : tone === "dark"
        ? "inline-flex h-12 items-center justify-center rounded-full bg-slate-950 px-6 text-sm font-black text-white shadow-[0_16px_36px_rgba(15,23,42,0.18)] transition duration-200 hover:-translate-y-0.5 hover:bg-slate-800"
        : tone === "secondary"
          ? "inline-flex h-12 items-center justify-center rounded-full border border-slate-300 bg-white px-6 text-sm font-black text-slate-800 transition duration-200 hover:-translate-y-0.5 hover:border-slate-400 hover:bg-slate-50"
          : "inline-flex h-12 items-center justify-center rounded-full border border-[#BFE3FF] bg-[#F2FAFF] px-6 text-sm font-black text-[#0A6FD6] transition duration-200 hover:-translate-y-0.5 hover:bg-[#E8F4FF]";

  return (
    <Link href={href} className={className}>
      {label}
    </Link>
  );
}

function GlowOrb({
  className,
  tone = "sky",
}: {
  className: string;
  tone?: "sky" | "rose" | "cyan";
}) {
  const toneClass =
    tone === "rose"
      ? "bg-rose-300/30"
      : tone === "cyan"
        ? "bg-cyan-300/30"
        : "bg-sky-300/30";

  return (
    <div
      className={`pointer-events-none absolute rounded-full blur-3xl ${toneClass} ${className}`}
    />
  );
}

function RoleBadge({
  label,
  text,
  tone,
}: {
  label: string;
  text: string;
  tone: "sky" | "rose";
}) {
  const toneClass =
    tone === "rose"
      ? "border-rose-200 bg-rose-50/90 text-rose-700"
      : "border-sky-200 bg-sky-50/90 text-[#0A6FD6]";

  return (
    <div className={`rounded-[22px] border px-4 py-3 ${toneClass}`}>
      <div className="text-[10px] font-black uppercase tracking-[0.18em] opacity-70">
        {label}
      </div>
      <div className="mt-1 text-sm font-black leading-6">{text}</div>
    </div>
  );
}

function DecisionFlowBadge() {
  return (
    <div className="mt-6 inline-flex max-w-full flex-wrap items-center gap-2 rounded-[22px] border border-slate-200 bg-white/90 px-4 py-3 shadow-[0_16px_44px_rgba(15,23,42,0.08)] backdrop-blur">
      <span className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
        오늘의 판단
      </span>

      <span className="hidden h-4 w-px bg-slate-200 sm:block" />

      <span className="text-sm font-black text-slate-950">위험</span>
      <span className="text-sm font-black text-[#169BF4]">→</span>
      <span className="text-sm font-black text-slate-950">우선순위</span>
      <span className="text-sm font-black text-[#169BF4]">→</span>
      <span className="text-sm font-black text-slate-950">실행</span>
    </div>
  );
}

function MetricChip({
  label,
  value,
  tone = "sky",
}: {
  label: string;
  value: string;
  tone?: "sky" | "rose" | "slate";
}) {
  const toneClass =
    tone === "rose"
      ? "border-rose-200 bg-rose-50 text-rose-700"
      : tone === "slate"
        ? "border-slate-700 bg-slate-950 text-white"
        : "border-sky-200 bg-sky-50 text-[#0A6FD6]";

  return (
    <div
      className={`flex min-h-[104px] flex-col justify-between rounded-[24px] border px-4 py-4 shadow-sm ${toneClass}`}
    >
      <div className="text-[10px] font-black uppercase tracking-[0.18em] opacity-70">
        {label}
      </div>
      <div className="min-h-[46px] whitespace-pre-line text-[20px] font-black leading-[1.15] tracking-[-0.045em] sm:text-[22px]">
        {value}
      </div>
    </div>
  );
}

function SignalFlow() {
  const points = ["8%", "33%", "58%", "83%"];

  return (
    <div className="relative mt-5 h-20 overflow-hidden rounded-[28px] border border-slate-200 bg-white/75 shadow-sm backdrop-blur">
      <div className="absolute left-6 right-6 top-1/2 h-px bg-slate-200" />
      <div className="cs-sweep absolute left-8 top-1/2 h-1 w-32 -translate-y-1/2 rounded-full bg-[#169BF4] shadow-[0_0_24px_rgba(22,155,244,0.7)]" />

      {points.map((left, index) => (
        <div
          key={left}
          className="absolute top-1/2 -translate-y-1/2"
          style={{ left }}
        >
          <div className="absolute inset-0 h-4 w-4 rounded-full bg-[#169BF4]/25 cs-pulse-ring" />
          <div className="relative h-4 w-4 rounded-full border-4 border-white bg-[#169BF4] shadow-[0_8px_18px_rgba(22,155,244,0.28)]" />
          <div className="mt-3 -translate-x-1/2 whitespace-nowrap text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
            0{index + 1}
          </div>
        </div>
      ))}
    </div>
  );
}

function SignalCard({
  tag,
  title,
  description,
  level,
  tone = "sky",
}: {
  tag: string;
  title: string;
  description: string;
  level: number;
  tone?: "sky" | "rose" | "slate";
}) {
  const toneClass =
    tone === "rose"
      ? "border-rose-200 bg-rose-50 text-rose-700"
      : tone === "slate"
        ? "border-slate-700 bg-slate-950 text-white"
        : "border-sky-200 bg-sky-50 text-[#0A6FD6]";

  const meterClass =
    tone === "rose"
      ? "bg-rose-500"
      : tone === "slate"
        ? "bg-slate-950"
        : "bg-[#169BF4]";

  return (
    <div className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-[0_16px_44px_rgba(15,23,42,0.06)] transition duration-200 hover:-translate-y-1 hover:shadow-[0_24px_60px_rgba(15,23,42,0.1)]">
      <div className="flex items-center justify-between gap-3">
        <div
          className={`rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] ${toneClass}`}
        >
          {tag}
        </div>

        <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full rounded-full bg-[#169BF4] opacity-40 cs-pulse-ring" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[#169BF4]" />
          </span>
          LIVE SIGNAL
        </div>
      </div>

      <div className="mt-3 text-lg font-black leading-snug tracking-[-0.04em] text-slate-950">
        {title}
      </div>

      <div className="mt-2 text-sm leading-6 text-slate-600">
        {description}
      </div>

      <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-full rounded-full ${meterClass}`}
          style={{ width: `${level}%` }}
        />
      </div>
    </div>
  );
}

function LiveSignalBoard() {
  return (
    <div className="relative">
      <div className="relative overflow-hidden rounded-[34px] border border-slate-200 bg-white/80 p-4 shadow-[0_24px_80px_rgba(15,23,42,0.1)] backdrop-blur">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(22,155,244,0.13),transparent_32%),radial-gradient(circle_at_90%_30%,rgba(244,63,94,0.12),transparent_30%)]" />

        <div className="relative">
          <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <div className="text-[11px] font-black uppercase tracking-[0.18em] text-[#0A6FD6]">
                Close Signal Dashboard
              </div>
              <div className="mt-2 text-2xl font-black tracking-[-0.05em] text-slate-950">
                위험 신호를 한 화면에서
              </div>
            </div>

            <div className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-black text-emerald-700">
              예시 화면
            </div>
          </div>

          <SignalFlow />

          <div className="mt-4 grid gap-3">
            <SignalCard
              tag="소상공인"
              title="우리 동네 업종 위험도가 올라가는 중"
              description="지금 내 지역·업종이 버틸 만한지 먼저 확인하도록 안내합니다."
              level={78}
              tone="sky"
            />

            <SignalCard
              tag="프랜차이즈"
              title="신규 출점 후보지, 외부 압력 재점검 필요"
              description="출점 전 위험도와 주변 업종 변화를 같이 보며 의사결정을 돕습니다."
              level={86}
              tone="rose"
            />

            <SignalCard
              tag="운영팀"
              title="먼저 봐야 할 점포와 지역을 우선순위화"
              description="전체 점포를 같은 방식으로 보지 않고, 개입 순서를 빠르게 정리합니다."
              level={69}
              tone="slate"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function CheckItem({ children }: { children: ReactNode }) {
  return (
    <div className="flex gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
      <div className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#169BF4] text-[11px] font-black text-white">
        ✓
      </div>
      <div className="text-sm leading-7 text-slate-700">{children}</div>
    </div>
  );
}

function AudiencePanel({
  eyebrow,
  title,
  summary,
  bullets,
  primaryHref,
  primaryLabel,
  secondaryHref,
  secondaryLabel,
  accent,
}: {
  eyebrow: string;
  title: string;
  summary: string;
  bullets: string[];
  primaryHref: string;
  primaryLabel: string;
  secondaryHref: string;
  secondaryLabel: string;
  accent: "sky" | "rose";
}) {
  const isRose = accent === "rose";
  const accentText = isRose ? "text-rose-600" : "text-[#0A6FD6]";
  const accentBorder = isRose ? "border-rose-200" : "border-sky-200";
  const chipClass = isRose ? "bg-rose-500" : "bg-[#169BF4]";

  return (
    <section
      className={`group relative overflow-hidden rounded-[34px] border ${accentBorder} bg-white p-6 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-[0_28px_80px_rgba(15,23,42,0.09)] sm:p-8`}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-80"
        style={{
          background: isRose
            ? "radial-gradient(circle at 18% 8%, rgba(251,113,133,0.18), transparent 34%), linear-gradient(180deg, #FFFFFF 0%, #FFF7F8 100%)"
            : "radial-gradient(circle at 18% 8%, rgba(22,155,244,0.18), transparent 34%), linear-gradient(180deg, #FFFFFF 0%, #F5FBFF 100%)",
        }}
      />

      <div className="relative">
        <div className="flex items-center gap-2">
          <span
            className={`h-2.5 w-2.5 rounded-full ${chipClass} shadow-[0_0_18px_rgba(22,155,244,0.45)]`}
          />
          <div
            className={`text-[11px] font-black uppercase tracking-[0.18em] ${accentText}`}
          >
            {eyebrow}
          </div>
        </div>

        <h2 className="mt-4 text-3xl font-black leading-tight tracking-[-0.055em] text-slate-950 sm:text-4xl">
          {title}
        </h2>

        <p className="mt-4 text-sm leading-7 text-slate-600 sm:text-base">
          {summary}
        </p>

        <div className="mt-6 grid gap-3">
          {bullets.map((item, index) => (
            <CheckItem key={`${eyebrow}-${index}`}>{item}</CheckItem>
          ))}
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          <CTAButton
            href={primaryHref}
            label={primaryLabel}
            tone={isRose ? "dark" : "primary"}
          />
          <CTAButton
            href={secondaryHref}
            label={secondaryLabel}
            tone="secondary"
          />
        </div>
      </div>
    </section>
  );
}

function StepCard({
  number,
  title,
  description,
}: {
  number: string;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm transition duration-200 hover:-translate-y-1 hover:shadow-[0_20px_50px_rgba(15,23,42,0.08)]">
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-950 text-sm font-black text-white">
        {number}
      </div>

      <div className="mt-4 text-xl font-black tracking-[-0.04em] text-slate-950">
        {title}
      </div>

      <div className="mt-3 text-sm leading-7 text-slate-600">
        {description}
      </div>
    </div>
  );
}

function ExploreCard({
  href,
  title,
  description,
  label,
}: {
  href: string;
  title: string;
  description: string;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="group rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm transition duration-200 hover:-translate-y-1 hover:border-[#BFE3FF] hover:shadow-[0_20px_52px_rgba(15,23,42,0.08)]"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-lg font-black tracking-[-0.04em] text-slate-950">
            {title}
          </div>
          <div className="mt-2 text-sm leading-7 text-slate-600">
            {description}
          </div>
        </div>

        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#F2FAFF] text-lg font-black text-[#0A6FD6] transition group-hover:translate-x-0.5">
          →
        </div>
      </div>

      <div className="mt-4 text-sm font-black text-[#0A6FD6]">{label}</div>
    </Link>
  );
}

export default async function HomePage() {
  const { isLoggedIn } = await getUserState();

  const rankingsHref = isLoggedIn
    ? "/rankings"
    : "/auth/login?next=%2Frankings";
  const signalsHref = isLoggedIn ? "/signals" : "/auth/login?next=%2Fsignals";
  const hqHref = "/hq";

  return (
    <main className="min-h-screen overflow-hidden bg-[#F6F9FC] text-slate-950">
      <MotionStyle />

      <section className="mx-auto max-w-7xl px-3 py-4 sm:px-4 sm:py-6">
        <div className="space-y-5">
          <section className="relative overflow-hidden rounded-[42px] border border-slate-200 bg-white px-5 py-8 shadow-[0_28px_90px_rgba(15,23,42,0.08)] sm:px-8 sm:py-12 lg:px-10 lg:py-14">
            <div
              className="pointer-events-none absolute inset-0"
              style={{
                background:
                  "radial-gradient(circle at 12% 8%, rgba(22,155,244,0.22), transparent 28%), radial-gradient(circle at 92% 12%, rgba(244,63,94,0.13), transparent 27%), linear-gradient(180deg, #FFFFFF 0%, #F7FBFF 100%)",
              }}
            />

            <GlowOrb className="-left-20 top-[-90px] h-72 w-72" tone="sky" />
            <GlowOrb
              className="right-[-80px] top-10 h-72 w-72"
              tone="rose"
            />
            <GlowOrb
              className="bottom-[-100px] left-1/3 h-80 w-80"
              tone="cyan"
            />

            <div className="relative grid gap-10 xl:grid-cols-[minmax(0,1.04fr)_minmax(420px,0.96fr)] xl:items-center">
              <div className="min-w-0">
                <div className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-white/90 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.18em] text-[#0A6FD6] shadow-sm backdrop-blur">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="absolute inline-flex h-full w-full rounded-full bg-[#169BF4] opacity-40 cs-pulse-ring" />
                    <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[#169BF4]" />
                  </span>
                  Close Signal Home
                </div>

                <h1 className="mt-5 max-w-4xl text-4xl font-black leading-[1.02] tracking-[-0.075em] text-slate-950 sm:text-5xl lg:text-7xl">
                  상권의 위험 신호를
                  <br />
                  먼저 발견하고,
                  <br />
                  <span className="bg-gradient-to-r from-[#0A6FD6] via-[#169BF4] to-rose-500 bg-clip-text text-transparent">
                    다음 행동까지
                  </span>{" "}
                  정리합니다.
                </h1>

                <p className="mt-6 max-w-3xl text-base leading-8 text-slate-600 sm:text-lg">
                  Close Signal은 지역·업종·점포 데이터를 복잡한 표가 아니라{" "}
                  <strong className="font-black text-slate-950">
                    위험 신호, 우선순위, 실행 방향
                  </strong>
                  으로 바꿔 보여주는 사업 리스크 레이더입니다. 일반
                  소상공인은 내 사업장의 위험 흐름을 빠르게 이해하고,
                  프랜차이즈 본사는 출점과 점포 운영 판단을 더 빠르게 내릴 수
                  있습니다.
                </p>

                <DecisionFlowBadge />

                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                  <RoleBadge
                    label="For Local Owners"
                    text="내 지역·내 업종이 지금 위험해지는지 한눈에 확인"
                    tone="sky"
                  />
                  <RoleBadge
                    label="For Franchise HQ"
                    text="어디를 열고, 어떤 점포를 먼저 관리할지 판단"
                    tone="rose"
                  />
                </div>

                <div className="mt-7 flex flex-wrap gap-2">
                  <CTAButton href={signalsHref} label="위험 시그날 보기" />
                  <CTAButton
                    href={rankingsHref}
                    label="지역·업종 랭킹 보기"
                    tone="secondary"
                  />
                  <CTAButton href={hqHref} label="본사운영 보기" tone="ghost" />
                </div>
              </div>

              <LiveSignalBoard />
            </div>

            <div className="relative mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <MetricChip label="Owner" value={"위험 이해"} />
              <MetricChip label="HQ" value={"출점 판단"} tone="rose" />
              <MetricChip label="Ops" value={"우선 관리"} tone="slate" />
              <MetricChip
                label="HQ Mode"
                value={"출점·점포관리\n레이더"}
                tone="slate"
              />
            </div>
          </section>

          <div className="grid gap-4 xl:grid-cols-2">
            <AudiencePanel
              eyebrow="For Local Business Owners"
              title="일반 소상공인에게는 ‘지금 위험한지’를 먼저 보여줍니다."
              summary="사장님이 궁금한 것은 긴 보고서가 아닙니다. 우리 동네와 내 업종이 지금 버틸 만한지, 위험이 커지는지, 무엇부터 확인해야 하는지를 바로 알아야 합니다."
              bullets={[
                "내 지역·업종의 위험 흐름을 랭킹과 시그날로 빠르게 확인합니다.",
                "폐업 압력, 업종 악화 흐름, 지역 변화처럼 놓치기 쉬운 신호를 먼저 보여줍니다.",
                "복잡한 데이터 해석 없이도 지금 상황을 이해하고 다음 확인 화면으로 이동하게 만듭니다.",
              ]}
              primaryHref={signalsHref}
              primaryLabel="내 위험 시그날 확인"
              secondaryHref={rankingsHref}
              secondaryLabel="위험 랭킹 보기"
              accent="sky"
            />

            <AudiencePanel
              eyebrow="For Franchise CEOs & HQ"
              title="프랜차이즈 대표와 본사에는 ‘출점·운영 판단 도구’를 제공합니다."
              summary="본사에게 필요한 것은 예쁜 리포트보다 빠른 판단입니다. Close Signal은 어디에 새로 열지, 어떤 점포를 먼저 볼지, 어떤 지역을 방어해야 할지를 한 화면에서 정리합니다."
              bullets={[
                "출점 후보지를 볼 때 지역·업종 위험도와 외부 압력을 함께 검토합니다.",
                "기존 점포를 모두 같은 기준으로 보지 않고, 먼저 개입해야 할 점포와 지역을 우선순위화합니다.",
                "대표·운영팀·개발팀이 같은 위험 기준을 보고 빠르게 움직일 수 있게 만듭니다.",
              ]}
              primaryHref={hqHref}
              primaryLabel="본사운영 화면 보기"
              secondaryHref="/auth/login?next=%2Fhq"
              secondaryLabel="본사용으로 접속"
              accent="rose"
            />
          </div>

          <section className="relative overflow-hidden rounded-[36px] border border-slate-200 bg-slate-950 p-6 text-white shadow-[0_28px_90px_rgba(15,23,42,0.18)] sm:p-8 lg:p-10">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(22,155,244,0.24),transparent_30%),radial-gradient(circle_at_85%_20%,rgba(244,63,94,0.18),transparent_28%)]" />

            <div className="relative grid gap-8 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:items-center">
              <div>
                <div className="text-[11px] font-black uppercase tracking-[0.18em] text-sky-300">
                  What Close Signal Does
                </div>

                <h2 className="mt-3 text-3xl font-black leading-tight tracking-[-0.055em] sm:text-5xl">
                  숫자를 보여주는 서비스가 아니라,
                  <br />
                  움직일 순서를 알려주는 서비스입니다.
                </h2>

                <p className="mt-5 text-sm leading-8 text-slate-300 sm:text-base">
                  홈에서는 서비스의 정체성을 즉시 이해시키고, 실제 판단은
                  랭킹·시그날·본사운영 화면으로 자연스럽게 이어지도록
                  설계했습니다.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-[24px] border border-white/10 bg-white/10 p-5 backdrop-blur">
                  <div className="text-[11px] font-black uppercase tracking-[0.18em] text-sky-300">
                    01 Detect
                  </div>
                  <div className="mt-3 text-xl font-black tracking-[-0.04em]">
                    위험 감지
                  </div>
                  <div className="mt-2 text-sm leading-7 text-slate-300">
                    지역과 업종의 악화 신호를 먼저 포착합니다.
                  </div>
                </div>

                <div className="rounded-[24px] border border-white/10 bg-white/10 p-5 backdrop-blur">
                  <div className="text-[11px] font-black uppercase tracking-[0.18em] text-sky-300">
                    02 Rank
                  </div>
                  <div className="mt-3 text-xl font-black tracking-[-0.04em]">
                    우선순위화
                  </div>
                  <div className="mt-2 text-sm leading-7 text-slate-300">
                    무엇을 먼저 볼지 랭킹과 시그날로 정리합니다.
                  </div>
                </div>

                <div className="rounded-[24px] border border-white/10 bg-white/10 p-5 backdrop-blur">
                  <div className="text-[11px] font-black uppercase tracking-[0.18em] text-sky-300">
                    03 Act
                  </div>
                  <div className="mt-3 text-xl font-black tracking-[-0.04em]">
                    실행 연결
                  </div>
                  <div className="mt-2 text-sm leading-7 text-slate-300">
                    사업자 확인, 출점 판단, 점포 관리로 이어집니다.
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-[36px] border border-slate-200 bg-white p-6 shadow-sm sm:p-8 lg:p-10">
            <div className="grid gap-8 lg:grid-cols-[minmax(0,0.82fr)_minmax(0,1.18fr)] lg:items-end">
              <div>
                <div className="text-[11px] font-black uppercase tracking-[0.18em] text-[#0A6FD6]">
                  How To Use
                </div>

                <h2 className="mt-3 text-3xl font-black leading-tight tracking-[-0.055em] text-slate-950 sm:text-5xl">
                  들어오자마자
                  <br />
                  무엇을 해야 할지 보이게.
                </h2>

                <p className="mt-4 text-sm leading-8 text-slate-600 sm:text-base">
                  사용자가 누구인지에 따라 입구를 분리했습니다. 소상공인은
                  위험 확인으로, 프랜차이즈 본사는 출점·운영 판단으로 바로
                  이동합니다.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <StepCard
                  number="1"
                  title="지역·업종을 본다"
                  description="내 사업장 또는 출점 후보지와 관련된 지역·업종부터 확인합니다."
                />

                <StepCard
                  number="2"
                  title="위험 신호를 고른다"
                  description="지금 악화되는 신호, 위험 랭킹, 우선 확인 대상을 빠르게 파악합니다."
                />

                <StepCard
                  number="3"
                  title="판단으로 연결한다"
                  description="소상공인은 대응 포인트를, 본사는 출점·관리 우선순위를 결정합니다."
                />
              </div>
            </div>
          </section>

          <section className="grid gap-4 lg:grid-cols-3">
            <ExploreCard
              href={rankingsHref}
              title="랭킹"
              description="지역·업종별 위험 우선순위를 먼저 확인하는 공간입니다."
              label="랭킹 보기"
            />

            <ExploreCard
              href={signalsHref}
              title="시그날"
              description="오늘 먼저 확인해야 할 위험 신호를 인박스처럼 보는 공간입니다."
              label="시그날 보기"
            />

            <ExploreCard
              href={hqHref}
              title="본사운영"
              description="프랜차이즈 본사가 출점·점포관리·지역 방어를 판단하는 공간입니다."
              label="본사운영 보기"
            />
          </section>
        </div>
      </section>
    </main>
  );
}
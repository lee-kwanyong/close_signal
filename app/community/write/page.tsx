import type { ReactNode } from "react";
import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import { createCommunityPostAction } from "./actions";
import CategorySelector from "./CategorySelector";
import {
  buildCommunityComposeHref,
  normalizeCommunityWriteType,
} from "@/app/community/write-link";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{
  type?: string;
  topic?: string;
  error?: string;

  regionCode?: string;
  regionName?: string;

  category?: string;
  industryCategory?: string;

  signalId?: string;
  signalType?: string;
  signalTitle?: string;
  signalSummary?: string;
  recommendedAction?: string;
  why?: string;
  personalizedMessage?: string;

  title?: string;
  content?: string;

  businessNumber?: string;
  businessStatusLabel?: string;
  externalQuery?: string;
}>;

function text(value?: string | null) {
  return String(value || "").trim();
}

function compact(value?: string | null, limit = 320) {
  const normalized = text(value);
  if (!normalized) return "";
  return normalized.length > limit ? `${normalized.slice(0, limit).trim()}…` : normalized;
}

function defaultCategory(type: string) {
  switch (type) {
    case "expert":
      return "전문가에게 묻기";
    case "worry":
      return "익명 고민";
    case "success":
      return "성공사례";
    case "story":
    default:
      return "고민글";
  }
}

function typeTitle(type: string) {
  switch (type) {
    case "expert":
      return "전문가에게 묻기";
    case "worry":
      return "익명 고민 쓰기";
    case "success":
      return "성공사례 쓰기";
    case "story":
    default:
      return "고민글 작성";
  }
}

function typeDescription(type: string) {
  switch (type) {
    case "expert":
      return "운영, 계약, 입지, 매출, 폐업 위험 등 전문가에게 묻고 싶은 질문을 정리합니다.";
    case "worry":
      return "바로 주변에 말하기 어려운 고민을 익명 맥락으로 정리합니다.";
    case "success":
      return "회복 경험, 개선 흐름, 전환 사례를 실제 문맥 중심으로 남깁니다.";
    case "story":
    default:
      return "시그널이나 현장 변화에 대한 고민을 질문형 또는 사례형 글로 남깁니다.";
  }
}

function typeBadge(type: string) {
  switch (type) {
    case "expert":
      return "border-sky-200 bg-sky-50 text-sky-700";
    case "worry":
      return "border-amber-200 bg-amber-50 text-amber-700";
    case "success":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "story":
    default:
      return "border-slate-200 bg-slate-50 text-slate-700";
  }
}

function resolveIndustryCategory(sp: Awaited<SearchParams>) {
  return text(sp.industryCategory || sp.category);
}

function buildCurrentWriteHref(sp: Awaited<SearchParams>, nextType?: string) {
  return buildCommunityComposeHref({
    type: nextType || sp.type || sp.topic,
    regionCode: sp.regionCode,
    regionName: sp.regionName,
    industryCategory: resolveIndustryCategory(sp),

    signalId: sp.signalId,
    signalType: sp.signalType,
    signalTitle: sp.signalTitle,
    signalSummary: sp.signalSummary,
    recommendedAction: sp.recommendedAction,
    why: sp.why,
    personalizedMessage: sp.personalizedMessage,

    title: sp.title,
    content: sp.content,

    businessNumber: sp.businessNumber,
    businessStatusLabel: sp.businessStatusLabel,
    externalQuery: sp.externalQuery,
    error: sp.error,
  });
}

function buildInitialTitle(sp: Awaited<SearchParams>, type: string) {
  const direct = text(sp.title);
  if (direct) return direct;

  const region = text(sp.regionName || sp.regionCode);
  const industryCategory = resolveIndustryCategory(sp);
  const signalTitle = text(sp.signalTitle);
  const businessStatusLabel = text(sp.businessStatusLabel);

  if (signalTitle && region && industryCategory) {
    return `[${region} · ${industryCategory}] ${signalTitle}`;
  }

  if (signalTitle) {
    return `${signalTitle} 관련 질문`;
  }

  if (businessStatusLabel) {
    return `[사업 상태 확인] ${businessStatusLabel}`;
  }

  if (type === "expert") return "이 상황을 어떻게 해석해야 할까요?";
  if (type === "worry") return "요즘 이 흐름이 불안한데 비슷한 경험 있으신가요?";
  if (type === "success") return "이 문제를 이렇게 넘긴 경험을 공유합니다.";

  return "";
}

function buildInitialContent(sp: Awaited<SearchParams>) {
  const direct = text(sp.content);
  if (direct) return direct;

  const blocks: string[] = [];

  const region = text(sp.regionName || sp.regionCode);
  const industryCategory = resolveIndustryCategory(sp);
  const signalTitle = compact(sp.signalTitle, 180);
  const signalSummary = compact(sp.signalSummary, 320);
  const recommendedAction = compact(sp.recommendedAction, 320);
  const why = compact(sp.why, 320);
  const personalizedMessage = compact(sp.personalizedMessage, 320);
  const businessNumber = compact(sp.businessNumber, 80);
  const businessStatusLabel = compact(sp.businessStatusLabel, 180);
  const externalQuery = compact(sp.externalQuery, 180);

  if (region || industryCategory || signalTitle || signalSummary) {
    blocks.push("[연결된 문맥]");
    if (region || industryCategory) {
      blocks.push(`- 위치/업종: ${[region, industryCategory].filter(Boolean).join(" · ")}`);
    }
    if (signalTitle) blocks.push(`- 시그널: ${signalTitle}`);
    if (signalSummary) blocks.push(`- 요약: ${signalSummary}`);
  }

  if (recommendedAction || why || personalizedMessage) {
    blocks.push("");
    blocks.push("[자동 정리된 해석]");
    if (recommendedAction) blocks.push(`- Action: ${recommendedAction}`);
    if (why) blocks.push(`- Why: ${why}`);
    if (personalizedMessage) blocks.push(`- 개인화 해석: ${personalizedMessage}`);
  }

  if (businessNumber || businessStatusLabel || externalQuery) {
    blocks.push("");
    blocks.push("[사업 상태 / 외부 검증]");
    if (businessNumber) blocks.push(`- 사업자번호: ${businessNumber}`);
    if (businessStatusLabel) blocks.push(`- 상태 요약: ${businessStatusLabel}`);
    if (externalQuery) blocks.push(`- 외부 검증 검색어: ${externalQuery}`);
  }

  blocks.push("");
  blocks.push("[제가 확인하고 싶은 점]");
  blocks.push("1. 이 변화가 일시적인지 구조적인지");
  blocks.push("2. 현장에서도 비슷한 흐름이 느껴지는지");
  blocks.push("3. 지금 바로 체크해야 할 운영 포인트가 무엇인지");

  return blocks.join("\n");
}

const primaryButton =
  "inline-flex h-11 items-center justify-center rounded-2xl border border-[#0B5CAB] bg-[#0B5CAB] px-5 text-sm font-semibold text-white transition hover:border-[#084298] hover:bg-[#084298]";
const secondaryButton =
  "inline-flex h-11 items-center justify-center rounded-2xl border border-sky-200 bg-sky-50 px-5 text-sm font-semibold text-[#0B5CAB] transition hover:border-sky-300 hover:bg-sky-100";

function TypeTab({
  href,
  label,
  active,
}: {
  href: string;
  label: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={`inline-flex h-11 items-center justify-center rounded-2xl border px-4 text-sm font-semibold transition ${
        active
          ? "border-[#0B5CAB] bg-[#0B5CAB] text-white"
          : "border-sky-200 bg-sky-50 text-[#0B5CAB] hover:border-sky-300 hover:bg-sky-100"
      }`}
    >
      {label}
    </Link>
  );
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
    <section className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-[0_14px_38px_rgba(15,23,42,0.05)] sm:p-7">
      <div>
        <div className="text-[11px] font-black uppercase tracking-[0.18em] text-[#0B5CAB]">
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

function InputField({
  label,
  name,
  defaultValue,
  placeholder,
  required = false,
  description,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  placeholder?: string;
  required?: boolean;
  description?: string;
}) {
  return (
    <label className="block">
      <div className="mb-2 flex items-center gap-2">
        <span className="text-sm font-semibold text-slate-800">{label}</span>
        {required ? (
          <span className="rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-[10px] font-bold text-rose-700">
            필수
          </span>
        ) : null}
      </div>

      <input
        type="text"
        name={name}
        defaultValue={defaultValue}
        placeholder={placeholder}
        required={required}
        className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-sky-300 focus:ring-4 focus:ring-sky-100"
      />

      {description ? <p className="mt-2 text-xs leading-5 text-slate-500">{description}</p> : null}
    </label>
  );
}

function TextAreaField({
  label,
  name,
  defaultValue,
  placeholder,
  rows = 8,
  required = false,
  description,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  placeholder?: string;
  rows?: number;
  required?: boolean;
  description?: string;
}) {
  return (
    <label className="block">
      <div className="mb-2 flex items-center gap-2">
        <span className="text-sm font-semibold text-slate-800">{label}</span>
        {required ? (
          <span className="rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-[10px] font-bold text-rose-700">
            필수
          </span>
        ) : null}
      </div>

      <textarea
        name={name}
        rows={rows}
        defaultValue={defaultValue}
        placeholder={placeholder}
        required={required}
        className="w-full rounded-[24px] border border-slate-200 bg-white px-4 py-4 text-sm leading-7 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-sky-300 focus:ring-4 focus:ring-sky-100"
      />

      {description ? <p className="mt-2 text-xs leading-5 text-slate-500">{description}</p> : null}
    </label>
  );
}

function ContextBox({
  title,
  value,
}: {
  title: string;
  value: string;
}) {
  return (
    <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
      <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
        {title}
      </div>
      <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-7 text-slate-700">
        {value}
      </p>
    </div>
  );
}

function HiddenField({ name, value }: { name: string; value: string }) {
  return <input type="hidden" name={name} value={value} />;
}

export default async function CommunityWritePage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;

  const type = normalizeCommunityWriteType(sp.type || sp.topic);
  const error = text(sp.error);

  const regionCode = text(sp.regionCode);
  const regionName = text(sp.regionName || sp.regionCode);
  const industryCategory = resolveIndustryCategory(sp);

  const signalId = text(sp.signalId);
  const signalType = compact(sp.signalType, 120);
  const signalTitle = compact(sp.signalTitle, 180);
  const signalSummary = compact(sp.signalSummary, 320);
  const recommendedAction = compact(sp.recommendedAction, 320);
  const why = compact(sp.why, 320);
  const personalizedMessage = compact(sp.personalizedMessage, 320);

  const businessNumber = compact(sp.businessNumber, 80);
  const businessStatusLabel = compact(sp.businessStatusLabel, 180);
  const externalQuery = compact(sp.externalQuery, 180);

  const currentWriteHref = buildCurrentWriteHref(sp);
  const initialTitle = buildInitialTitle(sp, type);
  const initialContent = buildInitialContent(sp);
  const initialCategory = defaultCategory(type);

  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const contextCount = [
    regionName,
    industryCategory,
    signalTitle,
    businessStatusLabel,
    externalQuery,
  ].filter(Boolean).length;

  if (!user) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-16 sm:px-6">
        <section className="rounded-[32px] border border-slate-200 bg-[linear-gradient(135deg,#eef5ff_0%,#f8fbff_46%,#ffffff_100%)] p-8 shadow-[0_18px_54px_rgba(15,23,42,0.06)] sm:p-10">
          <div className="inline-flex items-center rounded-full border border-sky-200 bg-sky-50 px-4 py-1.5 text-[11px] font-black uppercase tracking-[0.18em] text-[#0B5CAB]">
            Login Required
          </div>

          <h1 className="mt-5 text-3xl font-black tracking-[-0.04em] text-slate-950">
            글쓰기는 로그인 후 가능합니다
          </h1>

          <p className="mt-4 text-sm leading-7 text-slate-600">
            커뮤니티 글 작성은 로그인 사용자만 가능합니다. 로그인 후 다시 들어오면 현재
            작성 문맥을 그대로 이어갈 수 있습니다.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href={`/auth/login?next=${encodeURIComponent(currentWriteHref)}`}
              className={primaryButton}
            >
              로그인
            </Link>
            <Link href="/community" className={secondaryButton}>
              커뮤니티로 돌아가기
            </Link>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-4 pb-14 pt-6 sm:px-6">
      <div className="space-y-6">
        <section className="overflow-hidden rounded-[34px] border border-slate-200 bg-white shadow-[0_18px_54px_rgba(15,23,42,0.06)]">
          <div className="bg-[linear-gradient(135deg,#eef5ff_0%,#f8fbff_46%,#ffffff_100%)] px-6 py-6 sm:px-8">
            <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
              <div className="min-w-0 max-w-4xl">
                <div
                  className={`inline-flex items-center rounded-full border px-4 py-1.5 text-[11px] font-black uppercase tracking-[0.18em] ${typeBadge(
                    type,
                  )}`}
                >
                  Community Write
                </div>

                <h1 className="mt-5 text-[32px] font-black tracking-[-0.05em] text-slate-950 sm:text-[46px]">
                  {typeTitle(type)}
                </h1>

                <p className="mt-4 max-w-3xl text-sm leading-8 text-slate-600 sm:text-base">
                  {typeDescription(type)}
                </p>

                <div className="mt-6 flex flex-wrap gap-2">
                  <TypeTab href={buildCurrentWriteHref(sp, "expert")} label="전문가에게 묻기" active={type === "expert"} />
                  <TypeTab href={buildCurrentWriteHref(sp, "worry")} label="익명 고민" active={type === "worry"} />
                  <TypeTab href={buildCurrentWriteHref(sp, "success")} label="성공사례" active={type === "success"} />
                  <TypeTab href={buildCurrentWriteHref(sp, "story")} label="고민글" active={type === "story"} />
                </div>
              </div>

              <div className="w-full max-w-[340px] rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_10px_24px_rgba(15,23,42,0.04)]">
                <div className="text-[11px] font-black uppercase tracking-[0.18em] text-[#0B5CAB]">
                  작성 상태
                </div>
                <div className="mt-3 text-3xl font-black tracking-[-0.04em] text-slate-950">
                  {contextCount}개 문맥
                </div>
                <p className="mt-2 text-sm leading-7 text-slate-600">
                  시그널, 지역, 업종, 사업 상태, 외부 검증 정보를 이 글과 함께 저장할 수 있습니다.
                </p>
              </div>
            </div>
          </div>
        </section>

        {error ? (
          <div className="rounded-[24px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm leading-6 text-rose-700">
            {error}
          </div>
        ) : null}

        <form action={createCommunityPostAction} className="space-y-6">
          <HiddenField name="post_type" value={type} />
          <HiddenField name="regionCode" value={regionCode} />
          <HiddenField name="regionName" value={regionName} />
          <HiddenField name="industryCategory" value={industryCategory} />
          <HiddenField name="signalId" value={signalId} />
          <HiddenField name="signalType" value={signalType} />
          <HiddenField name="signalTitle" value={signalTitle} />
          <HiddenField name="signalSummary" value={signalSummary} />
          <HiddenField name="recommendedAction" value={recommendedAction} />
          <HiddenField name="why" value={why} />
          <HiddenField name="personalizedMessage" value={personalizedMessage} />
          <HiddenField name="businessNumber" value={businessNumber} />
          <HiddenField name="businessStatusLabel" value={businessStatusLabel} />
          <HiddenField name="externalQuery" value={externalQuery} />

          <SectionCard
            eyebrow="Post Type"
            title="글 성격 선택"
            description="최종 카테고리는 여기서 선택한 값으로 저장됩니다."
          >
            <CategorySelector initialCategory={initialCategory} />
          </SectionCard>

          <SectionCard
            eyebrow="Context"
            title="연결된 문맥"
            description="이 글이 어떤 지역, 업종, 시그널, 사업 상태와 연결되는지 보여줍니다."
          >
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {regionName || industryCategory ? (
                <ContextBox
                  title="지역 · 업종"
                  value={[regionName, industryCategory].filter(Boolean).join(" · ") || "-"}
                />
              ) : null}

              {signalTitle || signalSummary ? (
                <ContextBox
                  title="연결된 시그널"
                  value={[signalTitle, signalSummary].filter(Boolean).join("\n\n")}
                />
              ) : null}

              {recommendedAction || why || personalizedMessage ? (
                <ContextBox
                  title="자동 해석"
                  value={[
                    recommendedAction ? `Action: ${recommendedAction}` : "",
                    why ? `Why: ${why}` : "",
                    personalizedMessage ? `개인화: ${personalizedMessage}` : "",
                  ]
                    .filter(Boolean)
                    .join("\n")}
                />
              ) : null}

              {businessNumber || businessStatusLabel || externalQuery ? (
                <ContextBox
                  title="사업 상태 / 외부 검증"
                  value={[
                    businessNumber ? `사업자번호: ${businessNumber}` : "",
                    businessStatusLabel ? `상태: ${businessStatusLabel}` : "",
                    externalQuery ? `검색어: ${externalQuery}` : "",
                  ]
                    .filter(Boolean)
                    .join("\n")}
                />
              ) : null}

              {!regionName &&
              !industryCategory &&
              !signalTitle &&
              !signalSummary &&
              !recommendedAction &&
              !why &&
              !personalizedMessage &&
              !businessNumber &&
              !businessStatusLabel &&
              !externalQuery ? (
                <div className="rounded-[24px] border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-sm text-slate-500 md:col-span-2 xl:col-span-3">
                  현재 함께 넘어온 추가 문맥이 없습니다.
                </div>
              ) : null}
            </div>
          </SectionCard>

          <SectionCard
            eyebrow="Write"
            title="글 작성"
            description="제목과 내용을 입력하면 커뮤니티 허브에 글이 등록됩니다."
          >
            <div className="space-y-5">
              <InputField
                label="제목"
                name="title"
                defaultValue={initialTitle}
                required
                placeholder="제목을 입력하세요"
                description="질문의 핵심이나 사례의 포인트가 드러나게 작성하는 편이 좋습니다."
              />

              <TextAreaField
                label="내용"
                name="content"
                defaultValue={initialContent}
                required
                rows={16}
                placeholder="상황, 배경, 확인하고 싶은 점을 자세히 적어주세요."
                description="줄바꿈이 그대로 보존됩니다."
              />
            </div>
          </SectionCard>

          <section className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-[0_14px_38px_rgba(15,23,42,0.05)] sm:p-7">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0">
                <div className="text-[11px] font-black uppercase tracking-[0.18em] text-[#0B5CAB]">
                  Submit
                </div>
                <h2 className="mt-2 text-2xl font-black tracking-[-0.04em] text-slate-950">
                  저장 후 다음 흐름
                </h2>
                <p className="mt-2 text-sm leading-7 text-slate-600">
                  저장 후 커뮤니티 메인으로 이동합니다. 이후 시그널, 외부 검증, 모니터 화면으로
                  다시 연결해 운영 맥락을 이어갈 수 있습니다.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <Link href="/community" className={secondaryButton}>
                  취소
                </Link>
                <button type="submit" className={primaryButton}>
                  글 등록
                </button>
              </div>
            </div>
          </section>
        </form>
      </div>
    </main>
  );
}
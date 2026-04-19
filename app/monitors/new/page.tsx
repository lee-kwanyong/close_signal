import Link from "next/link";
import { createMonitorAction } from "../actions";

export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

type PrefillState = {
  from: string;
  businessName: string;
  categoryName: string;
  regionName: string;
  address: string;
  phone: string;
  businessNumber: string;
  primaryKeyword: string;
  secondaryKeyword: string;
  brandKeyword: string;
  placeQuery: string;
  extraKeywords: string;
  note: string;
  stage: string;
  reason: string;
  score: string;
  query: string;
  regionCode: string;
  categoryId: string;
};

function one(value: string | string[] | undefined) {
  if (typeof value === "string") return value.trim();
  if (Array.isArray(value)) {
    const first = value.find((item) => typeof item === "string" && item.trim());
    return first ? first.trim() : "";
  }
  return "";
}

function firstOf(
  params: Record<string, string | string[] | undefined>,
  ...keys: string[]
) {
  for (const key of keys) {
    const value = one(params[key]);
    if (value) return value;
  }
  return "";
}

function normalizeMultiline(value: string) {
  return value
    .split(/\r?\n|,/g)
    .map((item) => item.trim())
    .filter(Boolean)
    .join("\n");
}

function sourceLabel(value: string) {
  const raw = value.toLowerCase();
  if (raw.includes("signal")) return "시그널에서 유입";
  if (raw.includes("ranking")) return "랭킹에서 유입";
  if (raw.includes("market")) return "외부검증에서 유입";
  if (raw.includes("home") || raw.includes("main")) return "홈에서 유입";
  return value ? `${value} 유입` : "직접 등록";
}

function buildAutoNote(state: Omit<PrefillState, "note">) {
  const lines = [
    state.from ? `유입경로: ${state.from}` : "",
    state.query ? `원본 query: ${state.query}` : "",
    state.stage ? `추천 stage: ${state.stage}` : "",
    state.reason ? `원인 코드/사유: ${state.reason}` : "",
    state.score ? `참고 score: ${state.score}` : "",
    state.regionCode ? `regionCode: ${state.regionCode}` : "",
    state.categoryId ? `categoryId: ${state.categoryId}` : "",
  ].filter(Boolean);

  return lines.join("\n");
}

function resolvePrefill(
  params: Record<string, string | string[] | undefined>
): PrefillState {
  const from = firstOf(params, "from");
  const businessName = firstOf(params, "businessName", "business_name", "query");
  const categoryName = firstOf(params, "categoryName", "category_name");
  const regionName = firstOf(params, "regionName", "region_name");
  const address = firstOf(params, "address", "road_address", "roadAddress");
  const phone = firstOf(params, "phone");
  const businessNumber = firstOf(params, "businessNumber", "business_number");
  const primaryKeyword =
    firstOf(params, "primaryKeyword", "primary_keyword") || businessName;
  const secondaryKeyword =
    firstOf(params, "secondaryKeyword", "secondary_keyword") ||
    [regionName, categoryName].filter(Boolean).join(" ");
  const brandKeyword =
    firstOf(params, "brandKeyword", "brand_keyword") || businessName;
  const placeQuery =
    firstOf(params, "placeQuery", "place_query") || businessName;
  const extraKeywords = normalizeMultiline(
    firstOf(params, "extraKeywords", "extra_keywords")
  );
  const stage = firstOf(params, "stage");
  const reason = firstOf(params, "reason");
  const score = firstOf(params, "score");
  const query = firstOf(params, "query");
  const regionCode = firstOf(params, "regionCode", "region_code");
  const categoryId = firstOf(params, "categoryId", "category_id");

  const stateWithoutNote = {
    from,
    businessName,
    categoryName,
    regionName,
    address,
    phone,
    businessNumber,
    primaryKeyword,
    secondaryKeyword,
    brandKeyword,
    placeQuery,
    extraKeywords,
    stage,
    reason,
    score,
    query,
    regionCode,
    categoryId,
  };

  const note = firstOf(params, "note") || buildAutoNote(stateWithoutNote);

  return {
    ...stateWithoutNote,
    note,
  };
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
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-[0_12px_30px_rgba(15,23,42,0.05)] sm:p-7">
      <div className="max-w-3xl">
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
  placeholder,
  required = false,
  defaultValue,
  description,
}: {
  label: string;
  name: string;
  placeholder?: string;
  required?: boolean;
  defaultValue?: string;
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
        required={required}
        defaultValue={defaultValue}
        placeholder={placeholder}
        className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-sky-300 focus:ring-4 focus:ring-sky-100"
      />

      {description ? (
        <p className="mt-2 text-xs leading-5 text-slate-500">{description}</p>
      ) : null}
    </label>
  );
}

function TextAreaField({
  label,
  name,
  placeholder,
  defaultValue,
  description,
  rows = 4,
}: {
  label: string;
  name: string;
  placeholder?: string;
  defaultValue?: string;
  description?: string;
  rows?: number;
}) {
  return (
    <label className="block">
      <div className="mb-2 text-sm font-semibold text-slate-800">{label}</div>

      <textarea
        name={name}
        rows={rows}
        defaultValue={defaultValue}
        placeholder={placeholder}
        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-sky-300 focus:ring-4 focus:ring-sky-100"
      />

      {description ? (
        <p className="mt-2 text-xs leading-5 text-slate-500">{description}</p>
      ) : null}
    </label>
  );
}

function GuideTile({
  title,
  description,
  tone = "default",
}: {
  title: string;
  description: string;
  tone?: "default" | "info" | "warning";
}) {
  const toneClass =
    tone === "info"
      ? "border-sky-200 bg-sky-50 text-sky-800"
      : tone === "warning"
        ? "border-amber-200 bg-amber-50 text-amber-800"
        : "border-slate-200 bg-slate-50 text-slate-700";

  return (
    <div className={`rounded-[24px] border p-4 ${toneClass}`}>
      <p className="text-sm font-bold tracking-[-0.02em]">{title}</p>
      <p className="mt-2 text-xs leading-6 opacity-90">{description}</p>
    </div>
  );
}

export default async function NewMonitorPage({
  searchParams,
}: {
  searchParams?: SearchParams;
}) {
  const params = (await searchParams) || {};
  const prefill = resolvePrefill(params);

  const hasPrefill = Boolean(
    prefill.from ||
      prefill.businessName ||
      prefill.categoryName ||
      prefill.regionName ||
      prefill.reason ||
      prefill.query
  );

  return (
    <main className="mx-auto max-w-6xl px-4 pb-14 pt-6 sm:px-6">
      <div className="space-y-6">
        <section className="overflow-hidden rounded-[34px] border border-slate-200 bg-white shadow-[0_16px_40px_rgba(15,23,42,0.06)]">
          <div className="bg-[linear-gradient(135deg,#eef5ff_0%,#f8fbff_48%,#ffffff_100%)] px-6 py-6 sm:px-8">
            <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
              <div className="min-w-0 max-w-4xl">
                <div className="inline-flex items-center rounded-full border border-sky-200 bg-sky-50 px-4 py-1.5 text-[11px] font-black uppercase tracking-[0.18em] text-[#0B5CAB]">
                  Monitor Intake
                </div>

                <h1 className="mt-4 text-[30px] font-black tracking-[-0.05em] text-slate-950 sm:text-[38px]">
                  사업장 모니터 등록
                </h1>

                <p className="mt-3 text-sm leading-7 text-slate-600 sm:text-[15px]">
                  신규 사업장을 등록하면 refresh → rebuild-health → last-chance 흐름으로
                  시장위험, 사업장위험, 구조가능성, 최종 폐업위험을 계산하고 개입 대상을
                  추적할 수 있습니다.
                </p>

                <div className="mt-5 grid gap-3 md:grid-cols-3">
                  <GuideTile
                    title="1. 접수"
                    description="기본정보와 위치·식별 정보를 먼저 등록합니다."
                    tone="info"
                  />
                  <GuideTile
                    title="2. 탐지"
                    description="검색 키워드와 플레이스 조회어를 저장합니다."
                    tone="default"
                  />
                  <GuideTile
                    title="3. 개입 준비"
                    description="유입 문맥과 운영 메모를 남겨 후속 조치를 연결합니다."
                    tone="warning"
                  />
                </div>
              </div>

              <div className="flex shrink-0 flex-wrap items-center gap-2">
                <Link
                  href="/monitors"
                  className="inline-flex h-12 items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 transition hover:border-sky-200 hover:bg-sky-50 hover:text-[#0B5CAB]"
                >
                  목록으로
                </Link>
              </div>
            </div>
          </div>
        </section>

        {hasPrefill ? (
          <section className="rounded-[30px] border border-emerald-200 bg-emerald-50/70 p-6 shadow-[0_10px_24px_rgba(15,23,42,0.04)]">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0">
                <div className="text-[11px] font-black uppercase tracking-[0.18em] text-emerald-700">
                  Auto Prefill
                </div>
                <h2 className="mt-2 text-xl font-black tracking-[-0.03em] text-emerald-950">
                  자동 입력이 감지되었습니다
                </h2>
                <p className="mt-2 text-sm leading-7 text-emerald-900/80">
                  {sourceLabel(prefill.from)} 기준으로 일부 필드가 미리 채워졌습니다.
                  필요한 값만 확인 후 바로 저장하면 됩니다.
                </p>
              </div>

              <div className="rounded-[22px] border border-emerald-200 bg-white/80 px-4 py-3 text-sm font-semibold text-emerald-800">
                유입경로 {prefill.from || "직접 등록"}
              </div>
            </div>
          </section>
        ) : null}

        <form action={createMonitorAction} className="space-y-6">
          <SectionCard
            eyebrow="Basic Profile"
            title="기본 접수 정보"
            description="모니터 대상을 식별하는 핵심 정보입니다. 이 영역은 목록, 상세, 위험 계산 기준의 기본값으로 사용됩니다."
          >
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <InputField
                label="상호명"
                name="businessName"
                required
                defaultValue={prefill.businessName}
                placeholder="예: OO카페"
                description="실제 사업장명을 입력합니다."
              />
              <InputField
                label="업종"
                name="categoryName"
                required
                defaultValue={prefill.categoryName}
                placeholder="예: 카페"
                description="대표 업종 또는 분류명을 입력합니다."
              />
              <InputField
                label="지역"
                name="regionName"
                required
                defaultValue={prefill.regionName}
                placeholder="예: 서울 강남구"
                description="행정구역 또는 운영 지역명을 입력합니다."
              />
              <InputField
                label="주소"
                name="address"
                required
                defaultValue={prefill.address}
                placeholder="예: 서울 강남구 테헤란로 ..."
                description="가능하면 도로명주소 기준으로 입력합니다."
              />
            </div>
          </SectionCard>

          <SectionCard
            eyebrow="Identity"
            title="위치 및 식별 정보"
            description="외부 데이터 조회와 현장 구분을 위한 보조 식별 정보입니다. 없어도 등록은 가능하지만, 있으면 정확도가 좋아집니다."
          >
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <InputField
                label="전화번호"
                name="phone"
                defaultValue={prefill.phone}
                placeholder="예: 02-1234-5678"
                description="플레이스 매칭이나 운영 확인에 활용할 수 있습니다."
              />
              <InputField
                label="사업자번호"
                name="businessNumber"
                defaultValue={prefill.businessNumber}
                placeholder="예: 123-45-67890"
                description="있을 경우 식별 정확도가 높아집니다."
              />
            </div>
          </SectionCard>

          <SectionCard
            eyebrow="Detection Input"
            title="탐지·검색 입력"
            description="refresh 시 검색 추세, 외부 인텔, 플레이스 확인에 사용하는 입력입니다. 가능한 한 실제 검색 습관에 가까운 단어로 넣는 것이 좋습니다."
          >
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <InputField
                label="대표 키워드"
                name="primaryKeyword"
                defaultValue={prefill.primaryKeyword}
                placeholder="예: OO카페"
                description="브랜드 또는 상호 중심의 대표 검색어입니다."
              />
              <InputField
                label="지역+업종 키워드"
                name="secondaryKeyword"
                defaultValue={prefill.secondaryKeyword}
                placeholder="예: 강남 카페"
                description="상권 수요와 일반 검색 추세 확인용입니다."
              />
              <InputField
                label="브랜드 키워드"
                name="brandKeyword"
                defaultValue={prefill.brandKeyword}
                placeholder="예: OO카페"
                description="브랜드 검색량 확인용으로 사용합니다."
              />
              <InputField
                label="플레이스 조회어"
                name="placeQuery"
                defaultValue={prefill.placeQuery}
                placeholder="예: OO카페"
                description="지도·플레이스 기반 조회에 사용하는 키워드입니다."
              />
            </div>

            <div className="mt-5">
              <TextAreaField
                label="추가 키워드"
                name="extraKeywords"
                defaultValue={prefill.extraKeywords}
                rows={5}
                placeholder={`예:\n강남 디저트 카페\n강남 브런치\nOO카페 리뷰`}
                description="줄바꿈 또는 쉼표로 여러 개 입력할 수 있습니다."
              />
            </div>
          </SectionCard>

          <SectionCard
            eyebrow="Operational Context"
            title="유입 문맥 및 운영 힌트"
            description="시그널, 랭킹, 홈, 외부검증 등 어디서 넘어왔는지와 운영자가 참고할 힌트를 남깁니다. 이후 상세 화면의 개입 문맥으로 이어집니다."
          >
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <InputField
                label="from"
                name="from"
                defaultValue={prefill.from}
                placeholder="예: signals"
                description="유입 화면 또는 출처를 남깁니다."
              />
              <InputField
                label="regionCode"
                name="regionCode"
                defaultValue={prefill.regionCode}
                placeholder="예: 11680"
                description="지역 코드가 있으면 함께 저장합니다."
              />
              <InputField
                label="categoryId"
                name="categoryId"
                defaultValue={prefill.categoryId}
                placeholder="예: 12"
                description="카테고리 식별자가 있으면 함께 저장합니다."
              />
              <InputField
                label="stage"
                name="stage"
                defaultValue={prefill.stage}
                placeholder="예: caution"
                description="초기 권장 단계가 있다면 남깁니다."
              />
              <InputField
                label="reason"
                name="reason"
                defaultValue={prefill.reason}
                placeholder="예: place_presence_weak"
                description="초기 위험 원인 코드 또는 사유를 입력합니다."
              />
              <InputField
                label="score"
                name="score"
                defaultValue={prefill.score}
                placeholder="예: 67"
                description="사전 참고 점수가 있으면 입력합니다."
              />

              <div className="md:col-span-2">
                <InputField
                  label="query"
                  name="query"
                  defaultValue={prefill.query}
                  placeholder="예: 강남 카페"
                  description="원본 검색어 또는 유입 쿼리를 남깁니다."
                />
              </div>
            </div>

            <div className="mt-5">
              <TextAreaField
                label="메모"
                name="note"
                rows={7}
                defaultValue={prefill.note}
                placeholder="운영자가 참고할 메모를 남깁니다."
                description="접수 배경, 현장 인지사항, 후속 액션 힌트 등을 기록합니다."
              />
            </div>
          </SectionCard>

          <section className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-[0_12px_30px_rgba(15,23,42,0.05)] sm:p-7">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0">
                <div className="text-[11px] font-black uppercase tracking-[0.18em] text-[#0B5CAB]">
                  Submit
                </div>
                <h2 className="mt-2 text-2xl font-black tracking-[-0.04em] text-slate-950">
                  등록 후 다음 단계
                </h2>
                <p className="mt-2 text-sm leading-7 text-slate-600">
                  저장 후 모니터 상세에서 refresh, rebuild-health, last-chance 흐름을
                  이어서 실행하면 됩니다.
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-end gap-3">
                <Link
                  href="/monitors"
                  className="inline-flex h-12 items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 transition hover:border-sky-200 hover:bg-sky-50 hover:text-[#0B5CAB]"
                >
                  취소
                </Link>

                <button
                  type="submit"
                  className="inline-flex h-12 items-center justify-center rounded-2xl border border-[#0B5CAB] bg-[#0B5CAB] px-6 text-sm font-semibold text-white transition hover:border-[#084298] hover:bg-[#084298]"
                >
                  모니터 등록
                </button>
              </div>
            </div>
          </section>
        </form>
      </div>
    </main>
  );
}
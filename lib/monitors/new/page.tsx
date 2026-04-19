import EmptyState from "@/components/ui/EmptyState";
import PageHeader from "@/components/ui/PageHeader";
import SectionCard from "@/components/ui/SectionCard";
import { supabaseServer } from "@/lib/supabase/server";
import { createMonitorAction } from "@/app/monitors/actions";

export const dynamic = "force-dynamic";

type SearchParams =
  | Promise<Record<string, string | string[] | undefined>>
  | Record<string, string | string[] | undefined>;

function one(value: string | string[] | undefined) {
  return typeof value === "string" ? value.trim() : "";
}

function textValue(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
  }
  return "";
}

function normalizeBusinessNumber(value: unknown) {
  return String(value ?? "").replace(/\D/g, "").slice(0, 10);
}

function decode(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function uniqueKeywords(raw: string) {
  return Array.from(
    new Set(
      raw
        .split(/[\n,]/g)
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  );
}

function sourceLabel(value?: string) {
  const normalized = String(value ?? "").trim().toLowerCase();

  switch (normalized) {
    case "signals":
      return "시그널에서 유입";
    case "business-check":
      return "사업자조회에서 유입";
    case "market-check":
      return "외부검증에서 유입";
    case "rankings":
      return "랭킹에서 유입";
    default:
      return normalized ? normalized : "직접 등록";
  }
}

export default async function NewMonitorPage({
  searchParams,
}: {
  searchParams?: SearchParams;
}) {
  const params = await Promise.resolve(searchParams ?? {});

  const error = decode(one(params.error));
  const source = one(params.from) || one(params.source);

  const businessName = one(params.businessName) || one(params.business_name);
  const businessNumber = normalizeBusinessNumber(
    one(params.businessNumber) || one(params.business_number),
  );
  const address = one(params.address);
  const regionCode = one(params.regionCode) || one(params.region_code);
  const regionName = one(params.regionName) || one(params.region_name);
  const categoryId = one(params.categoryId) || one(params.category_id);
  const categoryCode = one(params.categoryCode) || one(params.category_code);
  const categoryName = one(params.categoryName) || one(params.category_name);
  const categoryGroupCode =
    one(params.categoryGroupCode) || one(params.category_group_code);
  const query = one(params.query);
  const hintStage = one(params.stage);
  const hintReason = one(params.reason);
  const hintScore = one(params.score);

  const trendKeywords =
    one(params.trendKeywords) ||
    one(params.trend_keywords) ||
    businessName ||
    query ||
    "";

  const previewKeywords = uniqueKeywords(trendKeywords || businessName || query || "");

  const authClient = await supabaseServer();
  const {
    data: { user },
  } = await authClient.auth.getUser();

  async function submitMonitorAction(formData: FormData) {
    "use server";

    const normalized = new FormData();

    const business_name = String(formData.get("business_name") ?? "").trim();
    const business_number = String(formData.get("business_number") ?? "").trim();
    const address = String(formData.get("address") ?? "").trim();
    const region_code = String(formData.get("region_code") ?? "").trim();
    const region_name = String(formData.get("region_name") ?? "").trim();
    const radius = String(formData.get("radius") ?? "").trim();
    const category_id = String(formData.get("category_id") ?? "").trim();
    const category_code = String(formData.get("category_code") ?? "").trim();
    const category_group_code = String(formData.get("category_group_code") ?? "").trim();
    const category_name = String(formData.get("category_name") ?? "").trim();
    const trend_keywords = String(formData.get("trend_keywords") ?? "").trim();

    normalized.set("business_name", business_name);
    normalized.set("business_number", business_number);
    normalized.set("address", address);
    normalized.set("region_code", region_code);
    normalized.set("region_name", region_name);
    normalized.set("radius", radius);
    normalized.set("category_id", category_id);
    normalized.set("category_code", category_code);
    normalized.set("category_group_code", category_group_code);
    normalized.set("category_name", category_name);
    normalized.set("trend_keywords", trend_keywords);

    normalized.set("businessName", business_name);
    normalized.set("businessNumber", business_number);
    normalized.set("regionCode", region_code);
    normalized.set("regionName", region_name);
    normalized.set("categoryId", category_id);
    normalized.set("categoryCode", category_code);
    normalized.set("categoryGroupCode", category_group_code);
    normalized.set("categoryName", category_name);

    normalized.set("primaryKeyword", trend_keywords);
    normalized.set("extraKeywords", trend_keywords);

    await createMonitorAction(normalized);
  }

  if (!user) {
    return (
      <main className="mx-auto max-w-4xl px-6 py-16">
        <EmptyState
          title="모니터 등록은 로그인 후 가능합니다"
          description="사업장 개입용 모니터는 로그인 사용자 기준으로 운영됩니다."
          actionHref="/auth/login?next=%2Fmonitors%2Fnew"
          actionLabel="로그인"
          secondaryHref="/auth/signup?next=%2Fmonitors%2Fnew"
          secondaryLabel="회원가입"
        />
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-6 py-10 lg:py-12">
      <PageHeader
        eyebrow="Monitor Intake"
        title="사업장 모니터 등록"
        description="탐지에서 끝내지 않고, 등록 즉시 이유·액션·증거·재평가 루프로 들어가게 만드는 intake 화면입니다."
      />

      {error ? (
        <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm font-medium text-rose-700">
          {error}
        </div>
      ) : null}

      <div className="mt-6 flex flex-wrap gap-2">
        <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700">
          {sourceLabel(source)}
        </span>
        {hintStage ? (
          <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
            stage {hintStage}
          </span>
        ) : null}
        {hintReason ? (
          <span className="inline-flex items-center rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700">
            reason {hintReason}
          </span>
        ) : null}
        {hintScore ? (
          <span className="inline-flex items-center rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700">
            score {hintScore}
          </span>
        ) : null}
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <SectionCard
          title="기본 정보"
          description="사업장명과 주소는 필수입니다. 나머지 정보가 많을수록 자동 카드 품질이 올라갑니다."
        >
          <form action={submitMonitorAction} className="space-y-6">
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <div>
                <label htmlFor="business_name" className="text-sm font-semibold text-slate-700">
                  사업장명 *
                </label>
                <input
                  id="business_name"
                  name="business_name"
                  defaultValue={businessName}
                  required
                  placeholder="예: 성수브루잉"
                  className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900"
                />
              </div>

              <div>
                <label htmlFor="business_number" className="text-sm font-semibold text-slate-700">
                  사업자번호
                </label>
                <input
                  id="business_number"
                  name="business_number"
                  defaultValue={businessNumber}
                  placeholder="숫자 10자리"
                  className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900"
                />
              </div>

              <div className="md:col-span-2">
                <label htmlFor="address" className="text-sm font-semibold text-slate-700">
                  주소 *
                </label>
                <input
                  id="address"
                  name="address"
                  defaultValue={address}
                  required
                  placeholder="예: 서울특별시 성동구 연무장길 00"
                  className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
              <div>
                <label htmlFor="region_code" className="text-sm font-semibold text-slate-700">
                  지역 코드
                </label>
                <input
                  id="region_code"
                  name="region_code"
                  defaultValue={regionCode}
                  placeholder="예: KR-11"
                  className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900"
                />
              </div>

              <div>
                <label htmlFor="region_name" className="text-sm font-semibold text-slate-700">
                  지역명
                </label>
                <input
                  id="region_name"
                  name="region_name"
                  defaultValue={regionName}
                  placeholder="예: 서울"
                  className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900"
                />
              </div>

              <div>
                <label htmlFor="radius" className="text-sm font-semibold text-slate-700">
                  반경(m)
                </label>
                <input
                  id="radius"
                  name="radius"
                  type="number"
                  min={100}
                  step={50}
                  defaultValue={500}
                  className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900"
                />
              </div>

              <div>
                <label htmlFor="category_id" className="text-sm font-semibold text-slate-700">
                  업종 ID
                </label>
                <input
                  id="category_id"
                  name="category_id"
                  defaultValue={categoryId}
                  placeholder="숫자 ID"
                  className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900"
                />
              </div>

              <div>
                <label htmlFor="category_code" className="text-sm font-semibold text-slate-700">
                  업종 코드
                </label>
                <input
                  id="category_code"
                  name="category_code"
                  defaultValue={categoryCode}
                  placeholder="예: CS300001"
                  className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900"
                />
              </div>

              <div>
                <label
                  htmlFor="category_group_code"
                  className="text-sm font-semibold text-slate-700"
                >
                  카테고리 그룹 코드
                </label>
                <input
                  id="category_group_code"
                  name="category_group_code"
                  defaultValue={categoryGroupCode}
                  placeholder="예: FD6"
                  className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900"
                />
              </div>

              <div className="md:col-span-2 xl:col-span-3">
                <label htmlFor="category_name" className="text-sm font-semibold text-slate-700">
                  업종명
                </label>
                <input
                  id="category_name"
                  name="category_name"
                  defaultValue={categoryName}
                  placeholder="예: 수제맥주 / 디저트카페"
                  className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900"
                />
              </div>
            </div>

            <div>
              <label htmlFor="trend_keywords" className="text-sm font-semibold text-slate-700">
                추적 키워드
              </label>
              <textarea
                id="trend_keywords"
                name="trend_keywords"
                defaultValue={trendKeywords}
                rows={4}
                placeholder="검색 추세와 수요 변화를 읽을 키워드를 쉼표나 줄바꿈으로 입력"
                className="mt-2 w-full rounded-[1.5rem] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900"
              />
              <p className="mt-2 text-sm text-slate-500">
                비워두면 사업장명 또는 유입 query를 기본 키워드로 사용합니다.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="submit"
                className="inline-flex h-12 items-center rounded-2xl bg-emerald-600 px-5 text-sm font-semibold text-white transition hover:bg-emerald-700"
              >
                등록하고 상세 보기
              </button>
              <a
                href="/monitors"
                className="inline-flex h-12 items-center rounded-2xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                목록으로 돌아가기
              </a>
            </div>
          </form>
        </SectionCard>

        <div className="space-y-6">
          <SectionCard
            title="등록 후보 미리보기"
            description="지금 입력한 정보로 어떤 개입 루프가 열리는지 한 번에 확인합니다."
          >
            <div className="space-y-4 text-sm leading-7 text-slate-600">
              <div className="rounded-[1.4rem] border border-slate-200 bg-slate-50 p-4">
                <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                  사업장
                </div>
                <div className="mt-2 text-lg font-bold text-slate-950">
                  {textValue(businessName) || "이름 미입력"}
                </div>
                <div className="mt-1">{textValue(address) || "주소 미입력"}</div>
              </div>

              <div className="rounded-[1.4rem] border border-slate-200 bg-slate-50 p-4">
                <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                  시장 식별자
                </div>
                <div className="mt-2">
                  {textValue(regionName, regionCode) || "지역 미입력"} /{" "}
                  {textValue(categoryName, categoryCode, categoryId) || "업종 미입력"}
                </div>
              </div>

              <div className="rounded-[1.4rem] border border-slate-200 bg-slate-50 p-4">
                <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                  추적 키워드
                </div>
                {previewKeywords.length > 0 ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {previewKeywords.slice(0, 6).map((item, index) => (
                      <span
                        key={`${item}-${index}`}
                        className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700"
                      >
                        {item}
                      </span>
                    ))}
                  </div>
                ) : (
                  <div className="mt-2 text-slate-500">키워드 미입력</div>
                )}
              </div>
            </div>
          </SectionCard>

          <SectionCard
            title="등록 후 자동 루프"
            description="이제 탐지에서 멈추지 않고 운영 흐름으로 바로 이어집니다."
          >
            <div className="space-y-4 text-sm leading-7 text-slate-600">
              <div className="rounded-[1.4rem] border border-emerald-100 bg-emerald-50/40 p-4">
                <div className="font-semibold text-slate-900">1. 초기 health snapshot 생성</div>
                <p className="mt-1">
                  시장위험, 사업장위험, 구조가능성, 종합 폐업위험의 첫 스냅샷을 계산합니다.
                </p>
              </div>

              <div className="rounded-[1.4rem] border border-emerald-100 bg-emerald-50/40 p-4">
                <div className="font-semibold text-slate-900">2. 이유 정규화</div>
                <p className="mt-1">
                  legacy reason이 canonical reason으로 정규화되고 dimension/severity가 붙습니다.
                </p>
              </div>

              <div className="rounded-[1.4rem] border border-emerald-100 bg-emerald-50/40 p-4">
                <div className="font-semibold text-slate-900">3. 추천 액션 자동 생성</div>
                <p className="mt-1">
                  원인별 playbook, 필요한 증거, 성공기준, 다음 리뷰일까지 함께 생성됩니다.
                </p>
              </div>

              <div className="rounded-[1.4rem] border border-emerald-100 bg-emerald-50/40 p-4">
                <div className="font-semibold text-slate-900">4. 태스크 → 결과 → 재평가</div>
                <p className="mt-1">
                  상세 화면에서 액션을 태스크로 전환하고, 결과를 기록하면 즉시 재평가가 돌아갑니다.
                </p>
              </div>
            </div>
          </SectionCard>

          <SectionCard
            title="입력 팁"
            description="정확도가 가장 많이 올라가는 항목부터 채우면 됩니다."
          >
            <ul className="space-y-3 text-sm leading-7 text-slate-600">
              <li>사업장명 + 주소는 모니터의 핵심 식별자입니다.</li>
              <li>사업자번호가 있으면 국세청 상태 근거가 더 강해집니다.</li>
              <li>업종명과 그룹 코드를 넣으면 경쟁도/시장 매칭 정확도가 올라갑니다.</li>
              <li>추적 키워드는 검색 추세와 수요 반등 실험의 기반이 됩니다.</li>
            </ul>
          </SectionCard>
        </div>
      </div>
    </main>
  );
}
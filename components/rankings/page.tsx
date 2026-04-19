import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";

type SearchParams = Promise<{
  region?: string;
  category?: string;
  grade?: string;
  sort?: string;
  q?: string;
  page?: string;
}>;

type RegionOption = {
  code: string;
  name: string;
};

type RankingRow = Record<string, unknown>;
type CategoryRow = {
  category_code?: string | null;
  code?: string | null;
  category_name?: string | null;
  name?: string | null;
};

const REGION_OPTIONS: RegionOption[] = [
  { code: "KR", name: "전국" },
  { code: "KR-11", name: "서울" },
  { code: "KR-26", name: "부산" },
  { code: "KR-27", name: "대구" },
  { code: "KR-28", name: "인천" },
  { code: "KR-29", name: "광주" },
  { code: "KR-30", name: "대전" },
  { code: "KR-31", name: "울산" },
  { code: "KR-36", name: "세종" },
  { code: "KR-41", name: "경기" },
  { code: "KR-42", name: "강원" },
  { code: "KR-43", name: "충북" },
  { code: "KR-44", name: "충남" },
  { code: "KR-45", name: "전북" },
  { code: "KR-46", name: "전남" },
  { code: "KR-47", name: "경북" },
  { code: "KR-48", name: "경남" },
  { code: "KR-50", name: "제주" },
];

const PAGE_SIZE = 20;

function str(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function num(value: unknown, fallback = 0) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "" && !Number.isNaN(Number(value))) {
    return Number(value);
  }
  return fallback;
}

function formatNumber(value: unknown) {
  return new Intl.NumberFormat("ko-KR").format(num(value));
}

function gradeLabel(value: unknown) {
  const raw = str(value).toLowerCase();
  if (raw.includes("critical")) return "치명적";
  if (raw.includes("high")) return "높음";
  if (raw.includes("medium")) return "중간";
  if (raw.includes("low")) return "낮음";
  return raw || "-";
}

function gradeTone(value: unknown) {
  const raw = str(value).toLowerCase();
  if (raw.includes("critical")) {
    return "bg-violet-50 text-violet-700 ring-1 ring-violet-200";
  }
  if (raw.includes("high")) {
    return "bg-rose-50 text-rose-700 ring-1 ring-rose-200";
  }
  if (raw.includes("medium")) {
    return "bg-amber-50 text-amber-700 ring-1 ring-amber-200";
  }
  return "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200";
}

function buildHref(
  next: Partial<{
    region: string;
    category: string;
    grade: string;
    sort: string;
    q: string;
    page: number | string;
  }>,
  current: {
    region: string;
    category: string;
    grade: string;
    sort: string;
    q: string;
    page: number;
  }
) {
  const params = new URLSearchParams();

  const merged = {
    region: String(next.region ?? current.region),
    category: String(next.category ?? current.category),
    grade: String(next.grade ?? current.grade),
    sort: String(next.sort ?? current.sort),
    q: String(next.q ?? current.q),
    page: String(next.page ?? current.page),
  };

  if (merged.region && merged.region !== "KR") params.set("region", merged.region);
  if (merged.category && merged.category !== "all") params.set("category", merged.category);
  if (merged.grade && merged.grade !== "all") params.set("grade", merged.grade);
  if (merged.sort && merged.sort !== "risk_desc") params.set("sort", merged.sort);
  if (merged.q) params.set("q", merged.q);
  if (merged.page && merged.page !== "1") params.set("page", merged.page);

  const query = params.toString();
  return query ? `/rankings?${query}` : "/rankings";
}

function getRegionName(regionCode: string) {
  return REGION_OPTIONS.find((item) => item.code === regionCode)?.name ?? regionCode;
}

export default async function RankingsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;

  const region = sp.region || "KR";
  const category = sp.category || "all";
  const grade = sp.grade || "all";
  const sort = sp.sort || "risk_desc";
  const q = (sp.q || "").trim();
  const page = Math.max(1, Number(sp.page || "1") || 1);

  const supabase = await supabaseServer();

  const [{ data: categoriesData }, rankingViewResult, scoreTableResult] = await Promise.all([
    supabase.from("category_master").select("*").order("category_name", { ascending: true }),
    supabase.from("v_risk_rankings").select("*").limit(5000),
    supabase.from("risk_scores").select("*").limit(5000),
  ]);

  const categoryOptions = [
    { code: "all", name: "전체 카테고리" },
    ...((categoriesData ?? []) as CategoryRow[])
      .map((row) => ({
        code: row.category_code ?? row.code ?? "",
        name: row.category_name ?? row.name ?? row.category_code ?? row.code ?? "",
      }))
      .filter((item) => item.code && item.name),
  ];

  let rawRows: RankingRow[] = [];
  if (!rankingViewResult.error && rankingViewResult.data) {
    rawRows = rankingViewResult.data as RankingRow[];
  } else if (!scoreTableResult.error && scoreTableResult.data) {
    rawRows = scoreTableResult.data as RankingRow[];
  }

  const rows = rawRows.map((row) => ({
    regionCode: str(row.region_code, "KR"),
    regionName:
      str(row.region_name) ||
      (str(row.region_code) === "KR" ? "전국" : getRegionName(str(row.region_code))),
    categoryCode: str(row.category_code || row.category_id),
    categoryName: str(row.category_name) || str(row.category_code || row.category_id),
    riskScore: num(row.final_risk_score ?? row.risk_score),
    riskGrade: str(row.final_risk_grade ?? row.risk_grade, "low"),
    businessCount: num(row.business_count),
    signalCount: num(row.signal_count ?? row.close_risk_count),
    netChange30d: num(row.net_change_30d),
  }));

  const hasSelectedRegionRows = rows.some((row) => row.regionCode === region);

  const filtered = rows
    .filter((row) => {
      if (region !== "KR" && hasSelectedRegionRows) {
        if (row.regionCode !== region) return false;
      } else if (region === "KR") {
        if (row.regionCode !== "KR") return false;
      }

      if (category !== "all" && row.categoryCode !== category) return false;
      if (grade !== "all" && !row.riskGrade.toLowerCase().includes(grade.toLowerCase())) return false;

      if (q) {
        const haystack = `${row.regionName} ${row.regionCode} ${row.categoryName} ${row.categoryCode}`.toLowerCase();
        if (!haystack.includes(q.toLowerCase())) return false;
      }

      return true;
    })
    .sort((a, b) => {
      if (sort === "business_desc") return b.businessCount - a.businessCount;
      if (sort === "signal_desc") return b.signalCount - a.signalCount;
      if (sort === "net_change_asc") return a.netChange30d - b.netChange30d;
      return b.riskScore - a.riskScore;
    });

  const totalCount = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const startIndex = (safePage - 1) * PAGE_SIZE;
  const pageRows = filtered.slice(startIndex, startIndex + PAGE_SIZE);

  const current = {
    region,
    category,
    grade,
    sort,
    q,
    page: safePage,
  };

  const nationwideMode = region !== "KR" && !hasSelectedRegionRows;

  const avgRisk =
    filtered.length > 0
      ? filtered.reduce((sum, row) => sum + row.riskScore, 0) / filtered.length
      : 0;

  const criticalCount = filtered.filter((row) => row.riskGrade.toLowerCase().includes("critical")).length;
  const highCount = filtered.filter((row) => row.riskGrade.toLowerCase().includes("high")).length;
  const mediumCount = filtered.filter((row) => row.riskGrade.toLowerCase().includes("medium")).length;
  const lowCount = filtered.filter((row) => row.riskGrade.toLowerCase().includes("low")).length;

  return (
    <main className="min-h-screen bg-white text-slate-900">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
        <section className="rounded-[32px] border border-[#d7f0ea] bg-white p-8 shadow-[0_20px_60px_rgba(15,118,110,0.08)] sm:p-10">
          <div className="inline-flex items-center rounded-full bg-[#ecfdf8] px-3 py-1 text-xs font-semibold text-[#0f766e] ring-1 ring-[#b7efe2]">
            RANKINGS
          </div>

          <h1 className="mt-5 text-3xl font-extrabold tracking-tight text-slate-950 sm:text-5xl">
            현재는 전국 기준 업종 랭킹을
            <br className="hidden sm:block" />
            우선 보여줍니다
          </h1>

          <p className="mt-4 max-w-3xl text-sm leading-6 text-slate-600 sm:text-base">
            지역별 상세 집계가 아직 충분하지 않은 곳은 전국 기준 결과를 우선 보여줍니다.
            점수는 사업장 수, 최근 순변화, 위험 신호 수를 함께 반영한 임시 랭킹입니다.
          </p>
        </section>

        {nationwideMode ? (
          <section className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm font-medium text-amber-800">
            선택한 지역({getRegionName(region)})의 개별 집계가 아직 충분하지 않아 전국 기준 결과를
            대신 보여주고 있습니다.
          </section>
        ) : null}

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-3xl border border-[#d7f0ea] bg-white p-5 shadow-sm">
            <div className="text-sm font-medium text-slate-500">표시 행 수</div>
            <div className="mt-2 text-2xl font-bold text-slate-950">{formatNumber(totalCount)}</div>
          </div>
          <div className="rounded-3xl border border-[#d7f0ea] bg-white p-5 shadow-sm">
            <div className="text-sm font-medium text-slate-500">평균 위험 점수</div>
            <div className="mt-2 text-2xl font-bold text-slate-950">{avgRisk.toFixed(1)}</div>
          </div>
          <div className="rounded-3xl border border-[#d7f0ea] bg-white p-5 shadow-sm">
            <div className="text-sm font-medium text-slate-500">높은 위험 이상</div>
            <div className="mt-2 text-2xl font-bold text-slate-950">{formatNumber(criticalCount + highCount)}</div>
          </div>
          <div className="rounded-3xl border border-[#d7f0ea] bg-white p-5 shadow-sm">
            <div className="text-sm font-medium text-slate-500">낮은 위험</div>
            <div className="mt-2 text-2xl font-bold text-slate-950">{formatNumber(lowCount)}</div>
          </div>
        </section>

        <section className="rounded-[28px] border border-[#d7f0ea] bg-white p-5 shadow-sm">
          <form method="get" className="grid gap-4 xl:grid-cols-[1fr_1fr_1fr_1fr_1fr_auto_auto]">
            <div className="space-y-2">
              <label htmlFor="region" className="text-sm font-semibold text-slate-700">
                지역
              </label>
              <select
                id="region"
                name="region"
                defaultValue={region}
                className="h-12 w-full rounded-2xl border border-[#bfe9df] bg-white px-4 text-sm font-medium text-slate-800 outline-none transition focus:border-[#0f766e]"
              >
                {REGION_OPTIONS.map((item) => (
                  <option key={item.code} value={item.code}>
                    {item.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label htmlFor="category" className="text-sm font-semibold text-slate-700">
                카테고리
              </label>
              <select
                id="category"
                name="category"
                defaultValue={category}
                className="h-12 w-full rounded-2xl border border-[#bfe9df] bg-white px-4 text-sm font-medium text-slate-800 outline-none transition focus:border-[#0f766e]"
              >
                {categoryOptions.map((item) => (
                  <option key={item.code} value={item.code}>
                    {item.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label htmlFor="grade" className="text-sm font-semibold text-slate-700">
                위험 등급
              </label>
              <select
                id="grade"
                name="grade"
                defaultValue={grade}
                className="h-12 w-full rounded-2xl border border-[#bfe9df] bg-white px-4 text-sm font-medium text-slate-800 outline-none transition focus:border-[#0f766e]"
              >
                <option value="all">전체 등급</option>
                <option value="critical">치명적</option>
                <option value="high">높음</option>
                <option value="medium">중간</option>
                <option value="low">낮음</option>
              </select>
            </div>

            <div className="space-y-2">
              <label htmlFor="sort" className="text-sm font-semibold text-slate-700">
                정렬
              </label>
              <select
                id="sort"
                name="sort"
                defaultValue={sort}
                className="h-12 w-full rounded-2xl border border-[#bfe9df] bg-white px-4 text-sm font-medium text-slate-800 outline-none transition focus:border-[#0f766e]"
              >
                <option value="risk_desc">위험 점수 높은 순</option>
                <option value="signal_desc">신호 수 많은 순</option>
                <option value="business_desc">사업장 수 많은 순</option>
                <option value="net_change_asc">30일 순변화 낮은 순</option>
              </select>
            </div>

            <div className="space-y-2">
              <label htmlFor="q" className="text-sm font-semibold text-slate-700">
                검색
              </label>
              <input
                id="q"
                name="q"
                defaultValue={q}
                placeholder="예: 서울, 제주, 카페, 교육"
                className="h-12 w-full rounded-2xl border border-[#bfe9df] bg-white px-4 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[#0f766e]"
              />
            </div>

            <div className="flex items-end gap-2">
              <button
                type="submit"
                className="h-12 rounded-2xl bg-[#0f766e] px-5 text-sm font-bold text-white transition hover:opacity-90"
              >
                적용
              </button>
            </div>

            <div className="flex items-end gap-2">
              <Link
                href="/rankings"
                className="inline-flex h-12 items-center rounded-2xl border border-[#bfe9df] px-5 text-sm font-bold text-slate-700 transition hover:bg-[#f4fffc]"
              >
                초기화
              </Link>
            </div>
          </form>

          <div className="mt-4 flex flex-wrap gap-2">
            {REGION_OPTIONS.map((item) => (
              <Link
                key={item.code}
                href={buildHref({ region: item.code, page: 1 }, current)}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                  region === item.code
                    ? "bg-[#0f766e] text-white"
                    : "bg-[#f4fffc] text-slate-700 ring-1 ring-[#d7f0ea] hover:bg-[#ecfdf8]"
                }`}
              >
                {item.name}
              </Link>
            ))}
          </div>
        </section>

        <section className="rounded-[28px] border border-[#d7f0ea] bg-white p-5 shadow-sm">
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-950">전국 기준 업종 랭킹</h2>
              <p className="mt-1 text-sm text-slate-500">
                사업장 수, 위험 신호 수, 최근 30일 순변화를 합쳐 임시 위험 점수로 정렬합니다.
              </p>
            </div>
            <div className="text-sm text-slate-500">
              {safePage} / {totalPages} 페이지 · 총 {formatNumber(totalCount)}건
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full border-separate border-spacing-0">
              <thead>
                <tr className="bg-[#fbfffe] text-left text-sm text-slate-500">
                  <th className="border-b border-[#dff3ee] px-3 py-3">순위</th>
                  <th className="border-b border-[#dff3ee] px-3 py-3">지역</th>
                  <th className="border-b border-[#dff3ee] px-3 py-3">카테고리</th>
                  <th className="border-b border-[#dff3ee] px-3 py-3">위험 점수</th>
                  <th className="border-b border-[#dff3ee] px-3 py-3">등급</th>
                  <th className="border-b border-[#dff3ee] px-3 py-3">사업장 수</th>
                  <th className="border-b border-[#dff3ee] px-3 py-3">시그널 수</th>
                  <th className="border-b border-[#dff3ee] px-3 py-3">30일 순변화</th>
                  <th className="border-b border-[#dff3ee] px-3 py-3">상세</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={9}
                      className="px-4 py-16 text-center text-sm text-slate-500"
                    >
                      표시할 랭킹 데이터가 없습니다.
                    </td>
                  </tr>
                ) : (
                  pageRows.map((row, index) => (
                    <tr key={`${row.regionCode}-${row.categoryCode}-${index}`} className="text-sm">
                      <td className="border-b border-[#eef7f3] px-3 py-4 font-bold text-slate-900">
                        {startIndex + index + 1}
                      </td>
                      <td className="border-b border-[#eef7f3] px-3 py-4">
                        <div className="font-semibold text-slate-900">
                          {nationwideMode ? getRegionName(region) : row.regionName}
                        </div>
                        <div className="text-xs text-slate-500">
                          {nationwideMode ? region : row.regionCode}
                        </div>
                      </td>
                      <td className="border-b border-[#eef7f3] px-3 py-4">
                        <div className="font-semibold text-slate-900">{row.categoryName}</div>
                        <div className="text-xs text-slate-500">{row.categoryCode}</div>
                      </td>
                      <td className="border-b border-[#eef7f3] px-3 py-4 font-bold text-slate-950">
                        {row.riskScore.toFixed(1)}
                      </td>
                      <td className="border-b border-[#eef7f3] px-3 py-4">
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${gradeTone(row.riskGrade)}`}>
                          {gradeLabel(row.riskGrade)}
                        </span>
                      </td>
                      <td className="border-b border-[#eef7f3] px-3 py-4 text-slate-700">
                        {formatNumber(row.businessCount)}
                      </td>
                      <td className="border-b border-[#eef7f3] px-3 py-4 text-slate-700">
                        {formatNumber(row.signalCount)}
                      </td>
                      <td className="border-b border-[#eef7f3] px-3 py-4 text-slate-700">
                        {formatNumber(row.netChange30d)}
                      </td>
                      <td className="border-b border-[#eef7f3] px-3 py-4">
                        <Link
                          href={`/regions/${encodeURIComponent(
                            nationwideMode ? region : row.regionCode
                          )}/${encodeURIComponent(row.categoryCode)}`}
                          className="inline-flex rounded-2xl border border-[#bfe9df] px-4 py-2 text-xs font-bold text-slate-700 transition hover:bg-[#f4fffc]"
                        >
                          상세 보기
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
            <div className="text-sm text-slate-500">
              현재 페이지 {safePage} · 총 {totalPages} 페이지
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                href={buildHref({ page: Math.max(1, safePage - 1) }, current)}
                className={`rounded-2xl px-4 py-2 text-sm font-semibold ${
                  safePage <= 1
                    ? "pointer-events-none bg-slate-100 text-slate-400"
                    : "border border-[#bfe9df] text-slate-700 hover:bg-[#f4fffc]"
                }`}
              >
                이전
              </Link>
              <Link
                href={buildHref({ page: Math.min(totalPages, safePage + 1) }, current)}
                className={`rounded-2xl px-4 py-2 text-sm font-semibold ${
                  safePage >= totalPages
                    ? "pointer-events-none bg-slate-100 text-slate-400"
                    : "border border-[#bfe9df] text-slate-700 hover:bg-[#f4fffc]"
                }`}
              >
                다음
              </Link>
            </div>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-3xl border border-[#d7f0ea] bg-white p-5 shadow-sm">
            <div className="text-sm font-medium text-slate-500">치명적</div>
            <div className="mt-2 text-2xl font-bold text-slate-950">{formatNumber(criticalCount)}</div>
          </div>
          <div className="rounded-3xl border border-[#d7f0ea] bg-white p-5 shadow-sm">
            <div className="text-sm font-medium text-slate-500">높음</div>
            <div className="mt-2 text-2xl font-bold text-slate-950">{formatNumber(highCount)}</div>
          </div>
          <div className="rounded-3xl border border-[#d7f0ea] bg-white p-5 shadow-sm">
            <div className="text-sm font-medium text-slate-500">중간</div>
            <div className="mt-2 text-2xl font-bold text-slate-950">{formatNumber(mediumCount)}</div>
          </div>
          <div className="rounded-3xl border border-[#d7f0ea] bg-white p-5 shadow-sm">
            <div className="text-sm font-medium text-slate-500">낮음</div>
            <div className="mt-2 text-2xl font-bold text-slate-950">{formatNumber(lowCount)}</div>
          </div>
        </section>
      </div>
    </main>
  );
}
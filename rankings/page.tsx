import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

type RankingRow = {
  risk_score_id: number;
  score_date: string;
  region_code: string;
  region_name: string | null;
  category_id: number;
  top_category: string | null;
  mid_category: string | null;
  sub_category: string | null;
  category_name: string | null;
  adjusted_score: number | null;
  risk_grade: string | null;
  sample_size_active: number | null;
  sample_size_cohort: number | null;
  raw_close_accel_rate: number | null;
  raw_net_diff: number | null;
  raw_close_open_ratio: number | null;
  raw_survival_drop: number | null;
  raw_density_index: number | null;
  raw_churn_delta: number | null;
  created_at?: string | null;
};

type SearchParams = {
  grade?: string;
  region?: string;
  category?: string;
  sort?: string;
};

function gradeLabel(grade: string | null) {
  const v = (grade || "").toLowerCase();
  if (v === "high" || grade === "위험") return "위험";
  if (v === "medium" || grade === "주의") return "주의";
  if (v === "low" || grade === "안정") return "안정";
  return grade || "-";
}

function scoreTone(score: number | null) {
  if (score === null) return "bg-slate-100 text-slate-600";
  if (score >= 80) return "bg-red-100 text-red-700";
  if (score >= 60) return "bg-amber-100 text-amber-700";
  return "bg-emerald-100 text-emerald-700";
}

function normalizeGrade(grade: string | null) {
  const v = (grade || "").toLowerCase();
  if (v === "high" || grade === "위험") return "high";
  if (v === "medium" || grade === "주의") return "medium";
  if (v === "low" || grade === "안정") return "low";
  return "";
}

function sortRows(rows: RankingRow[], sort: string | undefined) {
  const copied = [...rows];

  switch (sort) {
    case "net":
      return copied.sort((a, b) => (b.raw_net_diff ?? -999999) - (a.raw_net_diff ?? -999999));
    case "accel":
      return copied.sort(
        (a, b) => (b.raw_close_accel_rate ?? -999999) - (a.raw_close_accel_rate ?? -999999)
      );
    case "survival":
      return copied.sort(
        (a, b) => (b.raw_survival_drop ?? -999999) - (a.raw_survival_drop ?? -999999)
      );
    default:
      return copied.sort(
        (a, b) =>
          (b.adjusted_score ?? -999999) - (a.adjusted_score ?? -999999) ||
          b.risk_score_id - a.risk_score_id
      );
  }
}

function makeHref(params: SearchParams) {
  const qs = new URLSearchParams();

  if (params.grade) qs.set("grade", params.grade);
  if (params.region) qs.set("region", params.region);
  if (params.category) qs.set("category", params.category);
  if (params.sort) qs.set("sort", params.sort);

  const query = qs.toString();
  return query ? `/rankings?${query}` : "/rankings";
}

export default async function RankingsPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const resolved = (await searchParams) || {};
  const selectedGrade = resolved.grade || "";
  const selectedRegion = resolved.region || "";
  const selectedCategory = resolved.category || "";
  const selectedSort = resolved.sort || "score";

  const supabase = await createClient();

  const { data, error } = await supabase.rpc("get_risk_rankings", {
    p_category_id: null,
    p_region_code: null,
    p_limit: 300,
    p_offset: 0,
  });

  const allRows = ((data as RankingRow[] | null) || []).slice(0, 300);

  const regionOptions = Array.from(
    new Map(
      allRows
        .filter((row) => row.region_code)
        .map((row) => [row.region_code, row.region_name || row.region_code])
    ).entries()
  ).map(([code, name]) => ({ code, name }));

  const categoryOptions = Array.from(
    new Map(
      allRows
        .filter((row) => row.category_id)
        .map((row) => [String(row.category_id), row.category_name || String(row.category_id)])
    ).entries()
  ).map(([id, name]) => ({ id, name }));

  const filtered = sortRows(
    allRows.filter((row) => {
      const gradeOk = selectedGrade
        ? normalizeGrade(row.risk_grade) === selectedGrade
        : true;

      const regionOk = selectedRegion ? row.region_code === selectedRegion : true;
      const categoryOk = selectedCategory
        ? String(row.category_id) === selectedCategory
        : true;

      return gradeOk && regionOk && categoryOk;
    }),
    selectedSort
  );

  return (
    <main className="min-h-screen bg-[#f6f4ef] text-slate-900">
      <section className="mx-auto max-w-7xl px-6 py-10">
        <div className="mb-8 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="mb-2 text-sm font-medium text-slate-500">Close Signal</p>
            <h1 className="text-3xl font-bold tracking-tight">위험 랭킹</h1>
            <p className="mt-2 text-sm text-slate-600">
              지역·업종 조합별 위험 점수를 조건별로 필터링해 확인합니다.
            </p>
          </div>

          <Link
            href="/"
            className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-slate-50"
          >
            홈으로
          </Link>
        </div>

        {error && (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            랭킹 데이터를 불러오는 중 오류가 발생했습니다.
          </div>
        )}

        <form method="get" className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div>
              <label className="mb-2 block text-xs font-semibold text-slate-500">등급</label>
              <select
                name="grade"
                defaultValue={selectedGrade}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none ring-0"
              >
                <option value="">전체</option>
                <option value="high">위험</option>
                <option value="medium">주의</option>
                <option value="low">안정</option>
              </select>
            </div>

            <div>
              <label className="mb-2 block text-xs font-semibold text-slate-500">지역</label>
              <select
                name="region"
                defaultValue={selectedRegion}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none ring-0"
              >
                <option value="">전체</option>
                {regionOptions.map((option) => (
                  <option key={option.code} value={option.code}>
                    {option.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-xs font-semibold text-slate-500">업종</label>
              <select
                name="category"
                defaultValue={selectedCategory}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none ring-0"
              >
                <option value="">전체</option>
                {categoryOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-xs font-semibold text-slate-500">정렬</label>
              <select
                name="sort"
                defaultValue={selectedSort}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none ring-0"
              >
                <option value="score">위험 점수</option>
                <option value="net">순감소</option>
                <option value="accel">폐업가속</option>
                <option value="survival">생존하락</option>
              </select>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="submit"
              className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
            >
              적용
            </button>
            <Link
              href="/rankings"
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-slate-50"
            >
              초기화
            </Link>
          </div>
        </form>

        <div className="mb-4 flex flex-wrap gap-2">
          <Link
            href={makeHref({ ...resolved, grade: "high" })}
            className="rounded-full bg-red-100 px-3 py-1.5 text-sm font-semibold text-red-700"
          >
            위험
          </Link>
          <Link
            href={makeHref({ ...resolved, grade: "medium" })}
            className="rounded-full bg-amber-100 px-3 py-1.5 text-sm font-semibold text-amber-700"
          >
            주의
          </Link>
          <Link
            href={makeHref({ ...resolved, grade: "low" })}
            className="rounded-full bg-emerald-100 px-3 py-1.5 text-sm font-semibold text-emerald-700"
          >
            안정
          </Link>
          <Link
            href={makeHref({ ...resolved, sort: "score" })}
            className="rounded-full bg-slate-100 px-3 py-1.5 text-sm font-semibold text-slate-700"
          >
            점수순
          </Link>
          <Link
            href={makeHref({ ...resolved, sort: "net" })}
            className="rounded-full bg-slate-100 px-3 py-1.5 text-sm font-semibold text-slate-700"
          >
            순감소순
          </Link>
          <Link
            href={makeHref({ ...resolved, sort: "accel" })}
            className="rounded-full bg-slate-100 px-3 py-1.5 text-sm font-semibold text-slate-700"
          >
            폐업가속순
          </Link>
        </div>

        <div className="mb-4 text-sm text-slate-500">
          총 <span className="font-semibold text-slate-900">{filtered.length}</span>건
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">순위</th>
                  <th className="px-4 py-3 text-left font-semibold">기준일</th>
                  <th className="px-4 py-3 text-left font-semibold">지역</th>
                  <th className="px-4 py-3 text-left font-semibold">업종</th>
                  <th className="px-4 py-3 text-left font-semibold">점수</th>
                  <th className="px-4 py-3 text-left font-semibold">등급</th>
                  <th className="px-4 py-3 text-left font-semibold">순감소</th>
                  <th className="px-4 py-3 text-left font-semibold">폐업가속</th>
                  <th className="px-4 py-3 text-left font-semibold">생존하락</th>
                  <th className="px-4 py-3 text-left font-semibold">상세</th>
                </tr>
              </thead>

              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="px-4 py-10 text-center text-slate-500">
                      조건에 맞는 데이터가 없습니다.
                    </td>
                  </tr>
                ) : (
                  filtered.map((row, index) => (
                    <tr key={row.risk_score_id} className="border-t border-slate-100">
                      <td className="px-4 py-3 font-semibold">{index + 1}</td>
                      <td className="px-4 py-3">{row.score_date}</td>
                      <td className="px-4 py-3">{row.region_name || row.region_code}</td>
                      <td className="px-4 py-3">{row.category_name || "-"}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${scoreTone(
                            row.adjusted_score
                          )}`}
                        >
                          {row.adjusted_score ?? "-"}
                        </span>
                      </td>
                      <td className="px-4 py-3">{gradeLabel(row.risk_grade)}</td>
                      <td className="px-4 py-3">{row.raw_net_diff ?? "-"}</td>
                      <td className="px-4 py-3">{row.raw_close_accel_rate ?? "-"}</td>
                      <td className="px-4 py-3">{row.raw_survival_drop ?? "-"}</td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/regions/${row.region_code}/${row.category_id}`}
                          className="font-semibold text-slate-900 underline underline-offset-4"
                        >
                          보기
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </main>
  );
}
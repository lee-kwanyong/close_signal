"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { buildCommunityComposeHref } from "@/app/community/write-link";
import { buildMonitorPrefillHref } from "@/lib/monitors/prefill-link";

type ProviderItem = {
  name: string;
  category?: string | null;
  address?: string | null;
  roadAddress?: string | null;
  phone?: string | null;
  url?: string | null;
};

type ProviderResult = {
  ok: boolean;
  count?: number | null;
  items: ProviderItem[];
  error?: string | null;
};

type MarketCheckResult = {
  query: string;
  kakao?: ProviderResult;
  naver?: ProviderResult;
};

type MarketCheckApiResponse = {
  ok: boolean;
  error?: string;
  result?: MarketCheckResult;
};

function safeCount(value?: number | null) {
  return Number.isFinite(Number(value)) ? Number(value) : 0;
}

function getProviderTone(provider: "kakao" | "naver") {
  if (provider === "kakao") {
    return {
      badge: "border-sky-200 bg-sky-50 text-sky-700",
      count: "border-sky-200 bg-sky-50 text-sky-800",
      panel: "border-sky-100 bg-sky-50",
      label: "text-slate-950",
      subtle: "text-slate-600",
      chip: "border-sky-200 bg-sky-50 text-sky-700",
    };
  }

  return {
    badge: "border-blue-200 bg-blue-50 text-blue-700",
    count: "border-blue-200 bg-blue-50 text-blue-800",
    panel: "border-blue-100 bg-blue-50",
    label: "text-slate-950",
    subtle: "text-slate-600",
    chip: "border-blue-200 bg-blue-50 text-blue-700",
  };
}

function getProviderLabel(provider: "kakao" | "naver") {
  return provider === "kakao" ? "Kakao" : "Naver";
}

function totalUniqueNames(result?: MarketCheckResult | null) {
  if (!result) return 0;

  const names = new Set<string>();

  for (const item of result.kakao?.items ?? []) {
    if (item.name?.trim()) names.add(item.name.trim());
  }
  for (const item of result.naver?.items ?? []) {
    if (item.name?.trim()) names.add(item.name.trim());
  }

  return names.size;
}

function totalPhones(result?: MarketCheckResult | null) {
  if (!result) return 0;

  let count = 0;
  for (const item of result.kakao?.items ?? []) {
    if (item.phone && item.phone !== "-") count += 1;
  }
  for (const item of result.naver?.items ?? []) {
    if (item.phone && item.phone !== "-") count += 1;
  }
  return count;
}

function totalRoadAddresses(result?: MarketCheckResult | null) {
  if (!result) return 0;

  let count = 0;
  for (const item of result.kakao?.items ?? []) {
    if (item.roadAddress && item.roadAddress !== "-") count += 1;
  }
  for (const item of result.naver?.items ?? []) {
    if (item.roadAddress && item.roadAddress !== "-") count += 1;
  }
  return count;
}

async function parseMarketResponse(res: Response): Promise<MarketCheckApiResponse> {
  const contentType = res.headers.get("content-type") || "";
  const text = await res.text();

  if (!contentType.includes("application/json")) {
    throw new Error(text || "서버가 JSON 응답을 반환하지 않았습니다.");
  }

  try {
    return JSON.parse(text) as MarketCheckApiResponse;
  } catch {
    throw new Error("서버 응답 JSON 파싱에 실패했습니다.");
  }
}

function SummaryCard({
  label,
  value,
  description,
  tone = "default",
}: {
  label: string;
  value: string;
  description: string;
  tone?: "default" | "info" | "warning" | "success";
}) {
  const toneClass =
    tone === "warning"
      ? "border-sky-200 bg-sky-50"
      : tone === "success"
        ? "border-blue-200 bg-blue-50"
        : tone === "info"
          ? "border-sky-200 bg-sky-50"
          : "border-sky-200 bg-white";

  return (
    <div className={`rounded-[26px] border p-5 ${toneClass}`}>
      <p className="text-sm font-semibold text-slate-700">{label}</p>
      <div className="mt-3 text-2xl font-black tracking-[-0.04em] text-slate-950">{value}</div>
      <p className="mt-2 text-xs leading-6 text-slate-600">{description}</p>
    </div>
  );
}

export default function MarketCheckPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const initialQuery = searchParams.get("query") || "";

  const [query, setQuery] = useState(initialQuery);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<MarketCheckResult | null>(null);

  const effectiveQuery = useMemo(() => result?.query || query, [result, query]);

  async function runSearch(nextQuery: string) {
    const trimmed = nextQuery.trim();

    if (!trimmed) {
      setError("검색어를 입력해주세요.");
      setResult(null);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/market-check", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        cache: "no-store",
        body: JSON.stringify({
          query: trimmed,
        }),
      });

      const json = await parseMarketResponse(res);

      if (!res.ok || !json?.ok || !json.result) {
        throw new Error(json?.error || "외부 검증 조회에 실패했습니다.");
      }

      setResult(json.result);
      router.replace(`/market-check?query=${encodeURIComponent(json.result.query || trimmed)}`);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "외부 검증 조회 중 오류가 발생했습니다.",
      );
      setResult(null);
    } finally {
      setLoading(false);
    }
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    await runSearch(query);
  }

  useEffect(() => {
    if (!initialQuery.trim()) return;
    void runSearch(initialQuery);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const communityHref = buildCommunityComposeHref({
    type: "story",
    externalQuery: effectiveQuery,
    title: effectiveQuery ? `[외부 검증] ${effectiveQuery}` : "",
    content: effectiveQuery
      ? `카카오/네이버 외부 검증 결과 정리: ${effectiveQuery}`
      : "",
  });

  const monitorSummaryHref = buildMonitorPrefillHref({
    from: "market-check",
    query: effectiveQuery,
    trendKeywords: effectiveQuery ? [effectiveQuery] : [],
    stage: "caution",
    reason: "external_validation",
    note: effectiveQuery ? `외부 검증 검색어: ${effectiveQuery}` : "",
  });

  return (
    <main className="mx-auto max-w-7xl bg-white px-4 pb-14 pt-6 sm:px-6">
      <div className="space-y-6">
        <section className="overflow-hidden rounded-[34px] border border-sky-100 bg-sky-50 shadow-[0_18px_54px_rgba(14,165,233,0.08)]">
          <div className="bg-[linear-gradient(135deg,#eff6ff_0%,#f5f9ff_46%,#ffffff_100%)] px-6 py-6 sm:px-8">
            <div className="grid gap-8 xl:grid-cols-[1.08fr_0.92fr]">
              <div className="min-w-0">
                <div className="inline-flex items-center rounded-full border border-sky-200 bg-white px-4 py-1.5 text-[11px] font-black uppercase tracking-[0.18em] text-sky-700">
                  Market Check
                </div>

                <h1 className="mt-5 text-[32px] font-black tracking-[-0.05em] text-slate-950 sm:text-[46px]">
                  카카오와 네이버 결과를
                  <br />
                  한 화면에서 검증합니다
                </h1>

                <p className="mt-5 max-w-3xl text-sm leading-8 text-slate-600 sm:text-base">
                  상호명, 지역, 업종 조합을 검색해 외부 노출 흔적을 빠르게 확인하고 그
                  결과를 그대로 모니터 인테이크나 커뮤니티 메모로 넘길 수 있습니다.
                </p>

                <div className="mt-6 grid gap-3 md:grid-cols-3">
                  <div className="rounded-[24px] border border-sky-200 bg-white p-4">
                    <div className="text-base font-black tracking-[-0.02em] text-slate-950">
                      1. 검색
                    </div>
                    <p className="mt-2 text-sm leading-7 text-slate-600">
                      상호명이나 지역·업종 조합으로 외부 노출 흔적을 찾습니다.
                    </p>
                  </div>
                  <div className="rounded-[24px] border border-sky-200 bg-white p-4">
                    <div className="text-base font-black tracking-[-0.02em] text-slate-950">
                      2. 비교
                    </div>
                    <p className="mt-2 text-sm leading-7 text-slate-600">
                      카카오와 네이버 양쪽 결과를 함께 보고 근거를 확인합니다.
                    </p>
                  </div>
                  <div className="rounded-[24px] border border-sky-200 bg-white p-4">
                    <div className="text-base font-black tracking-[-0.02em] text-slate-950">
                      3. 인테이크
                    </div>
                    <p className="mt-2 text-sm leading-7 text-slate-600">
                      확인된 후보를 모니터 등록이나 커뮤니티 기록으로 바로 넘깁니다.
                    </p>
                  </div>
                </div>
              </div>

              <form
                onSubmit={onSubmit}
                className="rounded-[30px] border border-sky-200 bg-white p-6 shadow-[0_14px_36px_rgba(14,165,233,0.08)]"
              >
                <div className="text-[11px] font-black uppercase tracking-[0.18em] text-sky-700">
                  Input
                </div>
                <h2 className="mt-2 text-2xl font-black tracking-[-0.04em] text-slate-950">
                  외부 검증 검색
                </h2>
                <p className="mt-2 text-sm leading-7 text-slate-600">
                  상호, 지역, 업종 조합으로 검색합니다.
                </p>

                <div className="mt-6">
                  <label
                    htmlFor="query"
                    className="mb-2 block text-sm font-semibold text-slate-700"
                  >
                    검색어
                  </label>
                  <input
                    id="query"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="예: 성수동 카페, 강남 삼겹살, 해운대 디저트"
                    className="h-12 w-full rounded-2xl border border-sky-200 bg-white px-4 text-sm text-slate-900 outline-none placeholder:text-slate-400 transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
                  />
                </div>

                {error ? (
                  <div className="mt-4 rounded-[20px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm leading-6 text-rose-700">
                    {error}
                  </div>
                ) : null}

                <div className="mt-5 flex flex-wrap gap-3">
                  <button
                    type="submit"
                    disabled={loading}
                    className="inline-flex h-12 items-center justify-center rounded-2xl border border-sky-600 bg-sky-600 px-5 text-sm font-semibold text-white transition hover:border-sky-700 hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {loading ? "외부 검증 중..." : "외부 검증 실행"}
                  </button>

                  <Link
                    href="/business-check"
                    className="inline-flex h-12 items-center justify-center rounded-2xl border border-sky-200 bg-white px-5 text-sm font-semibold text-slate-700 transition hover:border-sky-300 hover:bg-sky-50 hover:text-sky-700"
                  >
                    사업자 조회 보기
                  </Link>
                </div>

                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                  <SummaryCard
                    label="현재 검색어"
                    value={effectiveQuery || "-"}
                    description="검색 실행 또는 URL 파라미터 기준"
                    tone="info"
                  />
                  <SummaryCard
                    label="결과 상태"
                    value={result ? "조회 완료" : "대기"}
                    description="조회 후 양쪽 provider 결과를 비교합니다."
                  />
                </div>
              </form>
            </div>
          </div>
        </section>

        {result ? (
          <>
            <section className="rounded-[32px] border border-sky-100 bg-sky-50 p-6 shadow-[0_14px_38px_rgba(14,165,233,0.08)] sm:p-7">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="text-[11px] font-black uppercase tracking-[0.18em] text-sky-700">
                    External Validation Summary
                  </div>
                  <h2 className="mt-2 text-2xl font-black tracking-[-0.04em] text-slate-950">
                    자동 외부 검증 요약
                  </h2>
                  <p className="mt-2 text-sm leading-7 text-slate-600">
                    현재 검색어 기준으로 카카오와 네이버 결과를 동시에 읽어왔습니다.
                  </p>
                </div>

                <Link
                  href={`/market-check?query=${encodeURIComponent(effectiveQuery)}`}
                  className="inline-flex h-11 items-center justify-center rounded-2xl border border-sky-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:border-sky-300 hover:bg-sky-50 hover:text-sky-700"
                >
                  현재 검색 유지
                </Link>
              </div>

              <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
                <SummaryCard
                  label="자동 검색어"
                  value={effectiveQuery || "-"}
                  description="현재 외부 검증 기준 검색어"
                  tone="info"
                />
                <SummaryCard
                  label="카카오"
                  value={`${safeCount(result.kakao?.count)}`}
                  description="카카오 결과 수"
                  tone="warning"
                />
                <SummaryCard
                  label="네이버"
                  value={`${safeCount(result.naver?.count)}`}
                  description="네이버 결과 수"
                  tone="success"
                />
                <SummaryCard
                  label="고유 상호 수"
                  value={`${totalUniqueNames(result)}`}
                  description="중복 제거 기준 고유 상호"
                />
                <SummaryCard
                  label="전화/도로명 포함"
                  value={`${totalPhones(result)} / ${totalRoadAddresses(result)}`}
                  description="연락처와 도로명 주소 포함 수"
                />
              </div>

              <div className="mt-5 rounded-[28px] border border-sky-200 bg-white p-5">
                <div className="text-sm font-semibold text-slate-700">다음 연결</div>
                <div className="mt-4 flex flex-wrap gap-3">
                  <Link
                    href={monitorSummaryHref}
                    className="inline-flex h-11 items-center justify-center rounded-2xl border border-sky-600 bg-sky-600 px-4 text-sm font-semibold text-white transition hover:border-sky-700 hover:bg-sky-700"
                  >
                    이 검색어로 모니터 인테이크
                  </Link>
                  <Link
                    href="/business-check"
                    className="inline-flex h-11 items-center justify-center rounded-2xl border border-sky-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:border-sky-300 hover:bg-sky-50 hover:text-sky-700"
                  >
                    사업자 조회 보기
                  </Link>
                  <Link
                    href={communityHref}
                    className="inline-flex h-11 items-center justify-center rounded-2xl border border-sky-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:border-sky-300 hover:bg-sky-50 hover:text-sky-700"
                  >
                    커뮤니티 글쓰기 연결
                  </Link>
                </div>
              </div>
            </section>

            <div className="grid gap-6 xl:grid-cols-2">
              <ProviderColumn provider="kakao" result={result.kakao} query={effectiveQuery} />
              <ProviderColumn provider="naver" result={result.naver} query={effectiveQuery} />
            </div>
          </>
        ) : (
          <section className="rounded-[32px] border border-dashed border-sky-200 bg-sky-50 px-6 py-14 text-center">
            <div className="text-xl font-black tracking-[-0.03em] text-slate-950">
              아직 검색 결과가 없습니다
            </div>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              위에서 검색어를 입력해 외부 검증을 시작해 주세요.
            </p>
          </section>
        )}
      </div>
    </main>
  );
}

function ProviderColumn({
  provider,
  result,
  query,
}: {
  provider: "kakao" | "naver";
  result?: ProviderResult;
  query: string;
}) {
  const tone = getProviderTone(provider);
  const providerLabel = getProviderLabel(provider);
  const count = safeCount(result?.count);

  return (
    <section
      className={`rounded-[32px] border p-6 shadow-[0_14px_38px_rgba(14,165,233,0.08)] sm:p-7 ${tone.panel}`}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className={`rounded-full border px-3 py-1 text-sm font-semibold ${tone.badge}`}>
              {providerLabel}
            </span>
            <span className="text-sm font-semibold text-slate-500">Provider</span>
          </div>

          <h3 className={`mt-3 text-2xl font-black tracking-[-0.04em] ${tone.label}`}>
            {providerLabel} 결과
          </h3>
          <p className={`mt-2 text-sm leading-7 ${tone.subtle}`}>
            검색어 "{query}" 기준 외부 노출 흔적을 정리했습니다.
          </p>
        </div>

        <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${tone.count}`}>
          {result?.ok ? `${count.toLocaleString("ko-KR")}건` : "확인 필요"}
        </span>
      </div>

      {!result?.ok ? (
        <div className="mt-5 rounded-[22px] border border-rose-200 bg-rose-50 px-4 py-4 text-sm leading-7 text-rose-700">
          {result?.error || `${providerLabel} 결과를 불러오지 못했습니다.`}
        </div>
      ) : !result.items.length ? (
        <div className="mt-5 rounded-[22px] border border-dashed border-sky-200 bg-white px-4 py-12 text-sm text-slate-500">
          검색 결과가 없습니다.
        </div>
      ) : (
        <div className="mt-5 space-y-3">
          {result.items.map((item, index) => (
            <ProviderItemRow
              key={`${provider}-${item.name}-${index}`}
              provider={provider}
              item={item}
              query={query}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function ProviderItemRow({
  provider,
  item,
  query,
}: {
  provider: "kakao" | "naver";
  item: ProviderItem;
  query: string;
}) {
  const tone = getProviderTone(provider);
  const providerLabel = getProviderLabel(provider);
  const displayAddress = item.roadAddress || item.address || "-";

  const monitorHref = buildMonitorPrefillHref({
    from: "market-check",
    businessName: item.name,
    address: displayAddress,
    categoryName: item.category || "",
    query,
    trendKeywords: [query, item.name, item.category || "", displayAddress],
    stage: "caution",
    reason: "external_validation_match",
    note: [
      `provider: ${providerLabel}`,
      item.phone ? `phone: ${item.phone}` : "",
      item.url ? `url: ${item.url}` : "",
    ]
      .filter(Boolean)
      .join("\n"),
  });

  return (
    <div className="rounded-[24px] border border-sky-200 bg-white p-4 transition hover:border-sky-300 hover:bg-sky-50/40">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          {item.url ? (
            <a
              href={item.url}
              target="_blank"
              rel="noreferrer"
              className="block truncate text-base font-black tracking-[-0.02em] text-slate-950 hover:text-sky-700"
            >
              {item.name || "-"}
            </a>
          ) : (
            <div className="truncate text-base font-black tracking-[-0.02em] text-slate-950">
              {item.name || "-"}
            </div>
          )}

          <p className="mt-2 text-sm leading-6 text-slate-600">{displayAddress}</p>
        </div>

        <span className={`shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${tone.badge}`}>
          {providerLabel}
        </span>
      </div>

      <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
        {item.category ? (
          <span className={`rounded-full border px-2.5 py-1 ${tone.chip}`}>
            {item.category}
          </span>
        ) : null}
        {item.phone && item.phone !== "-" ? (
          <span className="rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-slate-600">
            {item.phone}
          </span>
        ) : null}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Link
          href={monitorHref}
          className="inline-flex h-10 items-center justify-center rounded-xl border border-sky-600 bg-sky-600 px-3 text-xs font-semibold text-white transition hover:border-sky-700 hover:bg-sky-700"
        >
          모니터 등록
        </Link>

        {item.url ? (
          <a
            href={item.url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-10 items-center justify-center rounded-xl border border-sky-200 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:bg-sky-50"
          >
            원문 열기
          </a>
        ) : null}
      </div>
    </div>
  );
}
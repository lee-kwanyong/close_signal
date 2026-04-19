"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { buildCommunityComposeHref } from "@/app/community/write-link";
import { buildMonitorPrefillHref } from "@/lib/monitors/prefill-link";

type CheckResult = {
  businessNumber: string;
  statusCode: string;
  statusLabel: string;
  businessTypeLabel?: string | null;
  rawStatus?: string | null;
  taxType?: string | null;
  taxTypeCode?: string | null;
  closureDate?: string | null;
  simpleTaxpayerYn?: string | null;
  taxTypeChangedAt?: string | null;
  invoiceApplyDate?: string | null;
  raw?: unknown;
};

type CheckApiResponse = {
  ok: boolean;
  error?: string;
  result?: CheckResult;
  input?: string;
};

function onlyDigits(value: string) {
  return value.replace(/\D/g, "").slice(0, 10);
}

function formatBusinessNumber(value: string) {
  const digits = onlyDigits(value);

  if (digits.length <= 3) return digits;
  if (digits.length <= 5) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 5)}-${digits.slice(5)}`;
}

function normalizeText(value?: string | null) {
  return String(value || "").replace(/\s/g, "").trim();
}

function getDisplayBusinessType(result?: CheckResult | null) {
  return result?.businessTypeLabel || result?.statusLabel || "확인필요";
}

function getNormalizedRawStatus(result?: CheckResult | null) {
  if (!result) return "-";

  const rawStatus = normalizeText(result.rawStatus);
  const taxType = normalizeText(result.taxType);
  const simpleYn = normalizeText(result.simpleTaxpayerYn).toUpperCase();

  if (rawStatus.includes("폐업")) return "폐업";
  if (rawStatus.includes("휴업")) return "휴업사업자";
  if (taxType.includes("법인")) return "법인사업자";
  if (taxType.includes("간이") || simpleYn === "Y") return "간이사업자";
  if (taxType.includes("일반")) return "일반사업자";
  if (taxType.includes("면세")) return "면세사업자";
  if (rawStatus.includes("계속")) return "일반사업자";

  return result.rawStatus || "-";
}

function getDisplayTone(label: string) {
  if (label === "폐업" || label === "폐업사업자") {
    return {
      badge: "border-rose-200 bg-rose-50 text-rose-700",
      panel: "border-rose-200 bg-rose-50",
      title: "text-rose-950",
      summary:
        "현재 폐업 상태로 확인되었습니다. 외부 검증과 현장 메모를 함께 남기고 마지막 기회 대상인지 검토하는 흐름이 적합합니다.",
    };
  }

  if (label === "휴업사업자") {
    return {
      badge: "border-amber-200 bg-amber-50 text-amber-700",
      panel: "border-amber-200 bg-amber-50",
      title: "text-amber-950",
      summary:
        "휴업 상태로 확인되었습니다. 일시 중단인지 실제 종료 가능성이 큰지 외부 검증과 함께 판단하는 흐름이 적합합니다.",
    };
  }

  return {
    badge: "border-sky-200 bg-sky-50 text-sky-700",
    panel: "border-sky-200 bg-sky-50",
    title: "text-sky-950",
    summary:
      "현재 사업 상태는 계속 사업 기준으로 보입니다. 이후 외부 검증과 모니터 등록으로 운영 신호를 이어서 점검하면 됩니다.",
  };
}

function recommendedStage(result?: CheckResult | null) {
  const label = getDisplayBusinessType(result);

  if (label === "폐업" || label === "폐업사업자") return "urgent";
  if (label === "휴업사업자") return "caution";
  return "observe";
}

function statusGuideLabel(result?: CheckResult | null) {
  const label = getDisplayBusinessType(result);

  if (label === "폐업" || label === "폐업사업자") return "운영 종료 가능성 높음";
  if (label === "휴업사업자") return "재개 여부 확인 필요";
  return "계속 사업 확인";
}

const useCases = [
  {
    title: "사전 검증",
    body: "상호를 조사하기 전에 사업자 상태를 먼저 확인해 잘못된 후보를 줄일 수 있습니다.",
  },
  {
    title: "외부 검증 연결",
    body: "사업 상태를 확인한 뒤 카카오·네이버 노출 흔적을 이어서 보면 판단이 더 명확해집니다.",
  },
  {
    title: "모니터 인테이크",
    body: "사업 상태 확인 결과를 그대로 모니터 등록 메모에 남겨 개입 흐름으로 넘길 수 있습니다.",
  },
];

async function parseResponse(res: Response): Promise<CheckApiResponse> {
  const contentType = res.headers.get("content-type") || "";
  const text = await res.text();

  if (!contentType.includes("application/json")) {
    throw new Error(text || "서버가 JSON 응답을 반환하지 않았습니다.");
  }

  try {
    return JSON.parse(text) as CheckApiResponse;
  } catch {
    throw new Error("서버 응답 JSON 파싱에 실패했습니다.");
  }
}

function InfoCard({
  label,
  value,
  description,
  tone = "default",
}: {
  label: string;
  value: string;
  description: string;
  tone?: "default" | "danger" | "warning" | "info";
}) {
  const toneClass =
    tone === "danger"
      ? "border-rose-200 bg-rose-50"
      : tone === "warning"
        ? "border-amber-200 bg-amber-50"
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

function ResultCell({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[22px] border border-sky-200 bg-white p-4">
      <div className="text-sm text-slate-500">{label}</div>
      <div className="mt-2 break-all text-base font-semibold text-slate-950">{value || "-"}</div>
    </div>
  );
}

export default function BusinessCheckPage() {
  const searchParams = useSearchParams();
  const paramBusinessNumber =
    searchParams.get("businessNumber") || searchParams.get("query") || "";

  const [businessNumber, setBusinessNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<CheckResult | null>(null);

  useEffect(() => {
    const next = onlyDigits(paramBusinessNumber);
    if (!next) return;
    setBusinessNumber((prev) => (prev ? prev : next));
  }, [paramBusinessNumber]);

  const formatted = useMemo(() => formatBusinessNumber(businessNumber), [businessNumber]);

  const displayBusinessType = getDisplayBusinessType(result);
  const normalizedRawStatus = getNormalizedRawStatus(result);
  const displayTone = getDisplayTone(displayBusinessType);

  async function runBusinessCheck() {
    const sanitized = onlyDigits(businessNumber);

    if (sanitized.length !== 10) {
      setError("사업자번호는 숫자 10자리여야 합니다.");
      setResult(null);
      return;
    }

    setLoading(true);
    setError("");
    setResult(null);

    try {
      const res = await fetch("/api/business-check", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        cache: "no-store",
        body: JSON.stringify({
          businessNumber: sanitized,
        }),
      });

      const data = await parseResponse(res);

      if (!res.ok || !data.ok || !data.result) {
        throw new Error(data.error || "사업자 조회에 실패했습니다.");
      }

      setResult(data.result);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "사업자 조회 중 오류가 발생했습니다.",
      );
    } finally {
      setLoading(false);
    }
  }

  const marketCheckHref = result
    ? `/market-check?query=${encodeURIComponent(formatBusinessNumber(result.businessNumber))}`
    : "/market-check";

  const communityHref = result
    ? buildCommunityComposeHref({
        type: "story",
        businessNumber: result.businessNumber,
        businessStatusLabel: displayBusinessType,
        externalQuery: formatBusinessNumber(result.businessNumber),
        title: `[사업자 조회] ${formatBusinessNumber(result.businessNumber)}`,
        content: `${displayBusinessType} / ${normalizedRawStatus}`,
      })
    : "/community/write";

  const monitorHref = result
    ? buildMonitorPrefillHref({
        from: "business-check",
        businessNumber: result.businessNumber,
        query: formatBusinessNumber(result.businessNumber),
        primaryKeyword: formatBusinessNumber(result.businessNumber),
        placeQuery: formatBusinessNumber(result.businessNumber),
        stage: recommendedStage(result),
        reason: "business_status_check",
        score: result.statusCode,
        note: [
          `사업자 조회 결과: ${displayBusinessType}`,
          `원본 상태: ${normalizedRawStatus}`,
          result.taxType ? `과세 유형: ${result.taxType}` : "",
          result.closureDate ? `폐업일자: ${result.closureDate}` : "",
        ]
          .filter(Boolean)
          .join("\n"),
      })
    : "/monitors/new";

  return (
    <main className="mx-auto max-w-7xl bg-white px-4 pb-14 pt-6 sm:px-6">
      <div className="space-y-6">
        <section className="overflow-hidden rounded-[34px] border border-sky-100 bg-sky-50 shadow-[0_18px_54px_rgba(14,165,233,0.08)]">
          <div className="bg-[linear-gradient(135deg,#eff6ff_0%,#f5f9ff_46%,#ffffff_100%)] px-6 py-6 sm:px-8">
            <div className="grid gap-8 xl:grid-cols-[1.05fr_0.95fr]">
              <div className="min-w-0">
                <div className="inline-flex items-center rounded-full border border-sky-200 bg-white px-4 py-1.5 text-[11px] font-black uppercase tracking-[0.18em] text-sky-700">
                  Business Status Check
                </div>

                <h1 className="mt-5 text-[32px] font-black tracking-[-0.05em] text-slate-950 sm:text-[46px]">
                  사업자 상태를 먼저 확인하고
                  <br />
                  다음 검증으로 넘깁니다
                </h1>

                <p className="mt-5 max-w-3xl text-sm leading-8 text-slate-600 sm:text-base">
                  사업자번호 기준으로 현재 상태를 먼저 확인한 뒤, 외부 검증과 모니터
                  인테이크로 바로 이어갈 수 있게 정리한 조회 화면입니다.
                </p>

                <div className="mt-6 grid gap-3 md:grid-cols-3">
                  {useCases.map((item) => (
                    <div
                      key={item.title}
                      className="rounded-[24px] border border-sky-200 bg-white p-4"
                    >
                      <div className="text-base font-black tracking-[-0.02em] text-slate-950">
                        {item.title}
                      </div>
                      <p className="mt-2 text-sm leading-7 text-slate-600">{item.body}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-[30px] border border-sky-200 bg-white p-6 shadow-[0_14px_36px_rgba(14,165,233,0.08)]">
                <div className="text-[11px] font-black uppercase tracking-[0.18em] text-sky-700">
                  Input
                </div>
                <h2 className="mt-2 text-2xl font-black tracking-[-0.04em] text-slate-950">
                  사업자번호 조회
                </h2>
                <p className="mt-2 text-sm leading-7 text-slate-600">
                  숫자 10자리 기준으로 조회합니다.
                </p>

                <div className="mt-6">
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    사업자번호
                  </label>
                  <input
                    value={formatted}
                    onChange={(e) => setBusinessNumber(onlyDigits(e.target.value))}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        void runBusinessCheck();
                      }
                    }}
                    placeholder="123-45-67890"
                    className="h-12 w-full rounded-2xl border border-sky-200 bg-white px-4 text-base text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
                    inputMode="numeric"
                  />
                </div>

                {error ? (
                  <div className="mt-4 rounded-[20px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm leading-6 break-all text-rose-700">
                    {error}
                  </div>
                ) : null}

                <div className="mt-5 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => void runBusinessCheck()}
                    disabled={loading}
                    className="inline-flex h-12 items-center justify-center rounded-2xl border border-sky-600 bg-sky-600 px-5 text-sm font-semibold text-white transition hover:border-sky-700 hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {loading ? "조회 중..." : "사업 상태 조회"}
                  </button>

                  <Link
                    href="/market-check"
                    className="inline-flex h-12 items-center justify-center rounded-2xl border border-sky-200 bg-white px-5 text-sm font-semibold text-slate-700 transition hover:border-sky-300 hover:bg-sky-50 hover:text-sky-700"
                  >
                    외부 검증 보기
                  </Link>
                </div>

                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                  <InfoCard
                    label="입력값"
                    value={formatted || "-"}
                    description="현재 조회하려는 사업자번호"
                    tone="info"
                  />
                  <InfoCard
                    label="가이드"
                    value={result ? statusGuideLabel(result) : "조회 대기"}
                    description="조회 후 상태별 후속 판단 힌트"
                    tone={
                      displayBusinessType === "폐업" || displayBusinessType === "폐업사업자"
                        ? "danger"
                        : displayBusinessType === "휴업사업자"
                          ? "warning"
                          : "default"
                    }
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-[32px] border border-sky-100 bg-sky-50 p-6 shadow-[0_14px_38px_rgba(14,165,233,0.08)] sm:p-7">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="text-[11px] font-black uppercase tracking-[0.18em] text-sky-700">
                Result
              </div>
              <h2 className="mt-2 text-2xl font-black tracking-[-0.04em] text-slate-950">
                조회 결과
              </h2>
              <p className="mt-2 text-sm leading-7 text-slate-600">
                사업 상태를 먼저 확인하고 바로 외부 검증과 모니터 등록으로 이어갈 수 있습니다.
              </p>
            </div>

            {result ? (
              <span
                className={`inline-flex items-center rounded-full border px-3 py-1 text-sm font-semibold ${displayTone.badge}`}
              >
                {displayBusinessType}
              </span>
            ) : null}
          </div>

          {!result ? (
            <div className="mt-6 rounded-[26px] border border-dashed border-sky-200 bg-white px-6 py-14 text-center">
              <div className="text-xl font-black tracking-[-0.03em] text-slate-950">
                아직 조회 결과가 없습니다
              </div>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                위에서 사업자번호를 입력하고 조회를 실행하면 결과가 표시됩니다.
              </p>
            </div>
          ) : (
            <div className="mt-6 space-y-5">
              <div className={`rounded-[28px] border p-6 ${displayTone.panel}`}>
                <div className="text-sm font-semibold text-slate-600">상태 판정</div>
                <div className={`mt-2 text-3xl font-black tracking-[-0.04em] ${displayTone.title}`}>
                  {displayBusinessType}
                </div>
                <p className="mt-3 text-sm leading-7 text-slate-700">{displayTone.summary}</p>
              </div>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                <ResultCell
                  label="사업자번호"
                  value={formatBusinessNumber(result.businessNumber)}
                />
                <ResultCell label="원본 상태값" value={normalizedRawStatus} />
                <ResultCell label="과세 유형" value={result.taxType || "-"} />
                <ResultCell label="과세 유형 코드" value={result.taxTypeCode || "-"} />
                <ResultCell label="폐업일자" value={result.closureDate || "-"} />
                <ResultCell label="간이과세 여부" value={result.simpleTaxpayerYn || "-"} />
                <ResultCell
                  label="과세 유형 변경일"
                  value={result.taxTypeChangedAt || "-"}
                />
                <ResultCell
                  label="세금계산서 적용일"
                  value={result.invoiceApplyDate || "-"}
                />
                <ResultCell label="권장 stage" value={recommendedStage(result)} />
              </div>

              <div className="rounded-[28px] border border-sky-200 bg-white p-5">
                <div className="text-sm font-semibold text-slate-700">다음 연결</div>
                <div className="mt-4 flex flex-wrap gap-3">
                  <Link
                    href={marketCheckHref}
                    className="inline-flex h-11 items-center justify-center rounded-2xl border border-sky-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:border-sky-300 hover:bg-sky-50 hover:text-sky-700"
                  >
                    외부 검증 보기
                  </Link>
                  <Link
                    href={monitorHref}
                    className="inline-flex h-11 items-center justify-center rounded-2xl border border-sky-600 bg-sky-600 px-4 text-sm font-semibold text-white transition hover:border-sky-700 hover:bg-sky-700"
                  >
                    모니터 인테이크
                  </Link>
                  <Link
                    href={communityHref}
                    className="inline-flex h-11 items-center justify-center rounded-2xl border border-sky-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:border-sky-300 hover:bg-sky-50 hover:text-sky-700"
                  >
                    커뮤니티 글쓰기
                  </Link>
                </div>
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
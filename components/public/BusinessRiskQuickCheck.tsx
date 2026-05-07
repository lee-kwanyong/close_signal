"use client";

import { useMemo, useState } from "react";
import type { FormEvent } from "react";

type StoreCandidate = {
  semasStoreId: string;
  storeName: string;
  industryLargeName: string | null;
  industryMiddleName: string | null;
  industrySmallName: string | null;
  sidoName: string | null;
  sigunguName: string | null;
  address: string | null;
  roadAddress: string | null;
  lat: number | null;
  lng: number | null;
};

type QuickCheckResult = {
  businessNumber: string;
  normalizedBusinessNumber: string;
  riskScore: number;
  riskLevel: "stable" | "watch" | "warning" | "danger";
  riskLevelLabel: string;
  headline: string;
  summary: string;
  matchedStore: StoreCandidate | null;
  dataSourceStatus?: {
    status: "matched" | "not_matched" | "db_error";
    errorMessage: string | null;
  };
  marketSignals: {
    regionStoreCount: number;
    regionStoreCountIsCapped?: boolean;
    sameIndustryRegionCount: number;
    sameIndustryRegionCountIsCapped?: boolean;
    hasMatchedStore: boolean;
  };
  reasons: string[];
  recommendedNextStep: string;
};

function onlyDigits(value: string): string {
  return value.replace(/\D/g, "");
}

function formatBusinessNumber(value: string): string {
  const digits = onlyDigits(value).slice(0, 10);

  if (digits.length <= 3) {
    return digits;
  }

  if (digits.length <= 5) {
    return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  }

  return `${digits.slice(0, 3)}-${digits.slice(3, 5)}-${digits.slice(5)}`;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return "1차 위험 신호 확인 중 오류가 발생했습니다.";
}

function getScoreColor(level: QuickCheckResult["riskLevel"]): string {
  if (level === "danger") {
    return "#dc2626";
  }

  if (level === "warning") {
    return "#ea580c";
  }

  if (level === "watch") {
    return "#ca8a04";
  }

  return "#059669";
}

function formatCount(value: number, isCapped?: boolean): string {
  return `${value.toLocaleString("ko-KR")}${isCapped ? "+" : ""}`;
}

export function BusinessRiskQuickCheck() {
  const [businessNumber, setBusinessNumber] = useState("");
  const [storeName, setStoreName] = useState("");
  const [sidoName, setSidoName] = useState("");
  const [sigunguName, setSigunguName] = useState("");

  const [candidates, setCandidates] = useState<StoreCandidate[]>([]);
  const [selectedCandidate, setSelectedCandidate] =
    useState<StoreCandidate | null>(null);

  const [result, setResult] = useState<QuickCheckResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [isSearching, setIsSearching] = useState(false);
  const [isChecking, setIsChecking] = useState(false);

  const normalizedBusinessNumber = useMemo(
    () => onlyDigits(businessNumber),
    [businessNumber]
  );

  const canSearch = storeName.trim().length >= 2 && !isSearching;
  const canCheck = normalizedBusinessNumber.length === 10 && !isChecking;

  async function handleSearch() {
    if (!canSearch) {
      setErrorMessage("상호명을 2글자 이상 입력해주세요.");
      return;
    }

    setIsSearching(true);
    setErrorMessage(null);
    setCandidates([]);
    setSelectedCandidate(null);
    setResult(null);

    try {
      const params = new URLSearchParams({
        q: storeName.trim(),
      });

      if (sidoName.trim()) {
        params.set("sidoName", sidoName.trim());
      }

      if (sigunguName.trim()) {
        params.set("sigunguName", sigunguName.trim());
      }

      const response = await fetch(`/api/public/store-search?${params}`);
      const payload = await response.json();

      if (!response.ok || !payload?.success) {
        throw new Error(
          payload?.error?.message ?? "매장 후보 검색에 실패했습니다."
        );
      }

      setCandidates(payload.data.items ?? []);
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsSearching(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!canCheck) {
      setErrorMessage("사업자등록번호 10자리를 입력해주세요.");
      return;
    }

    setIsChecking(true);
    setErrorMessage(null);
    setResult(null);

    try {
      const response = await fetch("/api/public/risk-check", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          businessNumber: normalizedBusinessNumber,
          semasStoreId: selectedCandidate?.semasStoreId,
          storeName: selectedCandidate?.storeName ?? storeName,
          sidoName: selectedCandidate?.sidoName ?? sidoName,
          sigunguName: selectedCandidate?.sigunguName ?? sigunguName,
        }),
      });

      const payload = await response.json();

      if (!response.ok || !payload?.success) {
        throw new Error(
          payload?.error?.message ?? "1차 위험 신호 확인에 실패했습니다."
        );
      }

      setResult(payload.data as QuickCheckResult);
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsChecking(false);
    }
  }

  return (
    <section className="quick-check-card">
      <div className="quick-check-title-row">
        <div>
          <div className="eyebrow">Free Growth Signal Check</div>
          <h2>사업자번호 1차 체크</h2>
          <p>
            사업자등록번호를 입력하고, 상호명/지역으로 매장 후보를 선택하면
            수집된 상권·업종 데이터를 기준으로 1차 위험 신호를 계산합니다.
          </p>
        </div>
      </div>

      <div className="quick-check-layout">
        <form className="quick-check-form-panel" onSubmit={handleSubmit}>
          <label className="quick-check-label">
            <span>사업자등록번호</span>
            <input
              value={businessNumber}
              inputMode="numeric"
              placeholder="예: 123-45-67890"
              onChange={(event) =>
                setBusinessNumber(formatBusinessNumber(event.target.value))
              }
            />
          </label>

          <div className="quick-check-field-grid">
            <label className="quick-check-label">
              <span>상호명</span>
              <input
                value={storeName}
                placeholder="예: 한옥, 카페, 병원"
                onChange={(event) => setStoreName(event.target.value)}
              />
            </label>

            <label className="quick-check-label">
              <span>시/도</span>
              <input
                value={sidoName}
                placeholder="예: 서울특별시"
                onChange={(event) => setSidoName(event.target.value)}
              />
            </label>

            <label className="quick-check-label">
              <span>시/군/구</span>
              <input
                value={sigunguName}
                placeholder="예: 종로구"
                onChange={(event) => setSigunguName(event.target.value)}
              />
            </label>
          </div>

          <button
            className="btn quick-check-search-button"
            type="button"
            disabled={!canSearch}
            onClick={() => void handleSearch()}
          >
            {isSearching ? "매장 후보 검색 중..." : "매장 후보 검색"}
          </button>

          {candidates.length > 0 ? (
            <div className="quick-check-candidates">
              <strong>매장 후보를 선택해주세요</strong>

              <div className="quick-check-candidate-list">
                {candidates.map((candidate) => {
                  const isSelected =
                    selectedCandidate?.semasStoreId === candidate.semasStoreId;

                  return (
                    <button
                      key={candidate.semasStoreId}
                      type="button"
                      onClick={() => setSelectedCandidate(candidate)}
                      className={
                        isSelected
                          ? "quick-check-candidate selected"
                          : "quick-check-candidate"
                      }
                    >
                      <strong>{candidate.storeName}</strong>

                      <span>
                        {candidate.sidoName} {candidate.sigunguName} ·{" "}
                        {candidate.industrySmallName ??
                          candidate.industryLargeName ??
                          "업종 정보 없음"}
                      </span>

                      <small>
                        {candidate.roadAddress ?? candidate.address}
                      </small>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}

          <button className="btn primary" type="submit" disabled={!canCheck}>
            {isChecking ? "위험 신호 계산 중..." : "1차 위험 신호 확인하기"}
          </button>

          {errorMessage ? (
            <div className="quick-check-error">
              <strong>오류</strong>
              <p>{errorMessage}</p>
            </div>
          ) : null}
        </form>

        <div className="quick-check-result-panel">
          {!result ? (
            <div className="quick-check-empty-result">
              <div className="eyebrow">Result Preview</div>
              <h3>1차 위험 신호 결과가 여기에 표시됩니다</h3>
              <p>
                사업자번호와 매장 후보를 입력하면 위험 신호 점수, 1차 판단,
                동일 업종 밀집도, 감지된 신호가 표시됩니다.
              </p>
            </div>
          ) : (
            <div className="quick-check-result">
              <div>
                <div className="eyebrow">1차 Growth Signal 결과</div>
                <h2>{result.headline}</h2>
                <p>{result.summary}</p>
              </div>

              <div className="quick-check-metrics">
                <div className="metric">
                  <strong style={{ color: getScoreColor(result.riskLevel) }}>
                    {result.riskScore}점
                  </strong>
                  <span>위험 신호 점수</span>
                </div>

                <div className="metric">
                  <strong>{result.riskLevelLabel}</strong>
                  <span>1차 판단</span>
                </div>

                <div className="metric">
                  <strong>
                    {formatCount(
                      result.marketSignals.sameIndustryRegionCount,
                      result.marketSignals.sameIndustryRegionCountIsCapped
                    )}
                  </strong>
                  <span>동일 업종 지역 매장</span>
                </div>
              </div>

              {result.matchedStore ? (
                <div className="quick-check-matched-store">
                  <strong>매칭된 매장 후보</strong>
                  <p>{result.matchedStore.storeName}</p>
                  <span>
                    {result.matchedStore.sidoName}{" "}
                    {result.matchedStore.sigunguName} ·{" "}
                    {result.matchedStore.industrySmallName}
                  </span>
                  <small>
                    {result.matchedStore.roadAddress ??
                      result.matchedStore.address}
                  </small>
                </div>
              ) : null}

              {result.dataSourceStatus?.status === "db_error" ? (
                <div className="quick-check-warning">
                  수집 데이터 조회 중 일부 오류가 있어 간이 신호만 표시했습니다.
                </div>
              ) : null}

              <div>
                <strong>감지된 신호</strong>
                <ul>
                  {result.reasons.map((reason) => (
                    <li key={reason}>{reason}</li>
                  ))}
                </ul>
              </div>

              <div className="quick-check-next">
                <strong>다음 단계</strong>
                <p>{result.recommendedNextStep}</p>

                <a
                  className="btn primary"
                  href={`/care-program?businessNumber=${result.normalizedBusinessNumber}`}
                >
                  2차 케어 프로그램 보기
                </a>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
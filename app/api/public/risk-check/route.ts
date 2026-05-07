import { NextResponse } from "next/server";

import { db } from "@/lib/db/repositories";

export const runtime = "nodejs";

type RiskLevel = "stable" | "watch" | "warning" | "danger";

type ExternalSemasStoreRow = {
  semas_store_id: string;
  store_name: string;
  industry_large_name: string | null;
  industry_middle_name: string | null;
  industry_small_name: string | null;
  sido_name: string | null;
  sigungu_name: string | null;
  address: string | null;
  road_address: string | null;
  lat: number | string | null;
  lng: number | string | null;
};

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

type CountResult = {
  count: number;
  isCapped: boolean;
};

function onlyDigits(value: string): string {
  return value.replace(/\D/g, "");
}

function normalizeText(value: string | null | undefined): string | null {
  const normalized = value?.trim();

  if (!normalized) {
    return null;
  }

  return normalized;
}

function toNumber(value: unknown): number | null {
  if (value === null || value === undefined) {
    return null;
  }

  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return null;
  }

  return parsed;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return "알 수 없는 오류가 발생했습니다.";
}

function mapStoreRow(row: ExternalSemasStoreRow): StoreCandidate {
  return {
    semasStoreId: row.semas_store_id,
    storeName: row.store_name,
    industryLargeName: row.industry_large_name,
    industryMiddleName: row.industry_middle_name,
    industrySmallName: row.industry_small_name,
    sidoName: row.sido_name,
    sigunguName: row.sigungu_name,
    address: row.address,
    roadAddress: row.road_address,
    lat: toNumber(row.lat),
    lng: toNumber(row.lng),
  };
}

function getWeightedSeed(value: string): number {
  return value
    .split("")
    .map((char) => Number(char))
    .reduce((sum, digit, index) => sum + digit * (index + 3), 0);
}

function getRiskLevel(score: number): {
  riskLevel: RiskLevel;
  riskLevelLabel: string;
} {
  if (score >= 75) {
    return {
      riskLevel: "danger",
      riskLevelLabel: "위험",
    };
  }

  if (score >= 58) {
    return {
      riskLevel: "warning",
      riskLevelLabel: "주의",
    };
  }

  if (score >= 40) {
    return {
      riskLevel: "watch",
      riskLevelLabel: "관찰",
    };
  }

  return {
    riskLevel: "stable",
    riskLevelLabel: "안정",
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * public 1차 체크에서는 정확한 전체 count보다 빠른 응답이 더 중요하다.
 * 그래서 count=exact 대신 최대 1000건까지만 가져와서 밀도 신호로 사용한다.
 */
async function countStoresFast(params: {
  sidoName?: string | null;
  sigunguName?: string | null;
  industrySmallName?: string | null;
  industryLargeName?: string | null;
}): Promise<CountResult> {
  let query = db()
    .from("external_semas_store")
    .select("semas_store_id");

  if (params.sidoName) {
    query = query.eq("sido_name", params.sidoName);
  }

  if (params.sigunguName) {
    query = query.eq("sigungu_name", params.sigunguName);
  }

  if (params.industrySmallName) {
    query = query.eq("industry_small_name", params.industrySmallName);
  } else if (params.industryLargeName) {
    query = query.eq("industry_large_name", params.industryLargeName);
  }

  const { data, error } = await query.limit(1000);

  if (error) {
    throw new Error(error.message);
  }

  const count = data?.length ?? 0;

  return {
    count,
    isCapped: count >= 1000,
  };
}

async function findStoreCandidate(params: {
  semasStoreId?: string | null;
  storeName?: string | null;
  sidoName?: string | null;
  sigunguName?: string | null;
}): Promise<StoreCandidate | null> {
  const selectColumns = [
    "semas_store_id",
    "store_name",
    "industry_large_name",
    "industry_middle_name",
    "industry_small_name",
    "sido_name",
    "sigungu_name",
    "address",
    "road_address",
    "lat",
    "lng",
  ].join(",");

  if (params.semasStoreId) {
    const { data, error } = await db()
      .from("external_semas_store")
      .select(selectColumns)
      .eq("semas_store_id", params.semasStoreId)
      .limit(1);

    if (error) {
      throw new Error(error.message);
    }

    const rows = (data ?? []) as unknown as ExternalSemasStoreRow[];
    const row = rows[0];

    return row ? mapStoreRow(row) : null;
  }

  if (!params.storeName || params.storeName.length < 2) {
    return null;
  }

  let query = db()
    .from("external_semas_store")
    .select(selectColumns)
    .ilike("store_name", `%${params.storeName}%`)
    .limit(1);

  if (params.sidoName) {
    query = query.eq("sido_name", params.sidoName);
  }

  if (params.sigunguName) {
    query = query.eq("sigungu_name", params.sigunguName);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  const rows = (data ?? []) as unknown as ExternalSemasStoreRow[];
  const row = rows[0];

  return row ? mapStoreRow(row) : null;
}

async function safeFindStoreCandidate(params: {
  semasStoreId?: string | null;
  storeName?: string | null;
  sidoName?: string | null;
  sigunguName?: string | null;
}): Promise<{
  candidate: StoreCandidate | null;
  errorMessage: string | null;
}> {
  try {
    return {
      candidate: await findStoreCandidate(params),
      errorMessage: null,
    };
  } catch (error) {
    console.error("[risk-check] findStoreCandidate failed", error);

    return {
      candidate: null,
      errorMessage: getErrorMessage(error),
    };
  }
}

async function safeCountStoresFast(params: {
  sidoName?: string | null;
  sigunguName?: string | null;
  industrySmallName?: string | null;
  industryLargeName?: string | null;
}): Promise<CountResult> {
  try {
    return await countStoresFast(params);
  } catch (error) {
    console.error("[risk-check] countStoresFast failed", error);

    return {
      count: 0,
      isCapped: false,
    };
  }
}

function buildReasons(params: {
  score: number;
  hasMatchedStore: boolean;
  regionStoreCount: number;
  regionStoreCountIsCapped: boolean;
  sameIndustryRegionCount: number;
  sameIndustryRegionCountIsCapped: boolean;
  candidate: StoreCandidate | null;
  dataErrorMessage: string | null;
}): string[] {
  const reasons: string[] = [];

  if (params.dataErrorMessage) {
    reasons.push(
      "수집 데이터 조회 중 일부 오류가 있어 사업자번호 기준 간이 신호를 우선 표시했습니다."
    );
  }

  if (!params.hasMatchedStore) {
    reasons.push(
      "사업자번호는 확인했지만, 수집 데이터에서 정확한 매장 후보를 아직 찾지 못했습니다."
    );
    reasons.push(
      "상호명과 지역을 함께 입력하고 매장 후보를 선택하면 상권·경쟁 기반 1차 위험 신호를 더 정확하게 계산할 수 있습니다."
    );
    return reasons;
  }

  if (params.score >= 75) {
    reasons.push("현재 매장은 강한 위험 신호가 감지되는 구간입니다.");
  } else if (params.score >= 58) {
    reasons.push("현재 매장은 주의가 필요한 신호가 있는 구간입니다.");
  } else if (params.score >= 40) {
    reasons.push("현재 매장은 관찰이 필요한 구간입니다.");
  } else {
    reasons.push("현재 1차 기준으로는 안정 구간입니다.");
  }

  if (params.candidate?.sidoName && params.candidate?.sigunguName) {
    const suffix = params.regionStoreCountIsCapped ? " 이상" : "";

    reasons.push(
      `${params.candidate.sidoName} ${params.candidate.sigunguName} 내 수집된 매장 ${params.regionStoreCount.toLocaleString(
        "ko-KR"
      )}건${suffix}을 기준으로 상권 밀도를 확인했습니다.`
    );
  }

  if (params.candidate?.industrySmallName) {
    const suffix = params.sameIndustryRegionCountIsCapped ? " 이상" : "";

    reasons.push(
      `동일 소분류 업종 “${params.candidate.industrySmallName}” 매장 ${params.sameIndustryRegionCount.toLocaleString(
        "ko-KR"
      )}건${suffix}이 같은 지역에서 확인되었습니다.`
    );
  }

  if (params.sameIndustryRegionCount >= 120) {
    reasons.push(
      "동일 업종 밀집도가 높은 편이라 가격, 리뷰, 메뉴/서비스 차별화가 중요합니다."
    );
  } else if (params.sameIndustryRegionCount >= 40) {
    reasons.push(
      "동일 업종 경쟁이 일정 수준 이상 있어 고객 반응과 리뷰 신호를 함께 확인하는 것이 좋습니다."
    );
  } else {
    reasons.push(
      "동일 업종 경쟁은 과도한 수준으로 보이지 않지만, 실제 매출·리뷰 데이터를 연결하면 판단이 달라질 수 있습니다."
    );
  }

  return reasons;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      businessNumber?: string;
      semasStoreId?: string;
      storeName?: string;
      sidoName?: string;
      sigunguName?: string;
    };

    const normalizedBusinessNumber = onlyDigits(body.businessNumber ?? "");
    const semasStoreId = normalizeText(body.semasStoreId);
    const storeName = normalizeText(body.storeName);
    const sidoName = normalizeText(body.sidoName);
    const sigunguName = normalizeText(body.sigunguName);

    if (normalizedBusinessNumber.length !== 10) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "INVALID_BUSINESS_NUMBER",
            message: "사업자등록번호 10자리를 입력해주세요.",
          },
        },
        {
          status: 400,
        }
      );
    }

    const { candidate, errorMessage: candidateErrorMessage } =
      await safeFindStoreCandidate({
        semasStoreId,
        storeName,
        sidoName,
        sigunguName,
      });

    const seed = getWeightedSeed(normalizedBusinessNumber);

    const regionCount = candidate
      ? await safeCountStoresFast({
          sidoName: candidate.sidoName,
          sigunguName: candidate.sigunguName,
        })
      : {
          count: 0,
          isCapped: false,
        };

    const sameIndustryCount = candidate
      ? await safeCountStoresFast({
          sidoName: candidate.sidoName,
          sigunguName: candidate.sigunguName,
          industrySmallName: candidate.industrySmallName,
          industryLargeName: candidate.industryLargeName,
        })
      : {
          count: 0,
          isCapped: false,
        };

    const seedPressure = seed % 11;
    const unknownPenalty = candidate ? 0 : 18;

    const regionPressure = candidate
      ? clamp(regionCount.count / 900, 0, 1) * 16
      : 0;

    const industryPressure = candidate
      ? clamp(sameIndustryCount.count / 160, 0, 1) * 34
      : 0;

    const riskScore = Math.round(
      clamp(
        28 + seedPressure + unknownPenalty + regionPressure + industryPressure,
        20,
        92
      )
    );

    const { riskLevel, riskLevelLabel } = getRiskLevel(riskScore);

    const headline =
      riskLevel === "danger"
        ? "강한 위험 신호가 감지되었습니다"
        : riskLevel === "warning"
          ? "주의가 필요한 신호가 있습니다"
          : riskLevel === "watch"
            ? "관찰이 필요한 구간입니다"
            : "현재 1차 기준으로는 안정 구간입니다";

    const summary = candidate
      ? "사업자번호와 매장 후보를 기준으로 지역·업종·경쟁 밀도 기반 1차 Growth Signal을 계산했습니다."
      : "사업자번호 기준 1차 체크는 완료했지만, 상호명/지역 기반 매장 매칭이 없어 상세 상권 신호는 제한적으로 반영되었습니다.";

    return NextResponse.json({
      success: true,
      data: {
        businessNumber: normalizedBusinessNumber,
        normalizedBusinessNumber,
        riskScore,
        riskLevel,
        riskLevelLabel,
        headline,
        summary,
        matchedStore: candidate,
        dataSourceStatus: {
          status: candidate
            ? "matched"
            : candidateErrorMessage
              ? "db_error"
              : "not_matched",
          errorMessage: candidateErrorMessage,
        },
        marketSignals: {
          regionStoreCount: regionCount.count,
          regionStoreCountIsCapped: regionCount.isCapped,
          sameIndustryRegionCount: sameIndustryCount.count,
          sameIndustryRegionCountIsCapped: sameIndustryCount.isCapped,
          hasMatchedStore: Boolean(candidate),
        },
        reasons: buildReasons({
          score: riskScore,
          hasMatchedStore: Boolean(candidate),
          regionStoreCount: regionCount.count,
          regionStoreCountIsCapped: regionCount.isCapped,
          sameIndustryRegionCount: sameIndustryCount.count,
          sameIndustryRegionCountIsCapped: sameIndustryCount.isCapped,
          candidate,
          dataErrorMessage: candidateErrorMessage,
        }),
        recommendedNextStep:
          "2차 케어 프로그램에서는 매출, 리뷰, 상권, 경쟁 데이터를 연결해 위험 원인을 세분화하고 이번 주 실행 액션을 제공합니다.",
      },
    });
  } catch (error) {
    console.error("[risk-check] fatal failed", error);

    return NextResponse.json(
      {
        success: false,
        error: {
          code: "RISK_CHECK_FAILED",
          message:
            error instanceof Error
              ? error.message
              : "1차 위험 신호 확인 중 오류가 발생했습니다.",
        },
      },
      {
        status: 500,
      }
    );
  }
}
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DEFAULT_RADIUS = 500;

type KakaoCoord = {
  x: string;
  y: string;
};

type KakaoMeta = {
  total_count?: number;
  pageable_count?: number;
  is_end?: boolean;
  [key: string]: unknown;
};

type KakaoPlace = {
  id?: string;
  place_name?: string;
  category_name?: string;
  category_group_code?: string;
  category_group_name?: string;
  phone?: string;
  address_name?: string;
  road_address_name?: string;
  place_url?: string;
  distance?: string;
  x?: string;
  y?: string;
};

type KakaoSearchResponse = {
  meta?: KakaoMeta;
  documents?: KakaoPlace[];
};

type ScoredPlace = {
  place: KakaoPlace;
  score: number;
  nameScore: number;
  addressScore: number;
  categoryScore: number;
  distanceScore: number;
  matched: boolean;
};

function text(value: unknown) {
  const s = String(value ?? "").trim();
  return s.length > 0 ? s : null;
}

function num(value: unknown, fallback = 0) {
  const n = Number(value ?? fallback);
  return Number.isFinite(n) ? n : fallback;
}

function normalizeText(value: unknown) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, "");
}

function tokenize(value: unknown) {
  return String(value ?? "")
    .toLowerCase()
    .split(/[\s,./()·\-_|]+/g)
    .map((part) => part.replace(/[^\p{L}\p{N}]+/gu, ""))
    .filter(Boolean);
}

function tokenOverlapRatio(a: unknown, b: unknown) {
  const ta = Array.from(new Set(tokenize(a)));
  const tb = Array.from(new Set(tokenize(b)));

  if (ta.length === 0 || tb.length === 0) return 0;

  const setB = new Set(tb);
  let intersection = 0;

  for (const token of ta) {
    if (setB.has(token)) intersection += 1;
  }

  return intersection / Math.max(ta.length, tb.length);
}

function addressSimilarity(a: unknown, b: unknown) {
  const na = normalizeText(a);
  const nb = normalizeText(b);

  if (!na || !nb) return 0;
  if (na === nb) return 1;
  if (na.includes(nb) || nb.includes(na)) return 0.9;

  return tokenOverlapRatio(a, b);
}

function nameSimilarity(a: unknown, b: unknown) {
  const na = normalizeText(a);
  const nb = normalizeText(b);

  if (!na || !nb) return 0;
  if (na === nb) return 1;
  if (na.includes(nb) || nb.includes(na)) return 0.85;

  return tokenOverlapRatio(a, b);
}

function stripParentheses(value: string) {
  return value.replace(/\([^)]*\)/g, " ").replace(/\s+/g, " ").trim();
}

function uniqueStrings(values: Array<string | null | undefined>) {
  return Array.from(
    new Set(values.map((value) => text(value)).filter((value): value is string => Boolean(value))),
  );
}

function getAddressQueryHints(address: string) {
  const rawParts = address
    .split(/\s+/g)
    .map((part) => part.trim())
    .filter(Boolean);

  const filtered = rawParts.filter((part) => {
    if (/^\d+$/.test(part)) return false;
    if (part.length < 2) return false;
    return true;
  });

  return uniqueStrings(filtered.slice(-3));
}

function buildKeywordQueries(businessName: string, address: string) {
  const cleanBusinessName = stripParentheses(businessName);
  const hints = getAddressQueryHints(address);

  return uniqueStrings([
    businessName,
    cleanBusinessName,
    ...hints.map((hint) => `${cleanBusinessName} ${hint}`),
  ]).slice(0, 4);
}

function looselyMatchPlaceName(placeName: unknown, businessName: unknown) {
  const similarity = nameSimilarity(placeName, businessName);
  return similarity >= 0.6;
}

function scorePlaceMatch(args: {
  place: KakaoPlace;
  businessName: string;
  address: string;
  categoryGroupCode?: string | null;
}) {
  const placeName = text(args.place.place_name) ?? "";
  const roadAddress = text(args.place.road_address_name) ?? "";
  const lotAddress = text(args.place.address_name) ?? "";
  const mergedAddress = `${roadAddress} ${lotAddress}`.trim();

  const nameSim = nameSimilarity(placeName, args.businessName);
  const addressSim = Math.max(
    addressSimilarity(roadAddress, args.address),
    addressSimilarity(lotAddress, args.address),
    addressSimilarity(mergedAddress, args.address),
  );

  let nameScore = 0;
  if (nameSim >= 1) nameScore = 70;
  else if (nameSim >= 0.85) nameScore = 56;
  else if (nameSim >= 0.6) nameScore = 42;
  else if (nameSim >= 0.34) nameScore = 24;

  let addressScore = 0;
  if (addressSim >= 0.9) addressScore = 28;
  else if (addressSim >= 0.7) addressScore = 22;
  else if (addressSim >= 0.45) addressScore = 14;
  else if (addressSim >= 0.25) addressScore = 6;

  let categoryScore = 0;
  if (
    text(args.categoryGroupCode) &&
    text(args.place.category_group_code) &&
    text(args.categoryGroupCode) === text(args.place.category_group_code)
  ) {
    categoryScore = 8;
  }

  const distance = num(args.place.distance, Number.NaN);
  let distanceScore = 0;
  if (Number.isFinite(distance)) {
    if (distance <= 50) distanceScore = 8;
    else if (distance <= 120) distanceScore = 6;
    else if (distance <= 250) distanceScore = 4;
    else if (distance <= 500) distanceScore = 2;
  }

  const score = nameScore + addressScore + categoryScore + distanceScore;
  const matched =
    score >= 60 ||
    (nameScore >= 42 && addressScore >= 14) ||
    (nameScore >= 56 && addressScore >= 6) ||
    looselyMatchPlaceName(placeName, args.businessName);

  return {
    score,
    nameScore,
    addressScore,
    categoryScore,
    distanceScore,
    matched,
  };
}

async function kakaoGet(url: URL) {
  const restKey = process.env.KAKAO_REST_API_KEY;
  if (!restKey) {
    throw new Error("KAKAO_REST_API_KEY가 설정되지 않았습니다.");
  }

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: {
      Authorization: `KakaoAK ${restKey}`,
    },
    cache: "no-store",
  });

  const rawText = await response.text();

  let parsed: KakaoSearchResponse | Record<string, unknown> | null = null;
  try {
    parsed = rawText ? (JSON.parse(rawText) as KakaoSearchResponse) : null;
  } catch {
    parsed = { rawText };
  }

  if (!response.ok) {
    throw new Error(`카카오 로컬 API 호출 실패 (${response.status})`);
  }

  return parsed as KakaoSearchResponse;
}

async function searchAddressToCoord(address: string): Promise<KakaoCoord | null> {
  const url = new URL("https://dapi.kakao.com/v2/local/search/address.json");
  url.searchParams.set("query", address);

  const parsed = await kakaoGet(url);
  const first = parsed.documents?.[0];

  if (!first?.x || !first?.y) {
    return null;
  }

  return {
    x: first.x,
    y: first.y,
  };
}

async function searchPlacesByKeyword(args: {
  query: string;
  x: string;
  y: string;
  radius: number;
  categoryGroupCode?: string | null;
  size?: number;
}) {
  const url = new URL("https://dapi.kakao.com/v2/local/search/keyword.json");
  url.searchParams.set("query", args.query);
  url.searchParams.set("x", args.x);
  url.searchParams.set("y", args.y);
  url.searchParams.set("radius", String(args.radius));
  url.searchParams.set("size", String(args.size ?? 15));
  url.searchParams.set("sort", "accuracy");

  if (args.categoryGroupCode) {
    url.searchParams.set("category_group_code", args.categoryGroupCode);
  }

  return kakaoGet(url);
}

async function searchPlacesByCategory(args: {
  categoryGroupCode: string;
  x: string;
  y: string;
  radius: number;
  size?: number;
}) {
  const url = new URL("https://dapi.kakao.com/v2/local/search/category.json");
  url.searchParams.set("category_group_code", args.categoryGroupCode);
  url.searchParams.set("x", args.x);
  url.searchParams.set("y", args.y);
  url.searchParams.set("radius", String(args.radius));
  url.searchParams.set("size", String(args.size ?? 15));
  url.searchParams.set("sort", "distance");

  return kakaoGet(url);
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      businessName?: string;
      address?: string;
      categoryGroupCode?: string;
      radius?: number;
    };

    const businessName = text(body.businessName);
    const address = text(body.address);
    const categoryGroupCode = text(body.categoryGroupCode);
    const radius = Math.max(100, Math.min(20000, num(body.radius, DEFAULT_RADIUS)));

    if (!businessName || !address) {
      return NextResponse.json(
        { ok: false, error: "businessName and address are required." },
        { status: 400 },
      );
    }

    const coord = await searchAddressToCoord(address);

    if (!coord) {
      return NextResponse.json({
        ok: true,
        geocoded: false,
        coord: null,
        matchedPlaces: [],
        competitorPlaces: [],
        summary: {
          totalCount: 0,
          matchedCount: 0,
          competitorCount: 0,
        },
        raw: null,
      });
    }

    const keywordQueries = buildKeywordQueries(businessName, address);
    const keywordResults = await Promise.all(
      keywordQueries.map((query) =>
        searchPlacesByKeyword({
          query,
          x: coord.x,
          y: coord.y,
          radius,
          categoryGroupCode,
          size: 15,
        }),
      ),
    );

    const keywordMap = new Map<string, KakaoPlace>();
    for (const result of keywordResults) {
      for (const place of result.documents ?? []) {
        const key =
          text(place.id) ??
          [text(place.place_name), text(place.road_address_name), text(place.address_name)]
            .filter(Boolean)
            .join("||");

        if (key && !keywordMap.has(key)) {
          keywordMap.set(key, place);
        }
      }
    }

    const scoredPlaces: ScoredPlace[] = Array.from(keywordMap.values())
      .map((place) => ({
        place,
        ...scorePlaceMatch({
          place,
          businessName,
          address,
          categoryGroupCode,
        }),
      }))
      .sort((a, b) => b.score - a.score);

    const matchedPlaces = scoredPlaces.filter((row) => row.matched).map((row) => row.place);

    const competitorResult = categoryGroupCode
      ? await searchPlacesByCategory({
          categoryGroupCode,
          x: coord.x,
          y: coord.y,
          radius,
          size: 15,
        })
      : null;

    const matchedIds = new Set(
      matchedPlaces.map((place) => text(place.id)).filter((value): value is string => Boolean(value)),
    );

    const competitorPlaces = (competitorResult?.documents ?? []).filter((place) => {
      const placeId = text(place.id);
      return !placeId || !matchedIds.has(placeId);
    });

    const totalKeywordCount = keywordResults.reduce(
      (sum, result) => sum + num(result.meta?.total_count, 0),
      0,
    );

    return NextResponse.json({
      ok: true,
      geocoded: true,
      coord,
      matchedPlaces,
      competitorPlaces,
      summary: {
        totalCount: Math.max(keywordMap.size, totalKeywordCount),
        matchedCount: matchedPlaces.length,
        competitorCount: competitorPlaces.length,
      },
      raw: {
        keywordQueries,
        keywordResults,
        scoredPlaces: scoredPlaces.slice(0, 10).map((row) => ({
          place_name: row.place.place_name,
          road_address_name: row.place.road_address_name,
          address_name: row.place.address_name,
          distance: row.place.distance,
          score: row.score,
          nameScore: row.nameScore,
          addressScore: row.addressScore,
          categoryScore: row.categoryScore,
          distanceScore: row.distanceScore,
          matched: row.matched,
        })),
        competitorResult,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

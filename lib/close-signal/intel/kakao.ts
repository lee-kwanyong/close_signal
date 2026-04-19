export type KakaoCoord = {
  x: string;
  y: string;
};

export type KakaoPlace = {
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

export type KakaoSearchResponse = {
  meta: {
    total_count: number;
    pageable_count?: number;
    is_end?: boolean;
  };
  documents: KakaoPlace[];
};

function normalizeText(value: unknown) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, "");
}

function tokenize(value: unknown) {
  return String(value ?? "")
    .toLowerCase()
    .split(/[\s,./()·\\-_|]+/g)
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

export function looselyMatchPlaceName(placeName: unknown, businessName: unknown) {
  const place = normalizeText(placeName);
  const business = normalizeText(businessName);

  if (!place || !business) return false;
  if (place === business) return true;
  if (place.includes(business) || business.includes(place)) return true;
  return tokenOverlapRatio(placeName, businessName) >= 0.5;
}

async function kakaoGet(url: URL): Promise<KakaoSearchResponse> {
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
  const parsed = rawText ? JSON.parse(rawText) : {};

  if (!response.ok) {
    throw new Error(`카카오 로컬 API 호출 실패 (${response.status})`);
  }

  return {
    meta: {
      total_count: Number(parsed?.meta?.total_count ?? 0),
      pageable_count: parsed?.meta?.pageable_count,
      is_end: parsed?.meta?.is_end,
    },
    documents: Array.isArray(parsed?.documents) ? parsed.documents : [],
  };
}

export async function searchAddressToCoord(address: string): Promise<KakaoCoord | null> {
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

export async function searchPlacesByKeyword(args: {
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

export async function searchPlacesByCategory(args: {
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
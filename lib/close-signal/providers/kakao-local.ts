import { env } from "@/lib/env";

export type KakaoPlace = {
  id?: string;
  place_name?: string;
  category_name?: string;
  address_name?: string;
  road_address_name?: string;
  x?: string;
  y?: string;
  phone?: string;
  place_url?: string;
};

export type KakaoAddressResult = {
  address_name?: string;
  address_type?: string;
  x?: string;
  y?: string;
  address?: {
    address_name?: string;
    region_1depth_name?: string;
    region_2depth_name?: string;
    region_3depth_name?: string;
    b_code?: string;
  };
  road_address?: {
    address_name?: string;
    region_1depth_name?: string;
    region_2depth_name?: string;
    region_3depth_name?: string;
  };
};

async function kakaoFetch<T>(path: string, search: URLSearchParams): Promise<T> {
  const url = `https://dapi.kakao.com${path}?${search.toString()}`;

  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `KakaoAK ${env.KAKAO_REST_API_KEY}`,
      "Content-Type": "application/json;charset=UTF-8",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Kakao API ${response.status}: ${text}`);
  }

  return (await response.json()) as T;
}

export async function searchAddress(address: string): Promise<KakaoAddressResult | null> {
  const query = address.trim();
  if (!query) return null;

  const params = new URLSearchParams();
  params.set("query", query);
  params.set("analyze_type", "exact");

  const data = await kakaoFetch<{ documents?: KakaoAddressResult[] }>(
    "/v2/local/search/address.json",
    params
  );

  return data.documents?.[0] ?? null;
}

export async function searchKeyword(
  query: string,
  x?: number,
  y?: number
): Promise<KakaoPlace | null> {
  const keyword = query.trim();
  if (!keyword) return null;

  const params = new URLSearchParams();
  params.set("query", keyword);
  params.set("size", String(env.KAKAO_PAGE_SIZE));

  if (Number.isFinite(x) && Number.isFinite(y)) {
    params.set("x", String(x));
    params.set("y", String(y));
    params.set("radius", "2000");
    params.set("sort", "distance");
  }

  const data = await kakaoFetch<{ documents?: KakaoPlace[] }>(
    "/v2/local/search/keyword.json",
    params
  );

  return data.documents?.[0] ?? null;
}

export async function coordToRegionCode(
  x: number,
  y: number
): Promise<{
  region_type?: string;
  address_name?: string;
  region_1depth_name?: string;
  region_2depth_name?: string;
  region_3depth_name?: string;
  code?: string;
} | null> {
  const params = new URLSearchParams();
  params.set("x", String(x));
  params.set("y", String(y));

  const data = await kakaoFetch<{ documents?: any[] }>(
    "/v2/local/geo/coord2regioncode.json",
    params
  );

  const h = (data.documents ?? []).find((d) => d.region_type === "H");
  return h ?? data.documents?.[0] ?? null;
}
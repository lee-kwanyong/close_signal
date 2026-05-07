import { NextResponse } from "next/server";

import { db } from "@/lib/db/repositories";

export const runtime = "nodejs";

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

function mapStoreRow(row: ExternalSemasStoreRow) {
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

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);

    const q = normalizeText(url.searchParams.get("q"));
    const sidoName = normalizeText(url.searchParams.get("sidoName"));
    const sigunguName = normalizeText(url.searchParams.get("sigunguName"));
    const industryKeyword = normalizeText(
      url.searchParams.get("industryKeyword")
    );

    if (!q || q.length < 2) {
      return NextResponse.json({
        success: true,
        data: {
          items: [],
          message: "상호명을 2글자 이상 입력해주세요.",
        },
      });
    }

    let query = db()
      .from("external_semas_store")
      .select(
        [
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
        ].join(",")
      )
      .ilike("store_name", `%${q}%`)
      .limit(20);

    if (sidoName) {
      query = query.eq("sido_name", sidoName);
    }

    if (sigunguName) {
      query = query.eq("sigungu_name", sigunguName);
    }

    if (industryKeyword) {
      query = query.ilike("industry_small_name", `%${industryKeyword}%`);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(error.message);
    }

    const rows = (data ?? []) as unknown as ExternalSemasStoreRow[];

    return NextResponse.json({
      success: true,
      data: {
        items: rows.map(mapStoreRow),
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "STORE_SEARCH_FAILED",
          message:
            error instanceof Error
              ? error.message
              : "매장 후보 검색 중 오류가 발생했습니다.",
        },
      },
      {
        status: 500,
      }
    );
  }
}
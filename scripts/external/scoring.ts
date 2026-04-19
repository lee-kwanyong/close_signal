import {
  BusinessSeed,
  KakaoPlaceDocument,
  NaverLocalItem,
  NtsStatusLookupResult,
  ProviderEvent,
} from "./types";
import {
  normalizeKakaoCategory,
  normalizeNaverCategory,
  normalizeNaverTitle,
} from "./providers";

function stringValue(value: unknown) {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return null;
}

function normalizeText(value: string | null | undefined): string {
  return (value ?? "")
    .replace(/<[^>]+>/g, "")
    .replace(/[()]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function similarityByContainment(a: string, b: string): number {
  if (!a || !b) return 0;
  if (a === b) return 1;
  if (a.includes(b) || b.includes(a)) return 0.85;

  const aTokens = new Set(a.split(" ").filter(Boolean));
  const bTokens = new Set(b.split(" ").filter(Boolean));
  const intersect = [...aTokens].filter((t) => bTokens.has(t)).length;
  const union = new Set([...aTokens, ...bTokens]).size;

  if (union === 0) return 0;
  return intersect / union;
}

function parseMaybeNumber(value: string | number | null | undefined): number | null {
  if (value == null) return null;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

export function buildKakaoEvent(
  business: BusinessSeed,
  docs: KakaoPlaceDocument[],
  observedAt: string,
): ProviderEvent {
  const businessName = normalizeText(business.business_name);
  const address = normalizeText(business.address);

  if (!docs.length) {
    return {
      businessId: business.id,
      observedAt,
      eventType: "listing_missing",
      signalScore: 70,
      confidence: 0.8,
      externalStatus: "missing",
      payload: {
        provider: "kakao_local",
        matchedCount: 0,
      },
    };
  }

  const best = docs
    .map((doc) => {
      const nameScore = similarityByContainment(
        businessName,
        normalizeText(doc.place_name),
      );
      const addressScore = similarityByContainment(
        address,
        normalizeText(doc.road_address_name || doc.address_name),
      );

      const finalScore = nameScore * 0.7 + addressScore * 0.3;
      return { doc, finalScore, nameScore, addressScore };
    })
    .sort((a, b) => b.finalScore - a.finalScore)[0];

  if (!best) {
    return {
      businessId: business.id,
      observedAt,
      eventType: "listing_missing",
      signalScore: 70,
      confidence: 0.75,
      externalStatus: "missing",
      payload: {
        provider: "kakao_local",
        matchedCount: docs.length,
      },
    };
  }

  const eventType =
    best.finalScore >= 0.75
      ? "listing_found"
      : best.nameScore >= 0.5
        ? "category_mismatch"
        : "listing_missing";

  const signalScore =
    eventType === "listing_found"
      ? Math.max(0, 15 - Math.round(best.finalScore * 10))
      : eventType === "category_mismatch"
        ? 35
        : 65;

  return {
    businessId: business.id,
    observedAt,
    eventType,
    signalScore,
    confidence: Number(best.finalScore.toFixed(4)),
    externalId: best.doc.id ?? null,
    externalName: best.doc.place_name ?? null,
externalCategory: best.doc.category_name
  ? String(normalizeKakaoCategory(best.doc.category_name))
  : null,
    externalStatus: eventType === "listing_found" ? "open" : "uncertain",
    externalUrl: best.doc.place_url ?? null,
    latitude: parseMaybeNumber(best.doc.y),
    longitude: parseMaybeNumber(best.doc.x),
    payload: {
      provider: "kakao_local",
      matchedCount: docs.length,
      nameScore: best.nameScore,
      addressScore: best.addressScore,
      finalScore: best.finalScore,
      roadAddress: best.doc.road_address_name ?? null,
      addressName: best.doc.address_name ?? null,
      distance: best.doc.distance ?? null,
    },
  };
}

export function buildNaverEvent(
  business: BusinessSeed,
  items: NaverLocalItem[],
  observedAt: string,
): ProviderEvent {
  const businessName = normalizeText(business.business_name);
  const address = normalizeText(business.address);

  if (!items.length) {
    return {
      businessId: business.id,
      observedAt,
      eventType: "listing_missing",
      signalScore: 60,
      confidence: 0.8,
      externalStatus: "missing",
      payload: {
        provider: "naver_local",
        matchedCount: 0,
      },
    };
  }

  const best = items
    .map((item) => {
      const normalizedTitle = normalizeText(normalizeNaverTitle(item.title));
      const normalizedAddress = normalizeText(item.roadAddress || item.address);

      const nameScore = similarityByContainment(businessName, normalizedTitle);
      const addressScore = similarityByContainment(address, normalizedAddress);
      const finalScore = nameScore * 0.75 + addressScore * 0.25;

      return { item, finalScore, nameScore, addressScore };
    })
    .sort((a, b) => b.finalScore - a.finalScore)[0];

  if (!best) {
    return {
      businessId: business.id,
      observedAt,
      eventType: "listing_missing",
      signalScore: 60,
      confidence: 0.75,
      externalStatus: "missing",
      payload: {
        provider: "naver_local",
        matchedCount: items.length,
      },
    };
  }

  const eventType =
    best.finalScore >= 0.75
      ? "listing_found"
      : best.nameScore >= 0.5
        ? "search_rank_down"
        : "listing_missing";

  const signalScore =
    eventType === "listing_found"
      ? Math.max(0, 20 - Math.round(best.finalScore * 10))
      : eventType === "search_rank_down"
        ? 30
        : 55;

  return {
    businessId: business.id,
    observedAt,
    eventType,
    signalScore,
    confidence: Number(best.finalScore.toFixed(4)),
    externalName: normalizeNaverTitle(best.item.title),
externalCategory: String(normalizeNaverCategory(best.item.category ?? "") ?? ""),
    externalStatus: eventType === "listing_found" ? "open" : "uncertain",
    externalUrl: best.item.link ?? null,
    payload: {
      provider: "naver_local",
      matchedCount: items.length,
      nameScore: best.nameScore,
      addressScore: best.addressScore,
      finalScore: best.finalScore,
      address: best.item.address ?? null,
      roadAddress: best.item.roadAddress ?? null,
      telephone: best.item.telephone ?? null,
    },
  };
}

export function buildNtsEvent(
  business: BusinessSeed,
  nts: NtsStatusLookupResult | null,
  observedAt: string,
): ProviderEvent {
  const rawStatus = nts?.statusText?.trim() || "";
  let eventType = "status_open";
  let signalScore = 0;
  let confidence = 0.95;
  let externalStatus = rawStatus || "unknown";

  if (rawStatus.includes("폐업")) {
    eventType = "status_closed";
    signalScore = 100;
  } else if (rawStatus.includes("휴업")) {
    eventType = "status_suspended";
    signalScore = 75;
  } else if (!rawStatus) {
    eventType = "status_open";
    signalScore = 10;
    confidence = 0.4;
    externalStatus = "unknown";
  }

  return {
    businessId: business.id,
    observedAt,
    eventType,
    signalScore,
    confidence,
    externalStatus,
    payload: {
      provider: "nts_biz_status",
      raw: nts?.raw ?? null,
      businessNumber: business.business_number ?? null,
    },
  };
}
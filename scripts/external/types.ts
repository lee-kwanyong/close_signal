export type Nullable<T> = T | null;

export interface BusinessSeed {
  id: number;
  business_name: string | null;
  business_number: string | null;
  address: string | null;
  normalized_region_code: string | null;
  normalized_category_code: string | null;
  lat: number | null;
  lng: number | null;
}

export interface RunOptions {
  limit: number;
  withKakao: boolean;
  withNaver: boolean;
  withNts: boolean;
  dryRun: boolean;
}

export interface ProviderEvent {
  businessId: number;
  observedAt: string;
  eventType: string;
  signalScore: number;
  confidence: number;
  externalId?: string | null;
  externalName?: string | null;
  externalCategory?: string | null;
  externalStatus?: string | null;
  externalUrl?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  payload?: Record<string, unknown>;
}

export interface KakaoPlaceDocument {
  id?: string;
  place_name?: string;
  category_name?: string;
  category_group_code?: string;
  category_group_name?: string;
  phone?: string;
  address_name?: string;
  road_address_name?: string;
  x?: string;
  y?: string;
  place_url?: string;
  distance?: string;
}

export interface KakaoKeywordSearchResponse {
  documents: KakaoPlaceDocument[];
  meta?: {
    total_count?: number;
    pageable_count?: number;
    is_end?: boolean;
    same_name?: {
      region?: string[];
      keyword?: string;
      selected_region?: string;
    };
  };
}

export interface NaverLocalItem {
  title?: string;
  category?: string;
  description?: string;
  telephone?: string;
  address?: string;
  roadAddress?: string;
  mapx?: string;
  mapy?: string;
  link?: string;
}

export interface NaverLocalSearchResponse {
  lastBuildDate?: string;
  total?: number;
  start?: number;
  display?: number;
  items?: NaverLocalItem[];
}

export interface NtsStatusItem {
  b_no?: string;
  b_stt?: string;
  b_stt_cd?: string;
  tax_type?: string;
  tax_type_cd?: string;
  end_dt?: string;
  utcc_yn?: string;
  invoice_apply_dt?: string;
  rbf_tax_type?: string;
}

export interface NtsStatusResponse {
  data?: NtsStatusItem[];
  status_code?: string;
  match_cnt?: number;
  request_cnt?: number;
}

export interface NtsStatusLookupResult {
  businessNumber: string;
  statusText: string | null;
  raw: NtsStatusItem | null;
}
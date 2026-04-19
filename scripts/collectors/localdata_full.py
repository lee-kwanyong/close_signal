from __future__ import annotations

import json
import os
import sys
import time
import hashlib
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any, Dict, Iterable, List, Optional, Tuple

import requests


# =========================================================
# CONFIG
# =========================================================

SUPABASE_URL = os.getenv("SUPABASE_URL", "").rstrip("/")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY", "")
SUPABASE_SCHEMA = os.getenv("SUPABASE_SCHEMA", "public")

SOURCE_KEY = os.getenv("CLOSE_SIGNAL_SOURCE_KEY", "localdata_full")

LOCALDATA_BASE_URL = os.getenv("LOCALDATA_BASE_URL", "").rstrip("/")
LOCALDATA_API_KEY = os.getenv("LOCALDATA_API_KEY", "")

# 페이지 크기 / 최대 페이지
PAGE_SIZE = int(os.getenv("LOCALDATA_PAGE_SIZE", "500"))
MAX_PAGES = int(os.getenv("LOCALDATA_MAX_PAGES", "1000"))

# 초기 적재라서 날짜 제한 없이 가져오되,
# 필요하면 아래 env로 범위를 줄일 수 있게 열어둠.
DATE_FROM = os.getenv("LOCALDATA_DATE_FROM", "").strip()
DATE_TO = os.getenv("LOCALDATA_DATE_TO", "").strip()

REQUEST_TIMEOUT = int(os.getenv("REQUEST_TIMEOUT_SECONDS", "40"))
SLEEP_BETWEEN_REQUESTS = float(os.getenv("SLEEP_BETWEEN_REQUESTS", "0.15"))

# 소스 API 응답 루트 키 후보
ITEM_KEYS = [
    "items",
    "data",
    "list",
    "results",
    "result",
    "records",
    "row",
]

# 페이지네이션 총건수 후보
TOTAL_KEYS = [
    "totalCount",
    "total_count",
    "count",
    "total",
]


# =========================================================
# HTTP
# =========================================================

session = requests.Session()
session.headers.update(
    {
        "User-Agent": "close-signal-collector/1.0",
        "Accept": "application/json",
    }
)


# =========================================================
# HELPERS
# =========================================================

def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def fail(msg: str, code: int = 1) -> None:
    print(msg, file=sys.stderr)
    sys.exit(code)


def require_env(name: str, value: str) -> None:
    if not value:
        fail(f"[ERROR] Missing required environment variable: {name}")


def stable_json_dumps(value: Any) -> str:
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"))


def sha256_text(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def first_present(d: Dict[str, Any], keys: Iterable[str], default: Any = None) -> Any:
    for key in keys:
        if key in d and d[key] not in (None, ""):
            return d[key]
    return default


def chunked(seq: List[Any], size: int) -> Iterable[List[Any]]:
    for i in range(0, len(seq), size):
        yield seq[i:i + size]


# =========================================================
# SUPABASE RPC CLIENT
# =========================================================

@dataclass
class SupabaseClient:
    base_url: str
    api_key: str
    schema: str = "public"

    @property
    def rpc_base(self) -> str:
        return f"{self.base_url}/rest/v1/rpc"

    @property
    def headers(self) -> Dict[str, str]:
        return {
            "apikey": self.api_key,
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
            "Accept": "application/json",
            "Prefer": "return=representation",
        }

    def rpc(self, fn: str, payload: Dict[str, Any]) -> Any:
        url = f"{self.rpc_base}/{fn}"
        resp = session.post(url, headers=self.headers, json=payload, timeout=REQUEST_TIMEOUT)
        if resp.status_code >= 400:
            raise RuntimeError(
                f"Supabase RPC failed: {fn} {resp.status_code}\n{resp.text}"
            )
        if not resp.text.strip():
            return None
        try:
            return resp.json()
        except Exception:
            return resp.text


# =========================================================
# SOURCE FETCHER
# =========================================================

class LocalDataFetcher:
    """
    초기 적재용 full collector.
    실제 소스 응답 구조가 조금 달라도 버틸 수 있게
    item key / total key / pagination key를 느슨하게 처리한다.
    """

    def __init__(self, base_url: str, api_key: str) -> None:
        self.base_url = base_url
        self.api_key = api_key

    def _build_params(self, page: int, page_size: int) -> Dict[str, Any]:
        params: Dict[str, Any] = {
            "serviceKey": self.api_key,
            "page": page,
            "pageNo": page,
            "numOfRows": page_size,
            "pageSize": page_size,
            "_type": "json",
        }

        if DATE_FROM:
            params["dateFrom"] = DATE_FROM
            params["fromDate"] = DATE_FROM
            params["startDate"] = DATE_FROM

        if DATE_TO:
            params["dateTo"] = DATE_TO
            params["toDate"] = DATE_TO
            params["endDate"] = DATE_TO

        return params

    def _extract_items_and_total(self, payload: Any) -> Tuple[List[Dict[str, Any]], Optional[int]]:
        if isinstance(payload, list):
            rows = [x for x in payload if isinstance(x, dict)]
            return rows, len(rows)

        if not isinstance(payload, dict):
            return [], None

        # 흔한 중첩 구조 순회
        candidates: List[Any] = [payload]
        for key in ["response", "body", "resultBody", "data"]:
            if isinstance(payload.get(key), dict):
                candidates.append(payload[key])

        items: List[Dict[str, Any]] = []
        total: Optional[int] = None

        for node in candidates:
            if not isinstance(node, dict):
                continue

            if total is None:
                found_total = first_present(node, TOTAL_KEYS)
                if found_total is not None:
                    try:
                        total = int(found_total)
                    except Exception:
                        total = None

            for item_key in ITEM_KEYS:
                raw_items = node.get(item_key)
                if isinstance(raw_items, list):
                    items = [x for x in raw_items if isinstance(x, dict)]
                    return items, total
                if isinstance(raw_items, dict):
                    # 예: {"item": [...]}
                    inner = raw_items.get("item")
                    if isinstance(inner, list):
                        items = [x for x in inner if isinstance(x, dict)]
                        return items, total

        # 최후 fallback: dict 내부에 dict list 탐색
        for _, value in payload.items():
            if isinstance(value, list) and value and isinstance(value[0], dict):
                return value, total

        return [], total

    def fetch_page(self, page: int, page_size: int) -> Tuple[List[Dict[str, Any]], Optional[int], Dict[str, Any]]:
        params = self._build_params(page=page, page_size=page_size)
        resp = session.get(self.base_url, params=params, timeout=REQUEST_TIMEOUT)

        if resp.status_code >= 400:
            raise RuntimeError(
                f"Source request failed: {resp.status_code} {resp.text[:1000]}"
            )

        try:
            payload = resp.json()
        except Exception:
            raise RuntimeError(f"Source did not return valid JSON: {resp.text[:1000]}")

        items, total = self._extract_items_and_total(payload)
        return items, total, payload

    def fetch_all(self) -> Tuple[List[Dict[str, Any]], Dict[str, Any]]:
        all_rows: List[Dict[str, Any]] = []
        meta: Dict[str, Any] = {
            "pages_requested": 0,
            "pages_with_data": 0,
            "reported_total": None,
            "page_size": PAGE_SIZE,
        }

        for page in range(1, MAX_PAGES + 1):
            items, total, raw_page = self.fetch_page(page=page, page_size=PAGE_SIZE)
            meta["pages_requested"] = page

            if meta["reported_total"] is None and total is not None:
                meta["reported_total"] = total

            if not items:
                if page == 1:
                    print("[INFO] page 1 returned no items")
                else:
                    print(f"[INFO] page {page} returned no items, stopping")
                break

            meta["pages_with_data"] += 1
            all_rows.extend(items)
            print(f"[INFO] page={page} fetched={len(items)} total_accumulated={len(all_rows)}")

            # reported_total 기준 종료
            if total is not None and len(all_rows) >= total:
                print(f"[INFO] reached reported total={total}, stopping")
                break

            # 마지막 페이지 추정
            if len(items) < PAGE_SIZE:
                print(f"[INFO] page={page} shorter than page_size, stopping")
                break

            time.sleep(SLEEP_BETWEEN_REQUESTS)

        return all_rows, meta


# =========================================================
# RAW RECORD NORMALIZATION
# =========================================================

def make_raw_record(row: Dict[str, Any], source_key: str, fetched_at: str) -> Dict[str, Any]:
    payload_text = stable_json_dumps(row)
    raw_hash = sha256_text(f"{source_key}:{payload_text}")

    external_id = first_present(
        row,
        [
            "id",
            "ID",
            "bizId",
            "biz_id",
            "b_no",
            "bno",
            "manageNo",
            "manage_no",
            "licenseNo",
            "license_no",
            "storeId",
            "store_id",
        ],
        None,
    )

    title = first_present(
        row,
        [
            "title",
            "shopName",
            "shop_name",
            "bizNm",
            "b_nm",
            "companyName",
            "company_name",
            "name",
        ],
        None,
    )

    region_code = first_present(
        row,
        [
            "regionCode",
            "region_code",
            "sigunguCd",
            "sigungu_cd",
            "admCd",
            "adm_cd",
            "ctprvnCd",
            "ctprvn_cd",
        ],
        None,
    )

    category_code = first_present(
        row,
        [
            "categoryCode",
            "category_code",
            "indsSclsCd",
            "inds_scls_cd",
            "industryCode",
            "industry_code",
        ],
        None,
    )

    occurred_at = first_present(
        row,
        [
            "occurredAt",
            "occurred_at",
            "eventDate",
            "event_date",
            "closeDate",
            "close_date",
            "openDate",
            "open_date",
            "updateDate",
            "update_date",
            "baseDate",
            "base_date",
        ],
        None,
    )

    return {
        "source_key": source_key,
        "external_id": str(external_id) if external_id is not None else None,
        "title": str(title) if title is not None else None,
        "region_code": str(region_code) if region_code is not None else None,
        "category_code": str(category_code) if category_code is not None else None,
        "occurred_at_raw": str(occurred_at) if occurred_at is not None else None,
        "raw_hash": raw_hash,
        "raw_payload": row,
        "fetched_at": fetched_at,
    }


# =========================================================
# PIPELINE
# =========================================================

def begin_source_run(supabase: SupabaseClient, source_key: str) -> int:
    result = supabase.rpc(
        "begin_source_run",
        {
            "p_source_key": source_key,
            "p_started_at": now_iso(),
        },
    )
    if isinstance(result, list) and result:
        row = result[0]
        run_id = row.get("id") or row.get("run_id")
    elif isinstance(result, dict):
        run_id = result.get("id") or result.get("run_id")
    else:
        run_id = result

    if run_id is None:
        raise RuntimeError(f"begin_source_run returned unexpected result: {result}")

    return int(run_id)


def ingest_raw_records_json(
    supabase: SupabaseClient,
    run_id: int,
    raw_records: List[Dict[str, Any]],
) -> Any:
    return supabase.rpc(
        "ingest_raw_records_json",
        {
            "p_source_run_id": run_id,
            "p_records": raw_records,
        },
    )


def finish_source_run(
    supabase: SupabaseClient,
    run_id: int,
    status: str,
    records_fetched: int,
    records_saved: int,
    error_message: Optional[str] = None,
) -> Any:
    payload: Dict[str, Any] = {
        "p_source_run_id": run_id,
        "p_status": status,
        "p_finished_at": now_iso(),
        "p_records_fetched": records_fetched,
        "p_records_saved": records_saved,
    }
    if error_message:
        payload["p_error_message"] = error_message[:4000]

    return supabase.rpc("finish_source_run", payload)


def run_full_ingestion_pipeline(supabase: SupabaseClient, run_id: Optional[int]) -> Any:
    payload: Dict[str, Any] = {}
    if run_id is not None:
        payload["p_source_run_id"] = run_id
    return supabase.rpc("run_full_ingestion_pipeline", payload)


# =========================================================
# MAIN
# =========================================================

def main() -> None:
    require_env("SUPABASE_URL", SUPABASE_URL)
    require_env(
        "SUPABASE_SERVICE_ROLE_KEY or SUPABASE_ANON_KEY",
        SUPABASE_SERVICE_ROLE_KEY or SUPABASE_ANON_KEY,
    )
    require_env("LOCALDATA_BASE_URL", LOCALDATA_BASE_URL)
    require_env("LOCALDATA_API_KEY", LOCALDATA_API_KEY)

    supabase_key = SUPABASE_SERVICE_ROLE_KEY or SUPABASE_ANON_KEY
    supabase = SupabaseClient(
        base_url=SUPABASE_URL,
        api_key=supabase_key,
        schema=SUPABASE_SCHEMA,
    )

    fetcher = LocalDataFetcher(
        base_url=LOCALDATA_BASE_URL,
        api_key=LOCALDATA_API_KEY,
    )

    run_id: Optional[int] = None
    fetched_count = 0
    saved_count = 0

    try:
        run_id = begin_source_run(supabase, SOURCE_KEY)
        print(f"[INFO] source_run_id={run_id}")

        fetched_at = now_iso()
        rows, meta = fetcher.fetch_all()
        fetched_count = len(rows)

        raw_records = [
            make_raw_record(row=row, source_key=SOURCE_KEY, fetched_at=fetched_at)
            for row in rows
        ]

        print(
            "[INFO] fetch summary:",
            json.dumps(
                {
                    "source_key": SOURCE_KEY,
                    "fetched_count": fetched_count,
                    "pages_requested": meta.get("pages_requested"),
                    "pages_with_data": meta.get("pages_with_data"),
                    "reported_total": meta.get("reported_total"),
                },
                ensure_ascii=False,
            ),
        )

        # 대량 적재 chunk
        ingest_results: List[Any] = []
        for idx, batch in enumerate(chunked(raw_records, 500), start=1):
            result = ingest_raw_records_json(supabase, run_id, batch)
            ingest_results.append(result)
            print(f"[INFO] ingest batch={idx} size={len(batch)}")

        # 저장 건수 추정
        # RPC 리턴 형태가 환경별로 다를 수 있어 보수적으로 계산
        saved_count = fetched_count
        if ingest_results:
            inferred_saved = 0
            found_any = False

            for result in ingest_results:
                if isinstance(result, list):
                    for row in result:
                        if isinstance(row, dict):
                            value = first_present(
                                row,
                                ["saved_count", "inserted_count", "upserted_count", "count"],
                                None,
                            )
                            if value is not None:
                                found_any = True
                                try:
                                    inferred_saved += int(value)
                                except Exception:
                                    pass
                elif isinstance(result, dict):
                    value = first_present(
                        result,
                        ["saved_count", "inserted_count", "upserted_count", "count"],
                        None,
                    )
                    if value is not None:
                        found_any = True
                        try:
                            inferred_saved += int(value)
                        except Exception:
                            pass

            if found_any:
                saved_count = inferred_saved

        finish_source_run(
            supabase=supabase,
            run_id=run_id,
            status="success",
            records_fetched=fetched_count,
            records_saved=saved_count,
            error_message=None,
        )

        pipeline_result = run_full_ingestion_pipeline(supabase, run_id)
        print(
            "[INFO] pipeline_result:",
            json.dumps(pipeline_result, ensure_ascii=False, default=str),
        )

        print(
            json.dumps(
                {
                    "ok": True,
                    "source_key": SOURCE_KEY,
                    "source_run_id": run_id,
                    "records_fetched": fetched_count,
                    "records_saved": saved_count,
                },
                ensure_ascii=False,
            )
        )

    except Exception as e:
        error_message = f"{type(e).__name__}: {str(e)}"
        print(f"[ERROR] {error_message}", file=sys.stderr)

        if run_id is not None:
            try:
                finish_source_run(
                    supabase=supabase,
                    run_id=run_id,
                    status="failed",
                    records_fetched=fetched_count,
                    records_saved=saved_count,
                    error_message=error_message,
                )
            except Exception as finish_err:
                print(f"[ERROR] finish_source_run failed: {finish_err}", file=sys.stderr)

        sys.exit(1)


if __name__ == "__main__":
    main()
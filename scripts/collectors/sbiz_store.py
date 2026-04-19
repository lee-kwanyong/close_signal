from __future__ import annotations

import hashlib
import json
import os
import sys
import time
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional, Tuple

import requests
from dotenv import load_dotenv


CURRENT_FILE = Path(__file__).resolve()
PROJECT_ROOT = CURRENT_FILE.parents[2]

load_dotenv(PROJECT_ROOT / ".env.local")
load_dotenv(PROJECT_ROOT / ".env")


SUPABASE_URL = os.getenv("SUPABASE_URL", "").rstrip("/")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
SUPABASE_SCHEMA = os.getenv("SUPABASE_SCHEMA", "public")

SBIZ_API_BASE_URL = os.getenv(
    "SBIZ_API_BASE_URL",
    "http://apis.data.go.kr/B553077/api/open/sdsc2",
).rstrip("/")
SBIZ_API_KEY = os.getenv("SBIZ_API_KEY", "")

SOURCE_KEY = os.getenv("CLOSE_SIGNAL_SOURCE_KEY", "sbiz_store")
PAGE_SIZE = int(os.getenv("SBIZ_PAGE_SIZE", "1000"))
MAX_PAGES = int(os.getenv("SBIZ_MAX_PAGES", "1000"))

REQUEST_TIMEOUT = int(os.getenv("REQUEST_TIMEOUT_SECONDS", "40"))
SLEEP_BETWEEN_REQUESTS = float(os.getenv("SLEEP_BETWEEN_REQUESTS", "0.15"))

SBIZ_ENDPOINT = os.getenv("SBIZ_ENDPOINT", "storeListInRectangle").strip()

SBIZ_DIV_ID = os.getenv("SBIZ_DIV_ID", "").strip()
SBIZ_KEYWORD = os.getenv("SBIZ_KEYWORD", "").strip()
SBIZ_DATE = os.getenv("SBIZ_DATE", "").strip()

SBIZ_MINX = os.getenv("SBIZ_MINX", "126.9700").strip()
SBIZ_MINY = os.getenv("SBIZ_MINY", "37.5600").strip()
SBIZ_MAXX = os.getenv("SBIZ_MAXX", "126.9900").strip()
SBIZ_MAXY = os.getenv("SBIZ_MAXY", "37.5750").strip()

SBIZ_RADIUS = os.getenv("SBIZ_RADIUS", "500").strip()
SBIZ_CX = os.getenv("SBIZ_CX", "126.9783882").strip()
SBIZ_CY = os.getenv("SBIZ_CY", "37.5666103").strip()


session = requests.Session()
session.headers.update(
    {
        "User-Agent": "close-signal-sbiz-collector/1.0",
        "Accept": "application/json, text/plain, */*",
    }
)


def fail(message: str, code: int = 1) -> None:
    print(message, file=sys.stderr)
    sys.exit(code)


def require_env(name: str, value: str) -> None:
    if not value:
        fail(f"[ERROR] Missing required environment variable: {name}")


def now_utc_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def today_yyyymmdd() -> str:
    return datetime.now(timezone.utc).strftime("%Y%m%d")


def today_yyyy_mm_dd() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%d")


def json_dumps_stable(value: Any) -> str:
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"))


def sha256_text(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def first_present(data: Dict[str, Any], keys: Iterable[str], default: Any = None) -> Any:
    for key in keys:
        if key in data and data[key] not in (None, "", [], {}):
            return data[key]
    return default


def chunked(seq: List[Any], size: int) -> Iterable[List[Any]]:
    for i in range(0, len(seq), size):
        yield seq[i : i + size]


@dataclass
class SupabaseClient:
    base_url: str
    api_key: str
    schema: str = "public"

    @property
    def headers(self) -> Dict[str, str]:
        return {
            "apikey": self.api_key,
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
            "Accept": "application/json",
            "Prefer": "return=representation",
        }

    @property
    def rpc_base(self) -> str:
        return f"{self.base_url}/rest/v1/rpc"

    @property
    def rest_base(self) -> str:
        return f"{self.base_url}/rest/v1"

    def rpc(self, fn: str, payload: Dict[str, Any]) -> Any:
        url = f"{self.rpc_base}/{fn}"
        response = session.post(url, headers=self.headers, json=payload, timeout=REQUEST_TIMEOUT)

        if response.status_code >= 400:
            raise RuntimeError(f"Supabase RPC failed: {fn} {response.status_code} {response.text}")

        if not response.text.strip():
            return None

        try:
            return response.json()
        except Exception:
            return response.text

    def get_source_id(self, source_key: str) -> int:
        url = f"{self.rest_base}/sources"
        params = {
            "select": "id,source_key",
            "source_key": f"eq.{source_key}",
            "limit": "1",
        }
        response = session.get(url, headers=self.headers, params=params, timeout=REQUEST_TIMEOUT)

        if response.status_code >= 400:
            raise RuntimeError(f"Supabase source lookup failed: {response.status_code} {response.text}")

        rows = response.json()
        if not rows:
            raise RuntimeError(f"Source not found in public.sources for source_key={source_key}")

        source_id = rows[0].get("id")
        if source_id is None:
            raise RuntimeError(f"Invalid source row for source_key={source_key}: {rows[0]}")

        return int(source_id)


class SbizStoreFetcher:
    def __init__(self, base_url: str, api_key: str, endpoint: str) -> None:
        self.base_url = base_url
        self.api_key = api_key
        self.endpoint = endpoint

    @property
    def request_url(self) -> str:
        return f"{self.base_url}/{self.endpoint}"

    def _build_params(self, page_no: int, num_of_rows: int) -> Dict[str, Any]:
        params: Dict[str, Any] = {
            "serviceKey": self.api_key,
            "pageNo": page_no,
            "numOfRows": num_of_rows,
            "type": "json",
        }

        if self.endpoint == "storeListByDate":
            params["modifiedDate"] = SBIZ_DATE if SBIZ_DATE else today_yyyymmdd()
            if SBIZ_DIV_ID:
                params["divId"] = SBIZ_DIV_ID
            if SBIZ_KEYWORD:
                params["key"] = SBIZ_KEYWORD

        elif self.endpoint == "storeListInRectangle":
            params["minx"] = SBIZ_MINX
            params["miny"] = SBIZ_MINY
            params["maxx"] = SBIZ_MAXX
            params["maxy"] = SBIZ_MAXY

        elif self.endpoint == "storeListInRadius":
            params["radius"] = SBIZ_RADIUS
            params["cx"] = SBIZ_CX
            params["cy"] = SBIZ_CY

        else:
            raise RuntimeError(f"Unsupported SBIZ endpoint for collector: {self.endpoint}")

        return params

    def _extract_rows(self, payload: Any) -> Tuple[List[Dict[str, Any]], Optional[int]]:
        if not isinstance(payload, dict):
            return [], None

        body = payload.get("body", payload)
        if not isinstance(body, dict):
            body = payload

        items = body.get("items")
        total_count = body.get("totalCount")

        rows: List[Dict[str, Any]] = []

        if isinstance(items, list):
            rows = [item for item in items if isinstance(item, dict)]
        elif isinstance(items, dict):
            if "item" in items and isinstance(items["item"], list):
                rows = [item for item in items["item"] if isinstance(item, dict)]
            elif "item" in items and isinstance(items["item"], dict):
                rows = [items["item"]]
            else:
                rows = [items]

        parsed_total: Optional[int] = None
        if total_count is not None:
            try:
                parsed_total = int(total_count)
            except Exception:
                parsed_total = None

        return rows, parsed_total

    def fetch_page(self, page_no: int, num_of_rows: int) -> Tuple[List[Dict[str, Any]], Optional[int], Dict[str, Any]]:
        params = self._build_params(page_no=page_no, num_of_rows=num_of_rows)
        response = session.get(self.request_url, params=params, timeout=REQUEST_TIMEOUT)

        if response.status_code >= 400:
            raise RuntimeError(f"SBIZ request failed: {response.status_code} {response.text[:1000]}")

        try:
            payload = response.json()
        except Exception:
            raise RuntimeError(f"SBIZ response is not valid JSON: {response.text[:1000]}")

        header = payload.get("header", {})
        result_code = str(first_present(header, ["resultCode", "code"], "")).strip()
        result_msg = str(first_present(header, ["resultMsg", "message"], "")).strip()

        if result_code in ("03", "3") or "NODATA_ERROR" in result_msg:
            return [], 0, payload

        if result_code not in ("00", "0", ""):
            raise RuntimeError(f"SBIZ API error: code={result_code}, message={result_msg}")

        rows, total_count = self._extract_rows(payload)
        return rows, total_count, payload

    def fetch_all(self) -> Tuple[List[Dict[str, Any]], Dict[str, Any]]:
        all_rows: List[Dict[str, Any]] = []
        meta: Dict[str, Any] = {
            "pages_requested": 0,
            "pages_with_data": 0,
            "reported_total": None,
            "page_size": PAGE_SIZE,
            "endpoint": self.endpoint,
        }

        for page_no in range(1, MAX_PAGES + 1):
            rows, total_count, _payload = self.fetch_page(page_no=page_no, num_of_rows=PAGE_SIZE)

            meta["pages_requested"] = page_no
            if meta["reported_total"] is None and total_count is not None:
                meta["reported_total"] = total_count

            if not rows:
                if page_no == 1:
                    print("[INFO] page 1 returned no rows")
                else:
                    print(f"[INFO] page {page_no} returned no rows, stopping")
                break

            meta["pages_with_data"] += 1
            all_rows.extend(rows)

            print(f"[INFO] page={page_no} fetched={len(rows)} total_accumulated={len(all_rows)}")

            if total_count is not None and len(all_rows) >= total_count:
                print(f"[INFO] reached reported total={total_count}, stopping")
                break

            if len(rows) < PAGE_SIZE:
                print(f"[INFO] page={page_no} shorter than page_size, stopping")
                break

            time.sleep(SLEEP_BETWEEN_REQUESTS)

        return all_rows, meta


def normalize_sbiz_row(row: Dict[str, Any], fetched_at: str) -> Dict[str, Any]:
    store_id = first_present(row, ["bizesId", "bizesid", "id", "storeId", "storeid"])
    store_name = first_present(row, ["bizesNm", "bizesnm", "storeNm", "storename", "shopName", "name"])
    branch_name = first_present(row, ["brchNm", "brchnm", "branchName"])

    category_large = first_present(row, ["indsLclsCd", "indsLclscd", "indsLargeCd"])
    category_medium = first_present(row, ["indsMclsCd", "indsMclscd", "indsMediumCd"])
    category_small = first_present(row, ["indsSclsCd", "indsSclscd", "indsSmallCd"])

    category_name_large = first_present(row, ["indsLclsNm", "indsLclsnm"])
    category_name_medium = first_present(row, ["indsMclsNm", "indsMclsnm"])
    category_name_small = first_present(row, ["indsSclsNm", "indsSclsnm"])

    address = first_present(row, ["rdnmAdr", "rdnmadr", "lnoAdr", "lnoadr", "address"])
    road_code = first_present(row, ["rdnmCd", "rdnmcd"])
    admin_code = first_present(row, ["adongCd", "adongcd", "ldongCd", "ldongcd", "ctprvnCd", "signguCd"])
    lon = first_present(row, ["lon", "longitude", "x"])
    lat = first_present(row, ["lat", "latitude", "y"])
    standard_date = first_present(row, ["stdrDt", "stdrdt", "modifiedDate", "lastModifiedDate"])

    snapshot_date = str(standard_date).strip() if standard_date not in (None, "") else fetched_at[:10]

    payload_text = json_dumps_stable(row)
    raw_hash = sha256_text(f"{SOURCE_KEY}:{payload_text}")

    title_parts = [str(store_name).strip()] if store_name else []
    if branch_name:
        title_parts.append(str(branch_name).strip())
    title = " ".join([part for part in title_parts if part])

    return {
        "source_key": SOURCE_KEY,
        "external_id": str(store_id) if store_id is not None else None,
        "title": title if title else None,
        "region_code": str(admin_code) if admin_code is not None else None,
        "category_code": str(category_small or category_medium or category_large)
        if (category_small or category_medium or category_large) is not None
        else None,
        "occurred_at_raw": snapshot_date,
        "raw_hash": raw_hash,
        "raw_payload": {
            **row,
            "_normalized": {
                "store_name": store_name,
                "branch_name": branch_name,
                "category_large_code": category_large,
                "category_medium_code": category_medium,
                "category_small_code": category_small,
                "category_large_name": category_name_large,
                "category_medium_name": category_name_medium,
                "category_small_name": category_name_small,
                "address": address,
                "road_code": road_code,
                "admin_code": admin_code,
                "lat": lat,
                "lon": lon,
                "fetched_at": fetched_at,
                "snapshot_date": snapshot_date,
                "endpoint": SBIZ_ENDPOINT,
            },
        },
        "fetched_at": fetched_at,
    }


def begin_source_run(supabase: SupabaseClient, source_id: int, source_key: str) -> int:
    result = supabase.rpc(
        "begin_source_run",
        {
            "p_source_id": source_id,
            "p_request_meta": {
                "source_key": source_key,
                "started_at": now_utc_iso(),
                "endpoint": SBIZ_ENDPOINT,
                "bbox": {
                    "minx": SBIZ_MINX,
                    "miny": SBIZ_MINY,
                    "maxx": SBIZ_MAXX,
                    "maxy": SBIZ_MAXY,
                }
                if SBIZ_ENDPOINT == "storeListInRectangle"
                else None,
                "radius": {
                    "radius": SBIZ_RADIUS,
                    "cx": SBIZ_CX,
                    "cy": SBIZ_CY,
                }
                if SBIZ_ENDPOINT == "storeListInRadius"
                else None,
            },
        },
    )

    if isinstance(result, dict) and "id" in result:
        return int(result["id"])

    if isinstance(result, (int, float, str)):
        return int(result)

    raise RuntimeError(f"begin_source_run returned unexpected result: {result}")


def ingest_raw_records_json(
    supabase: SupabaseClient,
    source_id: int,
    run_id: int,
    records: List[Dict[str, Any]],
) -> Any:
    return supabase.rpc(
        "ingest_raw_records_json",
        {
            "p_source_id": source_id,
            "p_source_run_id": run_id,
            "p_rows": records,
        },
    )


def finish_source_run(
    supabase: SupabaseClient,
    run_id: int,
    status: str,
    records_seen: int,
    records_inserted: int,
    records_skipped: int,
    error_message: Optional[str] = None,
) -> Any:
    return supabase.rpc(
        "finish_source_run",
        {
            "p_run_id": run_id,
            "p_status": status,
            "p_error_message": error_message,
            "p_stats": {
                "records_seen": records_seen,
                "records_inserted": records_inserted,
                "records_skipped": records_skipped,
                "finished_at": now_utc_iso(),
                "endpoint": SBIZ_ENDPOINT,
            },
        },
    )


def infer_saved_count(results: List[Any], fallback: int) -> int:
    saved = 0
    found = False

    for result in results:
        if isinstance(result, list):
            for row in result:
                if isinstance(row, dict):
                    value = first_present(row, ["saved_count", "inserted_count", "upserted_count", "count"])
                    if value is not None:
                        found = True
                        try:
                            saved += int(value)
                        except Exception:
                            pass
        elif isinstance(result, dict):
            value = first_present(result, ["saved_count", "inserted_count", "upserted_count", "count"])
            if value is not None:
                found = True
                try:
                    saved += int(value)
                except Exception:
                    pass

    return saved if found else fallback


def main() -> None:
    require_env("SUPABASE_URL", SUPABASE_URL)
    require_env("SUPABASE_SERVICE_ROLE_KEY", SUPABASE_SERVICE_ROLE_KEY)
    require_env("SBIZ_API_BASE_URL", SBIZ_API_BASE_URL)
    require_env("SBIZ_API_KEY", SBIZ_API_KEY)

    supabase = SupabaseClient(
        base_url=SUPABASE_URL,
        api_key=SUPABASE_SERVICE_ROLE_KEY,
        schema=SUPABASE_SCHEMA,
    )

    source_id = supabase.get_source_id(SOURCE_KEY)
    print(f"[INFO] source_id={source_id}")

    fetcher = SbizStoreFetcher(
        base_url=SBIZ_API_BASE_URL,
        api_key=SBIZ_API_KEY,
        endpoint=SBIZ_ENDPOINT,
    )

    run_id: Optional[int] = None
    records_fetched = 0
    records_saved = 0
    records_skipped = 0

    try:
        run_id = begin_source_run(supabase, source_id=source_id, source_key=SOURCE_KEY)
        print(f"[INFO] source_run_id={run_id}")

        fetched_at = now_utc_iso()
        rows, meta = fetcher.fetch_all()
        records_fetched = len(rows)

        normalized_records = [normalize_sbiz_row(row, fetched_at=fetched_at) for row in rows]

        print(
            "[INFO] fetch summary:",
            json.dumps(
                {
                    "source_key": SOURCE_KEY,
                    "source_id": source_id,
                    "endpoint": meta.get("endpoint"),
                    "fetched_count": records_fetched,
                    "pages_requested": meta.get("pages_requested"),
                    "pages_with_data": meta.get("pages_with_data"),
                    "reported_total": meta.get("reported_total"),
                },
                ensure_ascii=False,
            ),
        )

        ingest_results: List[Any] = []

        if normalized_records:
            for batch_index, batch in enumerate(chunked(normalized_records, 500), start=1):
                result = ingest_raw_records_json(
                    supabase=supabase,
                    source_id=source_id,
                    run_id=run_id,
                    records=batch,
                )
                ingest_results.append(result)
                print(f"[INFO] ingest batch={batch_index} size={len(batch)}")

        records_saved = infer_saved_count(ingest_results, fallback=records_fetched)
        records_skipped = max(records_fetched - records_saved, 0)

        finish_source_run(
            supabase=supabase,
            run_id=run_id,
            status="success",
            records_seen=records_fetched,
            records_inserted=records_saved,
            records_skipped=records_skipped,
            error_message=None,
        )

        print(
            json.dumps(
                {
                    "ok": True,
                    "source_key": SOURCE_KEY,
                    "source_id": source_id,
                    "source_run_id": run_id,
                    "records_fetched": records_fetched,
                    "records_saved": records_saved,
                    "records_skipped": records_skipped,
                },
                ensure_ascii=False,
            )
        )

    except Exception as exc:
        error_message = f"{type(exc).__name__}: {str(exc)}"
        print(f"[ERROR] {error_message}", file=sys.stderr)

        if run_id is not None:
            try:
                finish_source_run(
                    supabase=supabase,
                    run_id=run_id,
                    status="failed",
                    records_seen=records_fetched,
                    records_inserted=records_saved,
                    records_skipped=records_skipped,
                    error_message=error_message,
                )
            except Exception as finish_exc:
                print(f"[ERROR] finish_source_run failed: {finish_exc}", file=sys.stderr)

        sys.exit(1)


if __name__ == "__main__":
    main()
import os
import csv
import json
import math
import time
import requests
from datetime import datetime

# =========================
# 설정값
# =========================

BASE_URL = "https://api.odcloud.kr/api/15061118/v1/uddi:fd1d24b2-4cd4-454c-9168-f60b1eea464f"

# 지금은 2026-01-31 endpoint 기준
REPORT_MONTH = "2026-01-01"
SNAPSHOT_DATE = "2026-01-31"

SERVICE_KEY = os.getenv("DATA_GO_KR_SERVICE_KEY", "").strip()
SUPABASE_URL = os.getenv("SUPABASE_URL", "").strip()
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "").strip()

SCHEMA_NAME = "nts"
TABLE_NAME = "business_status_100_living_industries"

PER_PAGE = 10
UPSERT_BATCH_SIZE = 500

# =========================
# 검증
# =========================

if not SERVICE_KEY:
    raise RuntimeError("환경변수 DATA_GO_KR_SERVICE_KEY 가 비어 있습니다.")

if not SUPABASE_URL:
    raise RuntimeError("환경변수 SUPABASE_URL 가 비어 있습니다.")

if not SUPABASE_SERVICE_ROLE_KEY:
    raise RuntimeError("환경변수 SUPABASE_SERVICE_ROLE_KEY 가 비어 있습니다.")

# =========================
# 1. 국세청 API 수집
# =========================

def fetch_all_rows():
    headers = {
        "accept": "*/*",
        "User-Agent": "Mozilla/5.0",
    }

    all_rows = []
    page = 1

    while True:
        url = f"{BASE_URL}?page={page}&perPage={PER_PAGE}&serviceKey={SERVICE_KEY}"
        resp = requests.get(url, headers=headers, timeout=60)

        print(f"[fetch] page={page}, status={resp.status_code}")

        if resp.status_code != 200:
            print(resp.text)
            resp.raise_for_status()

        payload = resp.json()
        batch = payload.get("data", [])

        if not batch:
            break

        all_rows.extend(batch)

        total_count = payload.get("totalCount")
        current_count = payload.get("currentCount")
        print(
            f"[fetch] batch={len(batch)}, currentCount={current_count}, "
            f"totalCount={total_count}, accumulated={len(all_rows)}"
        )

        if total_count is not None and len(all_rows) >= int(total_count):
            break

        page += 1
        time.sleep(0.05)

    print(f"[fetch] total rows = {len(all_rows)}")
    return all_rows

# =========================
# 2. CSV 저장
# =========================

def save_files(rows):
    raw_json_path = f"nts_{SNAPSHOT_DATE.replace('-', '')}_raw.json"
    csv_path = f"nts_{SNAPSHOT_DATE.replace('-', '')}_from_api.csv"

    with open(raw_json_path, "w", encoding="utf-8") as f:
        json.dump(rows, f, ensure_ascii=False, indent=2)

    fieldnames = [
        "report_month",
        "snapshot_date",
        "industry",
        "sido",
        "sigungu",
        "current_month_count",
        "previous_month_count",
        "same_month_last_year_count",
    ]

    with open(csv_path, "w", encoding="utf-8-sig", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()

        for row in rows:
            writer.writerow({
                "report_month": REPORT_MONTH,
                "snapshot_date": SNAPSHOT_DATE,
                "industry": str(row.get("업종", "")).strip(),
                "sido": str(row.get("시도", "")).strip(),
                "sigungu": str(row.get("시군구", "")).strip(),
                "current_month_count": int(row.get("당월", 0) or 0),
                "previous_month_count": int(row.get("전월", 0) or 0),
                "same_month_last_year_count": int(row.get("전년동월", 0) or 0),
            })

    print(f"[save] saved json: {raw_json_path}")
    print(f"[save] saved csv : {csv_path}")

    return csv_path

# =========================
# 3. CSV 읽기
# =========================

def load_csv(path):
    rows = []
    with open(path, "r", encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f)
        for row in reader:
            rows.append({
                "report_month": row["report_month"],
                "snapshot_date": row["snapshot_date"],
                "industry": row["industry"],
                "sido": row["sido"],
                "sigungu": row["sigungu"],
                "current_month_count": int(row["current_month_count"] or 0),
                "previous_month_count": int(row["previous_month_count"] or 0),
                "same_month_last_year_count": int(row["same_month_last_year_count"] or 0),
            })
    return rows

# =========================
# 4. Supabase Upsert
# =========================

def upsert_to_supabase(rows):
    rest_url = (
        f"{SUPABASE_URL}/rest/v1/{TABLE_NAME}"
        f"?on_conflict=report_month,industry,sido,sigungu"
    )

    headers = {
        "apikey": SUPABASE_SERVICE_ROLE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
        "Content-Type": "application/json",
        "Accept": "application/json",
        "Content-Profile": SCHEMA_NAME,
        "Prefer": "resolution=merge-duplicates,return=representation",
    }

    total_batches = math.ceil(len(rows) / UPSERT_BATCH_SIZE)

    for batch_no in range(total_batches):
        start = batch_no * UPSERT_BATCH_SIZE
        end = start + UPSERT_BATCH_SIZE
        batch = rows[start:end]

        resp = requests.post(
            rest_url,
            headers=headers,
            data=json.dumps(batch, ensure_ascii=False),
            timeout=120,
        )

        print(f"[upsert] batch {batch_no + 1}/{total_batches}, status={resp.status_code}, rows={len(batch)}")

        if resp.status_code not in (200, 201):
            print(resp.text)
            resp.raise_for_status()

    print("[upsert] done")

# =========================
# 실행
# =========================

def main():
    api_rows = fetch_all_rows()
    csv_path = save_files(api_rows)
    rows_for_upsert = load_csv(csv_path)
    upsert_to_supabase(rows_for_upsert)

if __name__ == "__main__":
    main()
import os
import csv
import json
import math
import requests

SUPABASE_URL = os.getenv("SUPABASE_URL", "").strip()
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "").strip()

CSV_PATH = "nts_20260131_from_api.csv"
SCHEMA_NAME = "nts"
TABLE_NAME = "business_status_100_living_industries"
BATCH_SIZE = 500

if not SUPABASE_URL:
    raise RuntimeError("환경변수 SUPABASE_URL 가 비어 있습니다.")

if not SUPABASE_SERVICE_ROLE_KEY:
    raise RuntimeError("환경변수 SUPABASE_SERVICE_ROLE_KEY 가 비어 있습니다.")

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

def load_csv(path: str) -> list[dict]:
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

def chunked(items: list[dict], size: int):
    for i in range(0, len(items), size):
        yield i, items[i:i + size]

def main():
    rows = load_csv(CSV_PATH)
    print(f"loaded rows={len(rows)} from {CSV_PATH}")

    total_batches = math.ceil(len(rows) / BATCH_SIZE)

    for batch_no, (start_idx, batch) in enumerate(chunked(rows, BATCH_SIZE), start=1):
        resp = requests.post(
            rest_url,
            headers=headers,
            data=json.dumps(batch, ensure_ascii=False),
            timeout=120,
        )

        print(f"[batch {batch_no}/{total_batches}] status={resp.status_code} rows={len(batch)}")

        if resp.status_code not in (200, 201):
            print(resp.text)
            resp.raise_for_status()

    print("done")

if __name__ == "__main__":
    main()
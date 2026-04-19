from __future__ import annotations

import json
import math
import os
import re
import sys
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Iterable

import numpy as np
import pandas as pd
import requests
from dotenv import load_dotenv
from sklearn.preprocessing import StandardScaler
from tqdm import tqdm


# =========================
# 환경설정 / 공통 유틸
# =========================

load_dotenv()

DATA_ROOT = Path("data")
RAW_ROOT = DATA_ROOT / "raw"
PROCESSED_ROOT = DATA_ROOT / "processed"
OUTPUT_ROOT = Path("output")

for p in [
    RAW_ROOT / "nts_active",
    RAW_ROOT / "nts_newbiz",
    RAW_ROOT / "sbiz",
    RAW_ROOT / "nts_status",
    PROCESSED_ROOT,
    OUTPUT_ROOT,
]:
    p.mkdir(parents=True, exist_ok=True)

SERVICE_KEY = os.getenv("PUBLIC_DATA_SERVICE_KEY", "").strip()
NTS_ACTIVE_API_URL = os.getenv(
    "NTS_ACTIVE_API_URL",
    "https://api.odcloud.kr/api/15061118/v1/uddi:0e884dcb-88bd-4ec0-82b0-bd7c590a1cdb",
).strip()
NTS_STATUS_API_URL = os.getenv(
    "NTS_STATUS_API_URL",
    "https://api.odcloud.kr/api/nts-businessman/v1/status",
).strip()
SBIZ_STORE_API_URL = os.getenv("SBIZ_STORE_API_URL", "").strip()
USER_AGENT = os.getenv("USER_AGENT", "Mozilla/5.0").strip()

DEFAULT_HEADERS = {
    "User-Agent": USER_AGENT,
    "Accept": "application/json, text/plain, */*",
}


def log(msg: str) -> None:
    print(f"[LOG] {msg}")


def require_service_key() -> None:
    if not SERVICE_KEY:
        raise RuntimeError(
            "PUBLIC_DATA_SERVICE_KEY가 비어 있습니다. .env에 공공데이터포털 일반 인증키(디코딩키)를 넣어주세요."
        )


def safe_float(x: Any) -> float:
    if x is None:
        return np.nan
    if isinstance(x, (int, float, np.number)):
        return float(x)
    s = str(x).strip().replace(",", "")
    if s == "":
        return np.nan
    try:
        return float(s)
    except ValueError:
        return np.nan


def normalize_text(x: Any) -> str:
    if pd.isna(x):
        return ""
    s = str(x).strip()
    s = re.sub(r"\s+", " ", s)
    return s


def guess_column(df: pd.DataFrame, candidates: list[str]) -> str | None:
    lower_map = {c.lower(): c for c in df.columns}
    for cand in candidates:
        if cand.lower() in lower_map:
            return lower_map[cand.lower()]
    return None


def sigmoid(x: np.ndarray | float) -> np.ndarray | float:
    return 1.0 / (1.0 + np.exp(-x))


# =========================
# 1. 국세청 사업자현황 100대 생활업종
#    - 월간 집계 자동변환 OpenAPI
# =========================

@dataclass
class NTSActiveIndustryClient:
    base_url: str = NTS_ACTIVE_API_URL
    service_key: str = SERVICE_KEY

    def fetch_all(self, per_page: int = 2000, max_pages: int = 1000) -> pd.DataFrame:
        """
        공공데이터포털 자동변환 OpenAPI 방식으로 전체 페이지를 수집.
        """
        require_service_key()

        rows: list[dict[str, Any]] = []
        session = requests.Session()
        session.headers.update(DEFAULT_HEADERS)

        for page in range(1, max_pages + 1):
            params = {
                "page": page,
                "perPage": per_page,
                "returnType": "JSON",
                "serviceKey": self.service_key,
            }
            resp = session.get(self.base_url, params=params, timeout=60)
            resp.raise_for_status()
            payload = resp.json()

            data = payload.get("data", [])
            if not data:
                break

            rows.extend(data)
            total_count = payload.get("totalCount", None)
            log(f"NTS active page={page} rows={len(data)} total={total_count}")

            if total_count is not None and len(rows) >= int(total_count):
                break

            time.sleep(0.1)

        if not rows:
            raise RuntimeError("국세청 사업자현황 OpenAPI에서 데이터를 받지 못했습니다.")

        df = pd.DataFrame(rows)
        out = RAW_ROOT / "nts_active" / "nts_active_api_raw.parquet"
        df.to_parquet(out, index=False)
        log(f"saved: {out}")
        return df

    def normalize(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        컬럼명이 시점별로 약간 달라질 수 있어서 후보군 기반으로 표준화.
        """
        col_region = guess_column(df, ["시도명", "시도", "ctprvnNm"])
        col_sigungu = guess_column(df, ["시군구명", "시군구", "sigunguNm"])
        col_industry = guess_column(df, ["생활업종명", "업종명", "indsLclsNm", "indsMclsNm", "serviceNm"])
        col_biz_type = guess_column(df, ["사업자구분", "사업자종류", "bizTypeNm"])
        col_year = guess_column(df, ["기준연도", "연도", "stdrYr"])
        col_month = guess_column(df, ["기준월", "월", "stdrMt"])
        col_date = guess_column(df, ["기준년월", "기준월일", "stdrYm"])
        col_value = guess_column(df, ["사업자수", "가동사업자수", "count", "cnt"])

        missing = [x for x in [col_region, col_sigungu, col_industry, col_value] if x is None]
        if missing:
            raise RuntimeError(
                f"필수 컬럼을 찾지 못했습니다. 실제 컬럼명을 확인하세요. columns={list(df.columns)}"
            )

        out = pd.DataFrame()
        out["sido"] = df[col_region].map(normalize_text)
        out["sigungu"] = df[col_sigungu].map(normalize_text)
        out["industry"] = df[col_industry].map(normalize_text)
        out["biz_type"] = df[col_biz_type].map(normalize_text) if col_biz_type else ""
        out["active_count"] = df[col_value].map(safe_float)

        if col_date:
            out["ym"] = (
                df[col_date]
                .astype(str)
                .str.extract(r"(\d{6})", expand=False)
            )
        else:
            yy = df[col_year].astype(str).str.extract(r"(\d{4})", expand=False) if col_year else None
            mm = df[col_month].astype(str).str.extract(r"(\d{1,2})", expand=False).str.zfill(2) if col_month else None
            if yy is None or mm is None:
                raise RuntimeError("기준년월 컬럼을 조합할 수 없습니다.")
            out["ym"] = yy + mm

        out["ym"] = pd.to_datetime(out["ym"], format="%Y%m", errors="coerce")
        out = out.dropna(subset=["ym", "active_count"]).copy()

        # 합계/전국 행 제거
        for c in ["sido", "sigungu", "industry"]:
            out = out[~out[c].str.contains("합계|전국|전체", na=False)]

        out = (
            out.groupby(["ym", "sido", "sigungu", "industry", "biz_type"], dropna=False, as_index=False)
            .agg(active_count=("active_count", "sum"))
            .sort_values(["industry", "sido", "sigungu", "biz_type", "ym"])
        )

        norm_path = PROCESSED_ROOT / "nts_active_normalized.parquet"
        out.to_parquet(norm_path, index=False)
        log(f"saved: {norm_path}")
        return out


# =========================
# 2. 국세청 신규사업자 현황(TASIS 링크형 XLSX)
#    - data.go.kr에서 Tasis URL을 안내
#    - 실제 다운로드는 Tasis 웹 UI에서 발생할 수 있음
# =========================

class TasisNewBizCrawler:
    """
    Playwright로 Tasis 페이지에 접속해 엑셀 다운로드를 시도.
    페이지 구조가 바뀌면 selector 수정 필요.
    """

    TATIS_MONTHLY_URL = (
        "https://tasis.nts.go.kr/websquare/websquare.html"
        "?w2xPath=/ui/ep/e/a/UTWEPEAA02.xml&sttPblYr=2025&sttsMtaInfrId=20250103I01202521475"
    )

    TATIS_REGIONAL_URL = (
        "https://tasis.nts.go.kr/websquare/websquare.html"
        "?w2xPath=/ui/ep/e/a/UTWEPEAA02.xml&sttPblYr=2025&sttsMtaInfrId=20250103I01202521474"
    )

    def download_with_playwright(
        self,
        url: str,
        save_dir: Path,
        filename_prefix: str,
        headless: bool = True,
    ) -> Path:
        """
        엑셀 / 다운로드 버튼 텍스트를 순차 클릭해 다운로드 이벤트를 잡는다.
        """
        try:
            from playwright.sync_api import sync_playwright, TimeoutError as PWTimeoutError
        except ImportError as e:
            raise RuntimeError("playwright가 설치되어 있지 않습니다. pip install playwright 후 playwright install chromium 실행") from e

        save_dir.mkdir(parents=True, exist_ok=True)

        candidates = [
            "text=엑셀",
            "text=Excel",
            "text=XLSX",
            "text=다운로드",
            "text=파일다운로드",
            "button:has-text('엑셀')",
            "button:has-text('다운로드')",
            "[title*='엑셀']",
            "[title*='다운로드']",
            "[aria-label*='엑셀']",
            "[aria-label*='다운로드']",
        ]

        with sync_playwright() as p:
            browser = p.chromium.launch(headless=headless)
            context = browser.new_context(accept_downloads=True)
            page = context.new_page()
            page.goto(url, wait_until="networkidle", timeout=120000)

            download_obj = None
            last_err = None

            for sel in candidates:
                try:
                    with page.expect_download(timeout=8000) as download_info:
                        page.locator(sel).first.click()
                    download_obj = download_info.value
                    break
                except Exception as e:
                    last_err = e

            if download_obj is None:
                browser.close()
                raise RuntimeError(
                    f"TASIS 다운로드 버튼 자동 클릭 실패. selector를 업데이트해야 할 수 있습니다. last_error={last_err}"
                )

            suggested = download_obj.suggested_filename
            ext = Path(suggested).suffix or ".xlsx"
            out_path = save_dir / f"{filename_prefix}{ext}"
            download_obj.save_as(str(out_path))
            browser.close()
            log(f"saved: {out_path}")
            return out_path

    def normalize_monthly(self, xlsx_path: Path) -> pd.DataFrame:
        """
        월별 신규사업자 엑셀 정규화.
        실제 컬럼명은 시점별로 다를 수 있으므로 최대한 유연하게 처리.
        """
        df = pd.read_excel(xlsx_path)

        col_industry = guess_column(df, ["업종명", "생활업종명"])
        col_month = guess_column(df, ["월", "기준월"])
        col_year = guess_column(df, ["연도", "기준연도"])
        col_count = guess_column(df, ["신규사업자수", "사업자수", "건수", "인원", "count", "cnt"])

        if col_industry is None or col_count is None:
            raise RuntimeError(f"월별 신규사업자 엑셀 컬럼 확인 필요: {list(df.columns)}")

        out = pd.DataFrame()
        out["industry"] = df[col_industry].map(normalize_text)
        out["newbiz_count"] = df[col_count].map(safe_float)

        if col_year and col_month:
            yy = df[col_year].astype(str).str.extract(r"(\d{4})", expand=False)
            mm = df[col_month].astype(str).str.extract(r"(\d{1,2})", expand=False).str.zfill(2)
            out["ym"] = pd.to_datetime(yy + mm, format="%Y%m", errors="coerce")
        else:
            # 연도/월이 없으면 파일명에서 추정
            year_match = re.search(r"(20\d{2})", xlsx_path.name)
            year = year_match.group(1) if year_match else "2025"
            if col_month:
                mm = df[col_month].astype(str).str.extract(r"(\d{1,2})", expand=False).str.zfill(2)
                out["ym"] = pd.to_datetime(year + mm, format="%Y%m", errors="coerce")
            else:
                raise RuntimeError("월별 신규사업자 파일에서 연/월 정보를 찾지 못했습니다.")

        out = out.dropna(subset=["ym", "newbiz_count"]).copy()
        out = out[~out["industry"].str.contains("합계|전체", na=False)]
        out = (
            out.groupby(["ym", "industry"], as_index=False)
            .agg(newbiz_count=("newbiz_count", "sum"))
            .sort_values(["industry", "ym"])
        )

        out_path = PROCESSED_ROOT / "nts_newbiz_monthly_normalized.parquet"
        out.to_parquet(out_path, index=False)
        log(f"saved: {out_path}")
        return out


# =========================
# 3. 국세청 사업자등록 상태조회
#    - 1회 최대 100건
# =========================

@dataclass
class NTSBusinessStatusClient:
    base_url: str = NTS_STATUS_API_URL
    service_key: str = SERVICE_KEY

    def fetch_status(self, biz_numbers: list[str]) -> pd.DataFrame:
        require_service_key()

        if not biz_numbers:
            return pd.DataFrame(columns=["b_no", "b_stt", "tax_type", "end_dt"])

        cleaned = [re.sub(r"[^0-9]", "", x) for x in biz_numbers]
        cleaned = [x for x in cleaned if len(x) == 10]

        chunks = [cleaned[i:i + 100] for i in range(0, len(cleaned), 100)]

        session = requests.Session()
        session.headers.update({
            **DEFAULT_HEADERS,
            "Content-Type": "application/json; charset=utf-8",
        })

        rows: list[dict[str, Any]] = []

        for idx, chunk in enumerate(tqdm(chunks, desc="nts_status")):
            url = f"{self.base_url}?serviceKey={self.service_key}"
            body = {"b_no": chunk}
            resp = session.post(url, data=json.dumps(body), timeout=60)
            resp.raise_for_status()
            payload = resp.json()

            # result key 구조가 변경될 수 있어 방어적으로 처리
            data = payload.get("data", []) or payload.get("match_cnt", [])
            if isinstance(data, list):
                rows.extend(data)
            else:
                rows.append(payload)

            time.sleep(0.15)
            log(f"NTS status chunk={idx+1}/{len(chunks)} size={len(chunk)}")

        df = pd.DataFrame(rows)
        out = RAW_ROOT / "nts_status" / "nts_status_raw.parquet"
        df.to_parquet(out, index=False)
        log(f"saved: {out}")
        return df

    def normalize(self, df: pd.DataFrame) -> pd.DataFrame:
        col_bno = guess_column(df, ["b_no", "사업자등록번호"])
        col_status = guess_column(df, ["b_stt", "상태", "사업자상태"])
        col_tax = guess_column(df, ["tax_type", "과세유형"])
        col_end = guess_column(df, ["end_dt", "폐업일자"])

        if col_bno is None:
            raise RuntimeError(f"상태조회 응답 컬럼 확인 필요: {list(df.columns)}")

        out = pd.DataFrame()
        out["biz_no"] = df[col_bno].astype(str).str.replace(r"[^0-9]", "", regex=True)
        out["biz_status"] = df[col_status].map(normalize_text) if col_status else ""
        out["tax_type"] = df[col_tax].map(normalize_text) if col_tax else ""
        out["end_date"] = pd.to_datetime(df[col_end], errors="coerce") if col_end else pd.NaT

        out["closed_flag"] = out["biz_status"].str.contains("폐업", na=False).astype(int)
        out["suspended_flag"] = out["biz_status"].str.contains("휴업", na=False).astype(int)

        out_path = PROCESSED_ROOT / "nts_status_normalized.parquet"
        out.to_parquet(out_path, index=False)
        log(f"saved: {out_path}")
        return out


# =========================
# 4. 소상공인 상가(상권)정보
#    - 전국 파일 CSV를 로드해서 밀도 계산
# =========================

class SbizStoreLoader:
    def load_csv(self, csv_path: Path, encoding_candidates: list[str] | None = None) -> pd.DataFrame:
        if encoding_candidates is None:
            encoding_candidates = ["utf-8", "cp949", "euc-kr"]

        last_err = None
        for enc in encoding_candidates:
            try:
                df = pd.read_csv(csv_path, encoding=enc, low_memory=False)
                log(f"loaded sbiz csv with encoding={enc}: {csv_path}")
                return df
            except Exception as e:
                last_err = e

        raise RuntimeError(f"상가(상권) CSV 로드 실패: {csv_path}, last_error={last_err}")

    def normalize(self, df: pd.DataFrame) -> pd.DataFrame:
        col_store_id = guess_column(df, ["상가업소번호", "상가업소No", "storeId"])
        col_name = guess_column(df, ["상호명", "상호", "bizesNm"])
        col_sido = guess_column(df, ["시도명", "시도", "ctprvnNm"])
        col_sigungu = guess_column(df, ["시군구명", "시군구", "signguNm"])
        col_ind_code = guess_column(df, ["상권업종소분류코드", "상권업종코드", "indsSclsCd"])
        col_ind_name = guess_column(df, ["상권업종소분류명", "상권업종명", "indsSclsNm"])
        col_lon = guess_column(df, ["경도", "lon", "longitude"])
        col_lat = guess_column(df, ["위도", "lat", "latitude"])

        req = [col_store_id, col_sido, col_sigungu, col_ind_name, col_lon, col_lat]
        if any(x is None for x in req):
            raise RuntimeError(f"상권 CSV 컬럼 확인 필요: {list(df.columns)}")

        out = pd.DataFrame()
        out["store_id"] = df[col_store_id].astype(str)
        out["store_name"] = df[col_name].map(normalize_text) if col_name else ""
        out["sido"] = df[col_sido].map(normalize_text)
        out["sigungu"] = df[col_sigungu].map(normalize_text)
        out["industry_code"] = df[col_ind_code].map(normalize_text) if col_ind_code else ""
        out["industry_name"] = df[col_ind_name].map(normalize_text)
        out["lon"] = df[col_lon].map(safe_float)
        out["lat"] = df[col_lat].map(safe_float)

        out = out.dropna(subset=["lon", "lat"]).copy()

        out_path = PROCESSED_ROOT / "sbiz_store_normalized.parquet"
        out.to_parquet(out_path, index=False)
        log(f"saved: {out_path}")
        return out


# =========================
# 5. 시그널 생성
# =========================

class ClosingSignalBuilder:
    def build_region_industry_features(
        self,
        nts_active_df: pd.DataFrame,
        nts_newbiz_df: pd.DataFrame | None = None,
        sbiz_df: pd.DataFrame | None = None,
    ) -> pd.DataFrame:
        """
        목표:
        - 지역(시도/시군구) x 업종 x 월 단위 피처 생성
        """

        base = nts_active_df.copy()
        base = base.sort_values(["industry", "sido", "sigungu", "biz_type", "ym"]).copy()

        grp_keys = ["industry", "sido", "sigungu", "biz_type"]

        base["active_count_lag1"] = base.groupby(grp_keys)["active_count"].shift(1)
        base["active_count_lag12"] = base.groupby(grp_keys)["active_count"].shift(12)

        base["active_mom"] = (base["active_count"] / base["active_count_lag1"]) - 1.0
        base["active_yoy"] = (base["active_count"] / base["active_count_lag12"]) - 1.0

        feature = base.copy()

        if nts_newbiz_df is not None and not nts_newbiz_df.empty:
            # 신규사업자는 업종+월 레벨이어서 전국 업종 지표로 먼저 붙임
            nb = nts_newbiz_df.copy().sort_values(["industry", "ym"])
            nb["newbiz_lag12"] = nb.groupby(["industry"])["newbiz_count"].shift(12)
            nb["newbiz_yoy"] = (nb["newbiz_count"] / nb["newbiz_lag12"]) - 1.0

            feature = feature.merge(
                nb[["ym", "industry", "newbiz_count", "newbiz_yoy"]],
                on=["ym", "industry"],
                how="left",
            )
        else:
            feature["newbiz_count"] = np.nan
            feature["newbiz_yoy"] = np.nan

        if sbiz_df is not None and not sbiz_df.empty:
            density = (
                sbiz_df.groupby(["sido", "sigungu", "industry_name"], as_index=False)
                .agg(local_store_count=("store_id", "nunique"))
                .rename(columns={"industry_name": "industry"})
            )
            density["district_competition_rank"] = density.groupby(
                ["sido", "sigungu"]
            )["local_store_count"].rank(ascending=False, method="dense")

            feature = feature.merge(
                density,
                on=["sido", "sigungu", "industry"],
                how="left",
            )
        else:
            feature["local_store_count"] = np.nan
            feature["district_competition_rank"] = np.nan

        out = feature.sort_values(["ym", "sido", "sigungu", "industry", "biz_type"]).copy()
        out_path = PROCESSED_ROOT / "closing_features_region_industry.parquet"
        out.to_parquet(out_path, index=False)
        log(f"saved: {out_path}")
        return out

    def score_region_industry(self, feature_df: pd.DataFrame) -> pd.DataFrame:
        df = feature_df.copy()

        # 리스크 방향 정리
        df["risk_active_mom"] = -df["active_mom"]
        df["risk_active_yoy"] = -df["active_yoy"]
        df["risk_newbiz_yoy"] = -df["newbiz_yoy"]

        z_cols = [
            "risk_active_mom",
            "risk_active_yoy",
            "risk_newbiz_yoy",
            "local_store_count",
            "district_competition_rank",
        ]

        # 월별 단면 표준화
        for c in z_cols:
            z_name = f"z_{c}"
            df[z_name] = np.nan
            for ym, idx in df.groupby("ym").groups.items():
                sub = df.loc[idx, c].astype(float)
                valid = sub.notna()
                if valid.sum() < 2:
                    continue
                scaler = StandardScaler()
                z = np.full(len(sub), np.nan)
                z_valid = scaler.fit_transform(sub[valid].to_numpy().reshape(-1, 1)).reshape(-1)
                z[np.where(valid)[0]] = z_valid
                df.loc[idx, z_name] = z

        # 기본 시그널
        df["close_risk_base_raw"] = (
            0.40 * df["z_risk_active_mom"].fillna(0.0)
            + 0.25 * df["z_risk_active_yoy"].fillna(0.0)
            + 0.20 * df["z_risk_newbiz_yoy"].fillna(0.0)
        )

        # 경쟁 보정
        df["competition_pressure_raw"] = (
            0.70 * df["z_local_store_count"].fillna(0.0)
            + 0.30 * df["z_district_competition_rank"].fillna(0.0)
        )

        df["final_close_signal_raw"] = (
            0.75 * df["close_risk_base_raw"]
            + 0.25 * df["competition_pressure_raw"]
        )

        df["final_close_signal"] = sigmoid(df["final_close_signal_raw"])
        df["close_grade"] = pd.cut(
            df["final_close_signal"],
            bins=[-np.inf, 0.35, 0.60, 0.80, np.inf],
            labels=["LOW", "MID", "HIGH", "SEVERE"],
        )

        out_path = OUTPUT_ROOT / "closing_signal_region_industry.csv"
        df.to_csv(out_path, index=False, encoding="utf-8-sig")
        log(f"saved: {out_path}")
        return df

    def apply_micro_override(
        self,
        scored_df: pd.DataFrame,
        status_df: pd.DataFrame,
        business_master_df: pd.DataFrame,
        join_key: str = "biz_no",
    ) -> pd.DataFrame:
        """
        business_master_df 예시 컬럼:
        - biz_no
        - ym
        - sido
        - sigungu
        - industry
        - biz_type
        """
        req = {"biz_no", "ym", "sido", "sigungu", "industry", "biz_type"}
        if not req.issubset(set(business_master_df.columns)):
            raise RuntimeError(f"business_master_df 컬럼 필요: {req}")

        region = scored_df[
            ["ym", "sido", "sigungu", "industry", "biz_type", "final_close_signal", "close_grade"]
        ].copy()

        master = business_master_df.copy()
        master["ym"] = pd.to_datetime(master["ym"])
        master["biz_no"] = master["biz_no"].astype(str).str.replace(r"[^0-9]", "", regex=True)

        st = status_df.copy()
        st["biz_no"] = st["biz_no"].astype(str).str.replace(r"[^0-9]", "", regex=True)

        out = master.merge(
            region,
            on=["ym", "sido", "sigungu", "industry", "biz_type"],
            how="left",
        ).merge(
            st[["biz_no", "closed_flag", "suspended_flag", "biz_status", "tax_type", "end_date"]],
            on="biz_no",
            how="left",
        )

        out["final_close_signal_overridden"] = out["final_close_signal"]

        # 강제 보정
        out.loc[out["closed_flag"] == 1, "final_close_signal_overridden"] = 1.0
        out.loc[
            (out["closed_flag"] != 1) & (out["suspended_flag"] == 1),
            "final_close_signal_overridden"
        ] = 0.85

        out["close_grade_overridden"] = pd.cut(
            out["final_close_signal_overridden"],
            bins=[-np.inf, 0.35, 0.60, 0.80, np.inf],
            labels=["LOW", "MID", "HIGH", "SEVERE"],
        )

        out_path = OUTPUT_ROOT / "closing_signal_micro_override.csv"
        out.to_csv(out_path, index=False, encoding="utf-8-sig")
        log(f"saved: {out_path}")
        return out


# =========================
# 6. 실행 함수
# =========================

def run_active_pipeline() -> pd.DataFrame:
    client = NTSActiveIndustryClient()
    raw = client.fetch_all()
    norm = client.normalize(raw)
    return norm


def run_newbiz_pipeline() -> pd.DataFrame:
    crawler = TasisNewBizCrawler()

    # 월별 파일 다운로드 시도
    out_xlsx = crawler.download_with_playwright(
        url=crawler.TATIS_MONTHLY_URL,
        save_dir=RAW_ROOT / "nts_newbiz",
        filename_prefix="nts_newbiz_monthly",
        headless=True,
    )
    return crawler.normalize_monthly(out_xlsx)


def run_status_pipeline(biz_numbers: list[str]) -> pd.DataFrame:
    client = NTSBusinessStatusClient()
    raw = client.fetch_status(biz_numbers)
    norm = client.normalize(raw)
    return norm


def run_sbiz_pipeline(csv_path: str) -> pd.DataFrame:
    loader = SbizStoreLoader()
    raw = loader.load_csv(Path(csv_path))
    norm = loader.normalize(raw)
    return norm


def run_full_region_signal(sbiz_csv_path: str | None = None) -> pd.DataFrame:
    nts_active = run_active_pipeline()

    try:
        nts_newbiz = run_newbiz_pipeline()
    except Exception as e:
        log(f"신규사업자 월별 다운로드/정규화 실패. 이 단계는 스킵합니다. error={e}")
        nts_newbiz = pd.DataFrame()

    if sbiz_csv_path:
        sbiz_df = run_sbiz_pipeline(sbiz_csv_path)
    else:
        sbiz_df = pd.DataFrame()

    builder = ClosingSignalBuilder()
    feature = builder.build_region_industry_features(
        nts_active_df=nts_active,
        nts_newbiz_df=nts_newbiz,
        sbiz_df=sbiz_df,
    )
    scored = builder.score_region_industry(feature)
    return scored


def demo_micro_override(
    business_master_csv_path: str,
    biz_no_column: str = "biz_no",
) -> pd.DataFrame:
    scored_path = OUTPUT_ROOT / "closing_signal_region_industry.csv"
    if not scored_path.exists():
        raise RuntimeError("먼저 run_full_region_signal()을 실행해서 지역×업종 시그널을 생성하세요.")

    business_master = pd.read_csv(business_master_csv_path)
    biz_numbers = (
        business_master[biz_no_column]
        .astype(str)
        .str.replace(r"[^0-9]", "", regex=True)
        .tolist()
    )

    status_df = run_status_pipeline(biz_numbers)
    scored_df = pd.read_csv(scored_path)
    scored_df["ym"] = pd.to_datetime(scored_df["ym"])
    business_master["ym"] = pd.to_datetime(business_master["ym"])

    builder = ClosingSignalBuilder()
    out = builder.apply_micro_override(
        scored_df=scored_df,
        status_df=status_df,
        business_master_df=business_master,
    )
    return out


# =========================
# 7. CLI
# =========================

def main() -> None:
    """
    예시:
    python closing_signal_pipeline.py run_region --sbiz_csv "data/raw/sbiz/store.csv"
    python closing_signal_pipeline.py run_status --biz_no 1234567890 1111111111
    python closing_signal_pipeline.py run_micro --business_master_csv "business_master.csv"
    """
    if len(sys.argv) < 2:
        print(
            "usage:\n"
            "  python closing_signal_pipeline.py run_region [--sbiz_csv path]\n"
            "  python closing_signal_pipeline.py run_status --biz_no 1234567890 1111111111\n"
            "  python closing_signal_pipeline.py run_micro --business_master_csv business_master.csv\n"
        )
        sys.exit(1)

    cmd = sys.argv[1]

    if cmd == "run_region":
        sbiz_csv = None
        if "--sbiz_csv" in sys.argv:
            sbiz_csv = sys.argv[sys.argv.index("--sbiz_csv") + 1]
        run_full_region_signal(sbiz_csv_path=sbiz_csv)

    elif cmd == "run_status":
        if "--biz_no" not in sys.argv:
            raise RuntimeError("--biz_no 뒤에 사업자번호들을 넣으세요.")
        idx = sys.argv.index("--biz_no")
        biz_nos = sys.argv[idx + 1:]
        run_status_pipeline(biz_nos)

    elif cmd == "run_micro":
        if "--business_master_csv" not in sys.argv:
            raise RuntimeError("--business_master_csv 경로를 넣으세요.")
        csv_path = sys.argv[sys.argv.index("--business_master_csv") + 1]
        demo_micro_override(csv_path)

    else:
        raise RuntimeError(f"unknown command: {cmd}")


if __name__ == "__main__":
    main()
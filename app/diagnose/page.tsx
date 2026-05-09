"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

const INDUSTRY_OPTIONS = [
  { value: "restaurant", label: "음식점", industryName: "일반 음식점" },
  { value: "cafe", label: "카페", industryName: "카페" },
  { value: "beauty", label: "미용/뷰티", industryName: "미용업" },
  { value: "academy", label: "학원/교육", industryName: "교육 서비스" },
  { value: "clinic", label: "병원/클리닉", industryName: "전문 서비스" },
  { value: "retail", label: "소매점", industryName: "소매업" },
  { value: "service", label: "서비스업", industryName: "생활 서비스" }
];

type DiagnoseFormState = {
  businessName: string;
  businessNumber: string;
  address: string;
  industryGroup: string;
  customerGoal: string;
  mainProducts: string;
  targetCustomer: string;
};

export default function DiagnosePage() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<DiagnoseFormState>({
    businessName: "",
    businessNumber: "",
    address: "",
    industryGroup: "restaurant",
    customerGoal: "지도 노출과 리뷰를 개선하고 싶어요.",
    mainProducts: "",
    targetCustomer: ""
  });

  const selectedIndustry = useMemo(
    () => INDUSTRY_OPTIONS.find((option) => option.value === form.industryGroup) ?? INDUSTRY_OPTIONS[0],
    [form.industryGroup]
  );

  function update<K extends keyof DiagnoseFormState>(key: K, value: DiagnoseFormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!form.businessName.trim()) {
      setError("상호명을 입력해주세요.");
      return;
    }

    if (!form.address.trim()) {
      setError("주소를 입력해주세요.");
      return;
    }

    setBusy(true);

    try {
      const createResponse = await fetch("/api/v1/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          business_number: form.businessNumber.trim() || undefined,
          business_name: form.businessName.trim(),
          industry_name: selectedIndustry.industryName,
          industry_group: selectedIndustry.value,
          address: form.address.trim(),
          road_address: form.address.trim(),
          store_count: 1
        })
      });

      const createEnvelope = await createResponse.json();

      if (!createResponse.ok || !createEnvelope.success) {
        throw new Error(createEnvelope?.error?.message ?? "고객 생성에 실패했습니다.");
      }

      const customerId = createEnvelope.data.customer_id as string;

      await fetch(`/api/v1/customers/${customerId}/profile`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          store_type: "offline",
          main_channel: "naver_place",
          customer_goal: form.customerGoal,
          target_customer: form.targetCustomer,
          main_products: form.mainProducts,
          differentiation_keywords: []
        })
      });

      if (form.businessNumber.trim()) {
        sessionStorage.setItem(`business_number:${customerId}`, form.businessNumber.trim());
      }

      router.push(`/analyzing?customerId=${encodeURIComponent(customerId)}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "진단 시작 중 오류가 발생했습니다.");
      setBusy(false);
    }
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        padding: "46px 24px",
        background:
          "radial-gradient(circle at top left, rgba(51,92,255,0.10), transparent 34%), #f6f7fb"
      }}
    >
      <section style={{ maxWidth: 1120, margin: "0 auto", display: "grid", gap: 22 }}>
        <div className="topbar">
          <div>
            <div className="eyebrow">Start Diagnosis</div>
            <h1>내 가게 성장 진단 시작하기</h1>
            <p className="subtle">
              상호명, 주소, 업종만 입력하면 상권·경쟁·지도 노출을 분석하고 성장 미션을 생성합니다.
            </p>
          </div>
          <a className="btn" href="/">홈으로</a>
        </div>

        <div className="grid two">
          <form className="card" onSubmit={submit}>
            <h2>기본 정보</h2>
            <p>데모 단계에서는 입력값을 기반으로 mock/공개데이터 sync가 실행됩니다.</p>

            <div style={{ display: "grid", gap: 14, marginTop: 18 }}>
              <label className="form-label">
                <span>상호명 *</span>
                <input
                  className="input"
                  value={form.businessName}
                  onChange={(event) => update("businessName", event.target.value)}
                  placeholder="예: 성수 파스타"
                />
              </label>

              <label className="form-label">
                <span>사업자등록번호 선택</span>
                <input
                  className="input"
                  value={form.businessNumber}
                  onChange={(event) => update("businessNumber", event.target.value.replace(/[^0-9]/g, ""))}
                  placeholder="숫자만 입력"
                  maxLength={10}
                />
              </label>

              <label className="form-label">
                <span>주소 *</span>
                <input
                  className="input"
                  value={form.address}
                  onChange={(event) => update("address", event.target.value)}
                  placeholder="예: 서울 성동구 성수동"
                />
              </label>

              <label className="form-label">
                <span>업종</span>
                <select
                  className="input"
                  value={form.industryGroup}
                  onChange={(event) => update("industryGroup", event.target.value)}
                >
                  {INDUSTRY_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="form-label">
                <span>대표 상품/서비스</span>
                <input
                  className="input"
                  value={form.mainProducts}
                  onChange={(event) => update("mainProducts", event.target.value)}
                  placeholder="예: 파스타, 리조또, 와인"
                />
              </label>

              <label className="form-label">
                <span>주요 고객층</span>
                <input
                  className="input"
                  value={form.targetCustomer}
                  onChange={(event) => update("targetCustomer", event.target.value)}
                  placeholder="예: 성수동 직장인, 데이트 고객"
                />
              </label>

              <label className="form-label">
                <span>이번 달 목표</span>
                <textarea
                  className="input"
                  rows={3}
                  value={form.customerGoal}
                  onChange={(event) => update("customerGoal", event.target.value)}
                />
              </label>
            </div>

            {error ? <p style={{ color: "var(--red)", fontWeight: 800 }}>{error}</p> : null}

            <div className="actions-row">
              <button className="btn primary" type="submit" disabled={busy}>
                {busy ? "진단 준비 중..." : "무료 성장 진단 시작"}
              </button>
            </div>
          </form>

          <aside className="card soft">
            <div className="eyebrow">분석 항목</div>
            <h2>진단이 생성하는 것</h2>

            <div className="timeline" style={{ marginTop: 18 }}>
              {[
                ["사업장 기본정보", "상호, 업종, 주소를 기준으로 고객 프로필을 만듭니다."],
                ["상권·경쟁 분석", "반경 경쟁점과 상권 수요 신호를 계산합니다."],
                ["디지털 발견성", "지도/검색에서 찾을 수 있는지 확인합니다."],
                ["점수 이유", "점수를 올린 요인과 낮춘 요인을 설명합니다."],
                ["이번 주 미션", "실행하면 점수가 오르는 미션 3개를 생성합니다."]
              ].map(([title, text]) => (
                <div className="timeline-item" key={title}>
                  <span className="dot" />
                  <div>
                    <strong>{title}</strong>
                    <p>{text}</p>
                  </div>
                </div>
              ))}
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}

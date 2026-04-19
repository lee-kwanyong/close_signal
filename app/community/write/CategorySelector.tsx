"use client";

import { useEffect, useMemo, useState } from "react";

type CategoryOption = {
  value: string;
  description: string;
};

const categoryOptions: CategoryOption[] = [
  { value: "전문가에게 묻기", description: "전문가 질문형" },
  { value: "익명 고민", description: "익명 고민 공유" },
  { value: "성공사례", description: "회복 경험 공유" },
  { value: "처음 시작", description: "초기 고민 정리" },
  { value: "고민글", description: "자유 작성" },
];

export default function CategorySelector({
  initialCategory,
}: {
  initialCategory: string;
}) {
  const fallbackCategory = useMemo(() => {
    const target = String(initialCategory || "").trim();
    if (!target) return "고민글";

    const exists = categoryOptions.some((item) => item.value === target);
    return exists ? target : "고민글";
  }, [initialCategory]);

  const [selected, setSelected] = useState(fallbackCategory);

  useEffect(() => {
    setSelected(fallbackCategory);
  }, [fallbackCategory]);

  return (
    <div className="space-y-3">
      <label className="text-sm font-semibold text-slate-700">카테고리</label>

      <input type="hidden" name="category" value={selected} />

      <div className="grid grid-cols-2 gap-3">
        {categoryOptions.map((item) => {
          const checked = selected === item.value;

          return (
            <button
              key={item.value}
              type="button"
              onClick={() => setSelected(item.value)}
              className={`group relative rounded-[22px] border px-4 py-4 text-left transition ${
                checked
                  ? "border-emerald-300 bg-emerald-50 shadow-[0_10px_24px_rgba(34,197,94,0.10)]"
                  : "border-slate-200 bg-white hover:border-emerald-200 hover:bg-emerald-50/40"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div
                    className={`text-sm font-bold ${
                      checked ? "text-emerald-800" : "text-slate-900"
                    }`}
                  >
                    {item.value}
                  </div>
                  <div className="mt-1 text-xs leading-6 text-slate-500">
                    {item.description}
                  </div>
                </div>

                <div
                  className={`mt-0.5 h-4 w-4 rounded-full border transition ${
                    checked
                      ? "border-emerald-500 bg-emerald-500 ring-4 ring-emerald-100"
                      : "border-slate-300 bg-white"
                  }`}
                />
              </div>
            </button>
          );
        })}
      </div>

      <p className="text-xs leading-6 text-slate-400">
        시그널이나 지역 상세에서 들어온 경우에도 여기서 최종 카테고리를 다시 고를 수 있습니다.
      </p>
    </div>
  );
}
import Link from "next/link";

const policies = [
  {
    title: "이용약관",
    href: "/policies/terms",
    description: "클로징시그널 서비스 이용 조건, 회원 권리와 의무, 책임범위를 안내합니다.",
  },
  {
    title: "광고 운영정책",
    href: "/policies/ad",
    description: "광고 등록 기준, 노출 제한, 금지 항목, 표시 원칙을 안내합니다.",
  },
  {
    title: "개인정보처리방침",
    href: "/policies/privacy",
    description: "수집하는 개인정보, 이용 목적, 보관 기간, 이용자 권리를 설명합니다.",
  },
  {
    title: "서비스 운영정책",
    href: "/policies/operation",
    description: "커뮤니티 및 서비스 운영 기준, 제재 원칙, 신고 처리 기준을 안내합니다.",
  },
  {
    title: "분쟁 처리정책",
    href: "/policies/dispute",
    description: "서비스 이용 중 발생할 수 있는 분쟁의 접수, 검토, 처리 절차를 안내합니다.",
  },
];

export default function PoliciesIndexPage() {
  return (
    <main className="min-h-screen bg-white">
      <section className="mx-auto max-w-5xl px-5 py-12 sm:px-6 lg:px-8">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="mb-8">
            <p className="text-sm font-semibold tracking-wide text-teal-600">
              POLICIES
            </p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              정책 및 약관
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
              클로징시그널 서비스 이용에 필요한 주요 약관과 정책을 한곳에서 확인할 수 있습니다.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {policies.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="group rounded-2xl border border-slate-200 bg-slate-50 p-5 transition hover:border-teal-300 hover:bg-teal-50"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900 group-hover:text-teal-700">
                      {item.title}
                    </h2>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      {item.description}
                    </p>
                  </div>
                  <span className="mt-1 text-sm font-semibold text-teal-600">
                    보기
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
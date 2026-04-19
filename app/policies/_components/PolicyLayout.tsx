import Link from "next/link";
import { ReactNode } from "react";

type PolicySection = {
  id: string;
  title: string;
  summary?: string;
  content: ReactNode;
};

type PolicyLayoutProps = {
  eybrow: string;
  title: string;
  effectiveDate: string;
  description: string;
  sections: PolicySection[];
};

export default function PolicyLayout({
  eybrow,
  title,
  effectiveDate,
  description,
  sections,
}: PolicyLayoutProps) {
  return (
    <main className="min-h-screen bg-white">
      <section className="border-b border-slate-200 bg-gradient-to-b from-teal-50 via-white to-white">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
          <div className="mb-5">
            <Link
              href="/policies"
              className="inline-flex items-center rounded-full border border-teal-200 bg-white px-4 py-2 text-sm font-semibold text-teal-700 transition hover:border-teal-300 hover:bg-teal-50"
            >
              ← 정책 목록으로
            </Link>
          </div>

          <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-teal-600">
                {eybrow}
              </p>
              <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                {title}
              </h1>
              <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-600 sm:text-base">
                {description}
              </p>
            </div>

            <div className="rounded-3xl border border-teal-100 bg-white/90 p-5 shadow-sm backdrop-blur">
              <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                문서 정보
              </div>
              <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
                <div>
                  <div className="text-xs font-medium text-slate-500">시행일</div>
                  <div className="mt-1 text-base font-semibold text-slate-900">
                    {effectiveDate}
                  </div>
                </div>
                <div>
                  <div className="text-xs font-medium text-slate-500">문서 성격</div>
                  <div className="mt-1 text-base font-semibold text-slate-900">
                    공식 정책 문서
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-[280px_minmax(0,1fr)]">
          <aside className="lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
              <div className="text-sm font-bold text-slate-900">빠른 목차</div>
              <p className="mt-2 text-xs leading-5 text-slate-500">
                필요한 항목으로 바로 이동해서 확인할 수 있습니다.
              </p>

              <nav className="mt-4 space-y-2">
                {sections.map((section, index) => (
                  <a
                    key={section.id}
                    href={`#${section.id}`}
                    className="flex items-start gap-3 rounded-2xl px-3 py-3 text-sm text-slate-700 transition hover:bg-white hover:text-slate-900"
                  >
                    <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white text-xs font-bold text-teal-700 ring-1 ring-slate-200">
                      {index + 1}
                    </span>
                    <span className="leading-6">{section.title}</span>
                  </a>
                ))}
              </nav>
            </div>
          </aside>

          <div className="space-y-5">
            {sections.map((section) => (
              <article
                key={section.id}
                id={section.id}
                className="scroll-mt-24 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8"
              >
                <div className="flex flex-col gap-3 border-b border-slate-100 pb-5">
                  <div className="inline-flex w-fit items-center rounded-full bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-700">
                    {section.title}
                  </div>
                  {section.summary ? (
                    <p className="text-sm leading-6 text-slate-600">{section.summary}</p>
                  ) : null}
                </div>

                <div className="prose prose-slate mt-6 max-w-none prose-headings:mb-3 prose-headings:mt-8 prose-headings:text-slate-900 prose-p:text-slate-700 prose-p:leading-7 prose-li:text-slate-700 prose-li:leading-7 prose-strong:text-slate-900">
                  {section.content}
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
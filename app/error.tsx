"use client";

import Link from "next/link";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto flex max-w-2xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="w-full rounded-2xl border border-red-200 bg-white p-8">
          <div className="inline-flex rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-700 ring-1 ring-red-200">
            Error
          </div>

          <h1 className="mt-4 text-2xl font-semibold text-slate-900">
            페이지를 불러오는 중 오류가 발생했습니다.
          </h1>

          <p className="mt-2 text-sm leading-6 text-slate-600">
            일시적인 문제일 수 있습니다. 다시 시도하거나 다른 화면으로 이동해 주세요.
          </p>

          {error?.message ? (
            <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
                message
              </div>
              <div className="mt-2 break-words text-sm text-slate-700">
                {error.message}
              </div>
            </div>
          ) : null}

          <div className="mt-6 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => reset()}
              className="inline-flex h-10 items-center rounded-lg bg-slate-900 px-4 text-sm font-medium text-white transition hover:bg-slate-800"
            >
              다시 시도
            </button>

            <Link
              href="/"
              className="inline-flex h-10 items-center rounded-lg border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              홈
            </Link>

            <Link
              href="/rankings"
              className="inline-flex h-10 items-center rounded-lg border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              리스크 랭킹
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
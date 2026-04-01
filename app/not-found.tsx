import Link from "next/link";

export default function NotFoundPage() {
  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto flex max-w-2xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="w-full rounded-2xl border border-slate-200 bg-white p-8">
          <div className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200">
            404
          </div>

          <h1 className="mt-4 text-2xl font-semibold text-slate-900">
            요청한 페이지를 찾을 수 없습니다.
          </h1>

          <p className="mt-2 text-sm leading-6 text-slate-600">
            주소가 변경되었거나 존재하지 않는 경로일 수 있습니다.
          </p>

          <div className="mt-6 flex flex-wrap gap-2">
            <Link
              href="/"
              className="inline-flex h-10 items-center rounded-lg bg-slate-900 px-4 text-sm font-medium text-white transition hover:bg-slate-800"
            >
              홈
            </Link>

            <Link
              href="/rankings"
              className="inline-flex h-10 items-center rounded-lg border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              리스크 랭킹
            </Link>

            <Link
              href="/signals"
              className="inline-flex h-10 items-center rounded-lg border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              시그널
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
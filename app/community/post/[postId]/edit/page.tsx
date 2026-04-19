import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { deleteCommunityPostAction, updateCommunityPostAction } from "./actions";

type SearchParams = Promise<{
  error?: string;
}>;

type CommunityPost = {
  id: string;
  author_id: string | null;
  post_type: string | null;
  category: string | null;
  title: string | null;
  content: string | null;
};

function normalizeType(value?: string | null) {
  const allowed = ["expert", "worry", "success", "story"];
  return value && allowed.includes(value) ? value : "story";
}

const surfaceCard =
  "rounded-[1.75rem] border border-slate-200 bg-white shadow-[0_12px_28px_rgba(15,23,42,0.05)]";
const primaryButton =
  "inline-flex h-11 items-center justify-center rounded-2xl border border-[#0B5CAB] bg-[#0B5CAB] px-5 text-sm font-semibold text-white transition hover:border-[#084298] hover:bg-[#084298]";
const secondaryButton =
  "inline-flex h-11 items-center justify-center rounded-2xl border border-sky-200 bg-sky-50 px-5 text-sm font-semibold text-[#0B5CAB] transition hover:border-sky-300 hover:bg-sky-100";

export default async function CommunityPostEditPage({
  params,
  searchParams,
}: {
  params: Promise<{ postId: string }>;
  searchParams: SearchParams;
}) {
  const { postId } = await params;
  const sp = await searchParams;
  const error = sp.error ?? "";

  const supabase = await supabaseServer();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/auth/login?next=${encodeURIComponent(`/community/post/${postId}/edit`)}`);
  }

  const { data, error: fetchError } = await supabase
    .from("community_posts")
    .select("id, author_id, post_type, category, title, content")
    .eq("id", postId)
    .maybeSingle<CommunityPost>();

  if (fetchError || !data) {
    notFound();
  }

  if (data.author_id !== user.id) {
    redirect(`/community/post/${postId}`);
  }

  const postType = normalizeType(data.post_type);

  return (
    <main className="min-h-screen bg-white text-slate-900">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-4 py-6 sm:px-6 lg:px-8">
        <section className={surfaceCard}>
          <div className="bg-[linear-gradient(135deg,#eef5ff_0%,#f8fbff_46%,#ffffff_100%)] p-6 sm:p-8">
            <div className="inline-flex items-center rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-semibold text-[#0B5CAB]">
              COMMUNITY EDIT
            </div>

            <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-slate-950 sm:text-5xl">
              글 수정
            </h1>

            <p className="mt-4 text-sm leading-6 text-slate-600 sm:text-base">
              작성자 본인만 글을 수정하거나 삭제할 수 있습니다.
            </p>
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-[1fr_auto]">
          <section className={`${surfaceCard} p-6 sm:p-8`}>
            {error ? (
              <div className="mb-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
                {error}
              </div>
            ) : null}

            <form action={updateCommunityPostAction} className="space-y-5">
              <input type="hidden" name="post_id" value={data.id} />

              <div className="space-y-2">
                <label htmlFor="post_type" className="text-sm font-semibold text-slate-700">
                  글 유형
                </label>
                <select
                  id="post_type"
                  name="post_type"
                  defaultValue={postType}
                  className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-sky-300 focus:ring-4 focus:ring-sky-100"
                >
                  <option value="expert">전문가에게 묻기</option>
                  <option value="worry">익명 고민</option>
                  <option value="success">성공사례</option>
                  <option value="story">고민글 적기</option>
                </select>
              </div>

              <div className="space-y-2">
                <label htmlFor="category" className="text-sm font-semibold text-slate-700">
                  카테고리
                </label>
                <input
                  id="category"
                  name="category"
                  defaultValue={data.category ?? ""}
                  className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-sky-300 focus:ring-4 focus:ring-sky-100"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="title" className="text-sm font-semibold text-slate-700">
                  제목
                </label>
                <input
                  id="title"
                  name="title"
                  defaultValue={data.title ?? ""}
                  required
                  className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-sky-300 focus:ring-4 focus:ring-sky-100"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="content" className="text-sm font-semibold text-slate-700">
                  내용
                </label>
                <textarea
                  id="content"
                  name="content"
                  defaultValue={data.content ?? ""}
                  required
                  rows={14}
                  className="w-full rounded-[1.5rem] border border-slate-200 bg-white px-4 py-4 text-sm leading-6 text-slate-900 outline-none transition focus:border-sky-300 focus:ring-4 focus:ring-sky-100"
                />
              </div>

              <div className="flex flex-wrap gap-3">
                <button type="submit" className={primaryButton}>
                  수정 저장
                </button>
                <Link href={`/community/post/${data.id}`} className={secondaryButton}>
                  취소
                </Link>
              </div>
            </form>
          </section>

          <aside className={`${surfaceCard} p-6 lg:w-[220px]`}>
            <div className="text-lg font-bold text-slate-950">관리</div>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              삭제는 즉시 반영되며 복구되지 않습니다.
            </p>

            <form action={deleteCommunityPostAction} className="mt-6">
              <input type="hidden" name="post_id" value={data.id} />
              <button
                type="submit"
                className="inline-flex h-11 w-full items-center justify-center rounded-2xl border border-rose-200 bg-rose-50 px-5 text-sm font-semibold text-rose-700 transition hover:bg-rose-100"
              >
                글 삭제
              </button>
            </form>
          </aside>
        </section>
      </div>
    </main>
  );
}
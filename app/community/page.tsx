import type { ReactNode } from "react";
import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type CommunityPostRow = {
  id: number;
  title?: string | null;
  content?: string | null;
  region_code?: string | null;
  region_name?: string | null;
  category?: string | null;
  category_l1?: string | null;
  topic?: string | null;
  is_solved?: boolean | null;
  created_at?: string | null;
};

type RecentPostCard = {
  id: number;
  title: string;
  summary: string;
  regionCode: string | null;
  regionName: string | null;
  topic: string | null;
  categoryText: string | null;
  createdAtLabel: string;
  isSolved: boolean;
};

type RegionGroupCard = {
  regionCode: string;
  regionName: string;
  postCount: number;
  latestTitle: string | null;
};

function text(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === "string") {
      const trimmed = value.trim();
      if (trimmed) return trimmed;
    }
    if (typeof value === "number" && Number.isFinite(value)) {
      return String(value);
    }
  }
  return "";
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("ko-KR").format(value);
}

function formatDateLabel(value?: string | null) {
  if (!value) return "";
  const raw = String(value);
  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    return `${match[1]}.${match[2]}.${match[3]}`;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}.${mm}.${dd}`;
}

function summarizeContent(value?: string | null, maxLength = 110) {
  const raw = String(value ?? "").replace(/\s+/g, " ").trim();
  if (!raw) return "";
  if (raw.length <= maxLength) return raw;
  return `${raw.slice(0, maxLength).trim()}…`;
}

function getRegionName(regionCode?: string | null, regionName?: string | null) {
  const explicit = text(regionName);
  if (explicit) return explicit;

  const code = text(regionCode);
  if (!code) return "미지정 지역";

  const map: Record<string, string> = {
    "KR-11": "서울특별시",
    "KR-26": "부산광역시",
    "KR-27": "대구광역시",
    "KR-28": "인천광역시",
    "KR-29": "광주광역시",
    "KR-30": "대전광역시",
    "KR-31": "울산광역시",
    "KR-36": "세종특별자치시",
    "KR-41": "경기도",
    "KR-42": "강원특별자치도",
    "KR-43": "충청북도",
    "KR-44": "충청남도",
    "KR-45": "전북특별자치도",
    "KR-46": "전라남도",
    "KR-47": "경상북도",
    "KR-48": "경상남도",
    "KR-50": "제주특별자치도",
  };

  return map[code] ?? code;
}

function topicLabel(value?: string | null) {
  const raw = String(value || "").trim().toLowerCase();

  if (raw.includes("expert")) return "전문가에게 묻기";
  if (raw.includes("worry") || raw.includes("anonymous")) return "익명 고민";
  if (raw.includes("success")) return "성공사례";
  if (raw.includes("story") || raw.includes("start")) return "고민글";

  return value || "커뮤니티";
}

function topicTone(value?: string | null) {
  const raw = String(value || "").trim().toLowerCase();

  if (raw.includes("expert")) {
    return "border-sky-200 bg-sky-50 text-sky-700";
  }
  if (raw.includes("worry") || raw.includes("anonymous")) {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }
  if (raw.includes("success")) {
    return "border-blue-200 bg-blue-50 text-blue-700";
  }

  return "border-sky-200 bg-white text-slate-700";
}

function categoryText(row: CommunityPostRow) {
  return text(row.category_l1, row.category) || null;
}

async function fetchCommunityPageData() {
  const supabase = supabaseAdmin();

  const [totalPostsRes, resolvedPostsRes, postsRes] = await Promise.all([
    supabase.from("community_posts").select("id", { count: "exact", head: true }),
    supabase
      .from("community_posts")
      .select("id", { count: "exact", head: true })
      .eq("is_solved", true),
    supabase
      .from("community_posts")
      .select(
        "id, title, content, region_code, region_name, category, category_l1, topic, is_solved, created_at",
      )
      .order("created_at", { ascending: false })
      .limit(200),
  ]);

  if (totalPostsRes.error) {
    throw new Error(`community_posts total 조회 실패: ${totalPostsRes.error.message}`);
  }

  if (resolvedPostsRes.error) {
    throw new Error(`community_posts solved 조회 실패: ${resolvedPostsRes.error.message}`);
  }

  if (postsRes.error) {
    throw new Error(`community_posts 조회 실패: ${postsRes.error.message}`);
  }

  const rows = (postsRes.data ?? []) as CommunityPostRow[];

  const recentPosts: RecentPostCard[] = rows.slice(0, 6).map((row) => ({
    id: row.id,
    title: text(row.title) || "제목 없음",
    summary: summarizeContent(text(row.content), 130),
    regionCode: text(row.region_code) || null,
    regionName: text(row.region_name) || null,
    topic: text(row.topic) || null,
    categoryText: categoryText(row),
    createdAtLabel: formatDateLabel(row.created_at),
    isSolved: Boolean(row.is_solved),
  }));

  const regionMap = new Map<string, RegionGroupCard>();

  for (const row of rows) {
    const regionCode = text(row.region_code);
    if (!regionCode) continue;

    const existing = regionMap.get(regionCode);

    if (!existing) {
      regionMap.set(regionCode, {
        regionCode,
        regionName: getRegionName(regionCode, row.region_name),
        postCount: 1,
        latestTitle: text(row.title) || null,
      });
      continue;
    }

    existing.postCount += 1;

    if (!existing.latestTitle) {
      existing.latestTitle = text(row.title) || null;
    }
  }

  const topicCounts = rows.reduce(
    (acc, row) => {
      const key = String(row.topic || "").toLowerCase();

      if (key.includes("expert")) acc.expert += 1;
      else if (key.includes("worry") || key.includes("anonymous")) acc.worry += 1;
      else if (key.includes("success")) acc.success += 1;
      else acc.story += 1;

      return acc;
    },
    { expert: 0, worry: 0, success: 0, story: 0 },
  );

  const regionGroups = Array.from(regionMap.values())
    .sort((a, b) => b.postCount - a.postCount)
    .slice(0, 9);

  return {
    totalPosts: totalPostsRes.count ?? 0,
    resolvedPosts: resolvedPostsRes.count ?? 0,
    activeRegions: regionGroups.length,
    unresolvedPosts: (totalPostsRes.count ?? 0) - (resolvedPostsRes.count ?? 0),
    recentPosts,
    regionGroups,
    topicCounts,
  };
}

const shellClass = "mx-auto max-w-7xl px-4 sm:px-6";
const surfaceCard =
  "rounded-[1.75rem] border border-sky-100 bg-sky-50 shadow-[0_12px_28px_rgba(14,165,233,0.08)]";
const primaryButton =
  "inline-flex h-11 items-center justify-center rounded-2xl border border-sky-600 bg-sky-600 px-4 text-sm font-semibold text-white transition hover:border-sky-700 hover:bg-sky-700";
const secondaryButton =
  "inline-flex h-11 items-center justify-center rounded-2xl border border-sky-200 bg-white px-4 text-sm font-semibold text-sky-700 transition hover:border-sky-300 hover:bg-sky-50";

function SectionTitle({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <div className="text-[11px] font-black uppercase tracking-[0.18em] text-sky-700">
          {eyebrow}
        </div>
        <h2 className="mt-2 text-2xl font-black tracking-[-0.04em] text-slate-950">
          {title}
        </h2>
        <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-600">{description}</p>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

function KpiCard({
  label,
  value,
  description,
  tone = "default",
}: {
  label: string;
  value: string;
  description: string;
  tone?: "default" | "info" | "warning" | "success";
}) {
  const toneClass =
    tone === "warning"
      ? "border-amber-200 bg-amber-50"
      : tone === "success"
        ? "border-blue-200 bg-blue-50"
        : tone === "info"
          ? "border-sky-200 bg-sky-50"
          : "border-sky-200 bg-white";

  return (
    <div className={`rounded-[1.5rem] border p-5 ${toneClass}`}>
      <div className="text-sm font-semibold text-slate-700">{label}</div>
      <div className="mt-3 text-3xl font-black tracking-[-0.05em] text-slate-950">{value}</div>
      <div className="mt-2 text-xs leading-6 text-slate-600">{description}</div>
    </div>
  );
}

function ShortcutCard({
  title,
  description,
  href,
  solid = false,
}: {
  title: string;
  description: string;
  href: string;
  solid?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`block rounded-[1.5rem] border p-5 transition ${
        solid
          ? "border-sky-600 bg-sky-600 text-white hover:border-sky-700 hover:bg-sky-700"
          : "border-sky-200 bg-white text-slate-900 hover:border-sky-300 hover:bg-sky-50"
      }`}
    >
      <div className="text-lg font-black tracking-[-0.03em]">{title}</div>
      <p className={`mt-2 text-sm leading-7 ${solid ? "text-white/90" : "text-slate-600"}`}>
        {description}
      </p>
    </Link>
  );
}

function GuideCard({
  title,
  body,
}: {
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-[1.5rem] border border-sky-200 bg-white p-5">
      <div className="text-base font-black tracking-[-0.02em] text-slate-950">{title}</div>
      <p className="mt-2 text-sm leading-7 text-slate-600">{body}</p>
    </div>
  );
}

export default async function CommunityPage() {
  const {
    totalPosts,
    resolvedPosts,
    unresolvedPosts,
    activeRegions,
    recentPosts,
    regionGroups,
    topicCounts,
  } = await fetchCommunityPageData();

  return (
    <main className="min-h-screen bg-white text-slate-900">
      <div className={`${shellClass} pb-14 pt-6`}>
        <div className="space-y-6">
          <section className={surfaceCard}>
            <div className="bg-[linear-gradient(135deg,#eff6ff_0%,#f5f9ff_46%,#ffffff_100%)] px-6 py-6 sm:px-8">
              <div className="grid gap-8 xl:grid-cols-[1.08fr_0.92fr]">
                <div className="min-w-0">
                  <div className="inline-flex items-center rounded-full border border-sky-200 bg-white px-4 py-1.5 text-[11px] font-black uppercase tracking-[0.18em] text-sky-700">
                    Community Hub
                  </div>

                  <h1 className="mt-5 text-[32px] font-black tracking-[-0.05em] text-slate-950 sm:text-[46px]">
                    질문과 사례를 모아
                    <br />
                    운영 지식으로 연결합니다
                  </h1>

                  <p className="mt-5 max-w-3xl text-sm leading-8 text-slate-600 sm:text-base">
                    커뮤니티는 발견 화면에서 놓친 현장 맥락을 모으는 공간입니다. 질문,
                    익명 고민, 성공사례를 지역과 업종 문맥 위에서 이어보고, 필요한 경우
                    모니터나 외부 검증으로 다시 연결합니다.
                  </p>

                  <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <ShortcutCard
                      title="전문가에게 묻기"
                      description="운영, 상권, 입지, 폐업 위험에 대한 질문을 남깁니다."
                      href="/community/write?type=expert"
                      solid
                    />
                    <ShortcutCard
                      title="익명 고민"
                      description="말하기 어려운 매출·운영 고민을 익명으로 남깁니다."
                      href="/community/write?type=worry"
                    />
                    <ShortcutCard
                      title="성공사례"
                      description="회복 경험, 개선 방법, 전환 사례를 공유합니다."
                      href="/community/write?type=success"
                    />
                    <ShortcutCard
                      title="고민글"
                      description="현실적인 문제를 정리해 토론형 글로 남깁니다."
                      href="/community/write?type=story"
                    />
                  </div>
                </div>

                <div className="rounded-[1.75rem] border border-sky-200 bg-white p-6 shadow-[0_10px_24px_rgba(14,165,233,0.08)]">
                  <div className="text-[11px] font-black uppercase tracking-[0.18em] text-sky-700">
                    Community Snapshot
                  </div>

                  <div className="mt-5 grid grid-cols-2 gap-3">
                    <KpiCard
                      label="전체 글"
                      value={formatNumber(totalPosts)}
                      description="누적 등록된 커뮤니티 글"
                      tone="info"
                    />
                    <KpiCard
                      label="해결됨"
                      value={formatNumber(resolvedPosts)}
                      description="해결 표시된 글 수"
                      tone="success"
                    />
                    <KpiCard
                      label="미해결"
                      value={formatNumber(unresolvedPosts)}
                      description="추가 의견이 필요한 글 수"
                      tone={unresolvedPosts > 0 ? "warning" : "default"}
                    />
                    <KpiCard
                      label="활성 지역"
                      value={formatNumber(activeRegions)}
                      description="최근 글이 모인 지역 수"
                    />
                  </div>

                  <div className="mt-5 rounded-[1.5rem] border border-sky-200 bg-sky-50 p-4">
                    <div className="text-sm font-semibold text-slate-700">글 유형 분포</div>
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <div className="rounded-2xl border border-sky-200 bg-white px-3 py-3 text-sm font-semibold text-sky-700">
                        전문가 질문 {formatNumber(topicCounts.expert)}
                      </div>
                      <div className="rounded-2xl border border-amber-200 bg-amber-50 px-3 py-3 text-sm font-semibold text-amber-700">
                        익명 고민 {formatNumber(topicCounts.worry)}
                      </div>
                      <div className="rounded-2xl border border-blue-200 bg-blue-50 px-3 py-3 text-sm font-semibold text-blue-700">
                        성공사례 {formatNumber(topicCounts.success)}
                      </div>
                      <div className="rounded-2xl border border-sky-200 bg-white px-3 py-3 text-sm font-semibold text-slate-700">
                        고민글 {formatNumber(topicCounts.story)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className={`${surfaceCard} p-6 sm:p-7`}>
            <SectionTitle
              eyebrow="Recent Posts"
              title="최근 글"
              description="최근 올라온 질문과 사례를 먼저 읽고 바로 참여할 수 있습니다."
              action={
                <Link href="/community/write" className={primaryButton}>
                  새 글 쓰기
                </Link>
              }
            />

            <div className="mt-6">
              {recentPosts.length > 0 ? (
                <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
                  {recentPosts.map((post) => (
                    <Link
                      key={post.id}
                      href={`/community/post/${post.id}`}
                      className="group block rounded-[1.5rem] border border-sky-200 bg-white p-5 shadow-[0_8px_20px_rgba(14,165,233,0.06)] transition hover:border-sky-300 hover:bg-sky-50/40"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold ${topicTone(
                            post.topic,
                          )}`}
                        >
                          {topicLabel(post.topic)}
                        </span>

                        {post.isSolved ? (
                          <span className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-blue-700">
                            해결됨
                          </span>
                        ) : null}
                      </div>

                      <div className="mt-3 text-lg font-black tracking-[-0.03em] text-slate-950">
                        {post.title}
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
                        <span className="rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1">
                          {getRegionName(post.regionCode, post.regionName)}
                        </span>
                        {post.categoryText ? (
                          <span className="rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1">
                            {post.categoryText}
                          </span>
                        ) : null}
                      </div>

                      <div className="mt-4 line-clamp-3 text-sm leading-7 text-slate-600">
                        {post.summary || "아직 본문이 없습니다."}
                      </div>

                      <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
                        <span>{post.createdAtLabel}</span>
                        <span className="font-semibold text-sky-700 transition group-hover:translate-x-0.5">
                          읽기
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="rounded-[1.5rem] border border-dashed border-sky-200 bg-white px-5 py-12 text-sm text-slate-500">
                  아직 커뮤니티 글이 없습니다.
                </div>
              )}
            </div>
          </section>

          <section className="grid gap-6 xl:grid-cols-[1fr_1fr]">
            <section className={`${surfaceCard} p-6 sm:p-7`}>
              <SectionTitle
                eyebrow="Regions"
                title="지역 커뮤니티"
                description="지역별로 글이 모인 곳을 먼저 보고 같은 상권 맥락의 이야기를 찾을 수 있습니다."
              />

              <div className="mt-6">
                {regionGroups.length > 0 ? (
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {regionGroups.map((region) => (
                      <Link
                        key={region.regionCode}
                        href={`/community/region/${region.regionCode}`}
                        className="block rounded-[1.5rem] border border-sky-200 bg-white p-5 transition hover:border-sky-300 hover:bg-sky-50"
                      >
                        <div className="text-sm font-semibold text-sky-700">
                          {region.regionName}
                        </div>
                        <div className="mt-2 text-3xl font-black tracking-[-0.04em] text-slate-950">
                          {formatNumber(region.postCount)}
                        </div>
                        <div className="mt-1 text-sm text-slate-500">누적 글 수</div>

                        <div className="mt-4 line-clamp-2 text-sm leading-7 text-slate-600">
                          {region.latestTitle || "아직 등록된 글이 없습니다."}
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-[1.5rem] border border-dashed border-sky-200 bg-white px-5 py-12 text-sm text-slate-500">
                    아직 지역 데이터가 없습니다.
                  </div>
                )}
              </div>
            </section>

            <section className={`${surfaceCard} p-6 sm:p-7`}>
              <SectionTitle
                eyebrow="How To Use"
                title="커뮤니티 활용 방법"
                description="발견 화면과 운영 화면 사이에서 현장 맥락을 보강하는 용도로 쓰면 가장 좋습니다."
              />

              <div className="mt-6 grid gap-4">
                <GuideCard
                  title="1. 시그널이나 랭킹에서 궁금한 지점을 발견"
                  body="수치만으로 확신하기 어려운 지점을 커뮤니티 질문으로 넘기면 현장 경험을 모을 수 있습니다."
                />
                <GuideCard
                  title="2. 지역과 업종 문맥을 함께 기록"
                  body="지역 코드, 업종, 외부 검증 검색어를 함께 남기면 이후 모니터 인테이크와 연결하기 쉬워집니다."
                />
                <GuideCard
                  title="3. 해결된 흐름은 성공사례로 축적"
                  body="회복 경험이나 전환 경험을 남겨 두면 다음 액션 엔진 설계에도 참고할 수 있습니다."
                />
              </div>

              <div className="mt-5 flex flex-wrap gap-3">
                <Link href="/community/write?type=expert" className={secondaryButton}>
                  전문가 질문 쓰기
                </Link>
                <Link
                  href="/community/write?type=story"
                  className="inline-flex h-11 items-center justify-center rounded-2xl border border-sky-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:border-sky-300 hover:bg-sky-50"
                >
                  고민글 쓰기
                </Link>
              </div>
            </section>
          </section>
        </div>
      </div>
    </main>
  );
}
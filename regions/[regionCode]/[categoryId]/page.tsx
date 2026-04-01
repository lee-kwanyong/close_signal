import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { addWatchlistAction, removeWatchlistAction } from '@/app/watchlist/actions'

type DetailRow = {
  region_code: string
  region_name: string | null
  category_id: number
  category_name: string | null
  score_date: string | null
  risk_score: number | null
  risk_grade: string | null
  open_count?: number | null
  close_count?: number | null
  close_rate?: number | null
  active_business_count?: number | null
  closed_business_count?: number | null
}

type SignalRow = {
  signal_id?: number | null
  region_code: string
  region_name: string | null
  category_id: number
  category_name: string | null
  score_date: string | null
  signal_type: string | null
  signal_label: string | null
  signal_strength: number | null
  risk_grade: string | null
  summary: string | null
}

type WatchlistRow = {
  watchlist_id: number
  region_code: string
  category_id: number
}

function gradeLabel(grade: string | null) {
  switch ((grade || '').toLowerCase()) {
    case 'critical':
      return '치명'
    case 'high':
      return '높음'
    case 'medium':
      return '보통'
    case 'low':
      return '낮음'
    default:
      return '-'
  }
}

function gradeColors(grade: string | null) {
  switch ((grade || '').toLowerCase()) {
    case 'critical':
    case 'high':
      return {
        background: '#fef3f2',
        color: '#b42318',
        border: '#fecdca',
      }
    case 'medium':
      return {
        background: '#fffaeb',
        color: '#b54708',
        border: '#fedf89',
      }
    default:
      return {
        background: '#ecfdf3',
        color: '#067647',
        border: '#abefc6',
      }
  }
}

function scoreLabel(score: number | null) {
  if (score === null || score === undefined) return '-'
  return Number(score).toFixed(1)
}

function numberLabel(value: number | null | undefined) {
  if (value === null || value === undefined) return '-'
  return Number(value).toLocaleString('ko-KR')
}

export default async function RegionCategoryDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{
    regionCode: string
    categoryId: string
  }>
  searchParams?: Promise<{
    error?: string
    saved?: string
    removed?: string
  }>
}) {
  const resolvedParams = await params
  const resolvedSearchParams = (await searchParams) || {}

  const regionCode = String(resolvedParams.regionCode || '').trim()
  const categoryId = Number(String(resolvedParams.categoryId || '').trim())

  if (!regionCode || !Number.isFinite(categoryId)) {
    notFound()
  }

  const supabase = await createClient()

  const { data: detailData, error: detailError } = await supabase.rpc(
    'get_region_category_detail_named',
    {
      p_region_code: regionCode,
      p_category_id: categoryId,
    },
  )

  if (detailError) {
    throw new Error(detailError.message)
  }

  const detailRows = (detailData || []) as DetailRow[]

  if (detailRows.length === 0) {
    notFound()
  }

  const latest = detailRows[0]
  const badge = gradeColors(latest.risk_grade)

  const { data: signalData, error: signalError } = await supabase.rpc('get_risk_signals_feed')

  if (signalError) {
    throw new Error(signalError.message)
  }

  const relatedSignals = ((signalData || []) as SignalRow[])
    .filter(
      (row) =>
        row.region_code === regionCode &&
        Number(row.category_id) === categoryId,
    )
    .slice(0, 10)

  const {
    data: { user },
  } = await supabase.auth.getUser()

  let savedWatchlistId: number | null = null

  if (user) {
    const { data: internalUserId, error: internalUserError } = await supabase.rpc(
      'get_internal_user_id',
    )

    if (!internalUserError && internalUserId) {
      const { data: watchlistData, error: watchlistError } = await supabase.rpc(
        'get_my_watchlists',
        {
          p_user_id: Number(internalUserId),
        },
      )

      if (!watchlistError) {
        const found = ((watchlistData || []) as WatchlistRow[]).find(
          (row) =>
            row.region_code === regionCode &&
            Number(row.category_id) === categoryId,
        )

        if (found) {
          savedWatchlistId = found.watchlist_id
        }
      }
    }
  }

  const currentPath = `/regions/${regionCode}/${categoryId}`

  return (
    <main
      style={{
        minHeight: '100vh',
        background: '#f5f7fb',
        padding: '40px 20px 80px',
      }}
    >
      <div style={{ maxWidth: 1280, margin: '0 auto' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: 20,
            flexWrap: 'wrap',
            marginBottom: 24,
          }}
        >
          <div>
            <div
              style={{
                fontSize: 13,
                color: '#667085',
                marginBottom: 8,
                fontWeight: 700,
              }}
            >
              REGION / CATEGORY DETAIL
            </div>
            <h1
              style={{
                margin: 0,
                fontSize: 32,
                lineHeight: 1.2,
                color: '#101828',
                fontWeight: 800,
              }}
            >
              {latest.region_name || latest.region_code} ·{' '}
              {latest.category_name || `카테고리 ${latest.category_id}`}
            </h1>
            <p
              style={{
                margin: '10px 0 0',
                fontSize: 15,
                color: '#475467',
                lineHeight: 1.7,
              }}
            >
              지역·업종 단위의 최근 위험 점수와 관련 시그널을 확인합니다.
            </p>
          </div>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <Link
              href="/rankings"
              style={{
                textDecoration: 'none',
                padding: '10px 14px',
                borderRadius: 12,
                background: '#ffffff',
                border: '1px solid #d0d5dd',
                color: '#344054',
                fontWeight: 700,
              }}
            >
              리스크 랭킹
            </Link>
            <Link
              href="/signals"
              style={{
                textDecoration: 'none',
                padding: '10px 14px',
                borderRadius: 12,
                background: '#ffffff',
                border: '1px solid #d0d5dd',
                color: '#344054',
                fontWeight: 700,
              }}
            >
              시그널
            </Link>
            <Link
              href="/watchlist"
              style={{
                textDecoration: 'none',
                padding: '10px 14px',
                borderRadius: 12,
                background: '#101828',
                border: '1px solid #101828',
                color: '#ffffff',
                fontWeight: 800,
              }}
            >
              관심목록
            </Link>
          </div>
        </div>

        {resolvedSearchParams.error ? (
          <div
            style={{
              marginBottom: 16,
              padding: '14px 16px',
              borderRadius: 14,
              background: '#fef3f2',
              border: '1px solid #fecdca',
              color: '#b42318',
              fontSize: 14,
              fontWeight: 600,
            }}
          >
            {decodeURIComponent(resolvedSearchParams.error)}
          </div>
        ) : null}

        {resolvedSearchParams.saved ? (
          <div
            style={{
              marginBottom: 16,
              padding: '14px 16px',
              borderRadius: 14,
              background: '#ecfdf3',
              border: '1px solid #abefc6',
              color: '#067647',
              fontSize: 14,
              fontWeight: 600,
            }}
          >
            관심목록에 저장되었습니다.
          </div>
        ) : null}

        {resolvedSearchParams.removed ? (
          <div
            style={{
              marginBottom: 16,
              padding: '14px 16px',
              borderRadius: 14,
              background: '#eff8ff',
              border: '1px solid #b2ddff',
              color: '#175cd3',
              fontSize: 14,
              fontWeight: 600,
            }}
          >
            관심목록에서 제거되었습니다.
          </div>
        ) : null}

        <section
          style={{
            display: 'grid',
            gridTemplateColumns: '1.4fr 0.8fr',
            gap: 16,
            marginBottom: 16,
          }}
        >
          <div
            style={{
              background: '#ffffff',
              border: '1px solid #eaecf0',
              borderRadius: 20,
              padding: 24,
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                gap: 16,
                flexWrap: 'wrap',
                alignItems: 'flex-start',
                marginBottom: 20,
              }}
            >
              <div>
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    padding: '7px 12px',
                    borderRadius: 999,
                    background: badge.background,
                    color: badge.color,
                    border: `1px solid ${badge.border}`,
                    fontWeight: 800,
                    fontSize: 12,
                    marginBottom: 12,
                  }}
                >
                  {gradeLabel(latest.risk_grade)}
                </div>

                <div
                  style={{
                    fontSize: 14,
                    color: '#667085',
                    fontWeight: 700,
                    marginBottom: 6,
                  }}
                >
                  최근 기준일
                </div>
                <div
                  style={{
                    fontSize: 16,
                    color: '#101828',
                    fontWeight: 700,
                  }}
                >
                  {latest.score_date || '-'}
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                {user ? (
                  savedWatchlistId ? (
                    <form action={removeWatchlistAction}>
                      <input type="hidden" name="watchlist_id" value={savedWatchlistId} />
                      <input type="hidden" name="return_to" value={currentPath} />
                      <button
                        type="submit"
                        style={{
                          border: '1px solid #d0d5dd',
                          background: '#ffffff',
                          color: '#344054',
                          borderRadius: 12,
                          padding: '11px 14px',
                          fontSize: 14,
                          fontWeight: 800,
                          cursor: 'pointer',
                        }}
                      >
                        저장됨
                      </button>
                    </form>
                  ) : (
                    <form action={addWatchlistAction}>
                      <input type="hidden" name="region_code" value={regionCode} />
                      <input type="hidden" name="category_id" value={categoryId} />
                      <input type="hidden" name="return_to" value={currentPath} />
                      <button
                        type="submit"
                        style={{
                          border: '1px solid #101828',
                          background: '#101828',
                          color: '#ffffff',
                          borderRadius: 12,
                          padding: '11px 14px',
                          fontSize: 14,
                          fontWeight: 800,
                          cursor: 'pointer',
                        }}
                      >
                        관심추가
                      </button>
                    </form>
                  )
                ) : (
                  <Link
                    href={`/auth/login?next=${encodeURIComponent(currentPath)}`}
                    style={{
                      textDecoration: 'none',
                      border: '1px solid #101828',
                      background: '#101828',
                      color: '#ffffff',
                      borderRadius: 12,
                      padding: '11px 14px',
                      fontSize: 14,
                      fontWeight: 800,
                    }}
                  >
                    로그인 후 저장
                  </Link>
                )}
              </div>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
                gap: 12,
              }}
            >
              <div
                style={{
                  background: '#f8fafc',
                  border: '1px solid #eaecf0',
                  borderRadius: 16,
                  padding: 18,
                }}
              >
                <div
                  style={{
                    fontSize: 13,
                    color: '#667085',
                    fontWeight: 700,
                    marginBottom: 8,
                  }}
                >
                  위험 점수
                </div>
                <div
                  style={{
                    fontSize: 28,
                    color: '#101828',
                    fontWeight: 800,
                  }}
                >
                  {scoreLabel(latest.risk_score)}
                </div>
              </div>

              <div
                style={{
                  background: '#f8fafc',
                  border: '1px solid #eaecf0',
                  borderRadius: 16,
                  padding: 18,
                }}
              >
                <div
                  style={{
                    fontSize: 13,
                    color: '#667085',
                    fontWeight: 700,
                    marginBottom: 8,
                  }}
                >
                  개업 수
                </div>
                <div
                  style={{
                    fontSize: 28,
                    color: '#101828',
                    fontWeight: 800,
                  }}
                >
                  {numberLabel(latest.open_count)}
                </div>
              </div>

              <div
                style={{
                  background: '#f8fafc',
                  border: '1px solid #eaecf0',
                  borderRadius: 16,
                  padding: 18,
                }}
              >
                <div
                  style={{
                    fontSize: 13,
                    color: '#667085',
                    fontWeight: 700,
                    marginBottom: 8,
                  }}
                >
                  폐업 수
                </div>
                <div
                  style={{
                    fontSize: 28,
                    color: '#101828',
                    fontWeight: 800,
                  }}
                >
                  {numberLabel(latest.close_count)}
                </div>
              </div>

              <div
                style={{
                  background: '#f8fafc',
                  border: '1px solid #eaecf0',
                  borderRadius: 16,
                  padding: 18,
                }}
              >
                <div
                  style={{
                    fontSize: 13,
                    color: '#667085',
                    fontWeight: 700,
                    marginBottom: 8,
                  }}
                >
                  폐업 비율
                </div>
                <div
                  style={{
                    fontSize: 28,
                    color: '#101828',
                    fontWeight: 800,
                  }}
                >
                  {latest.close_rate === null || latest.close_rate === undefined
                    ? '-'
                    : `${Number(latest.close_rate).toFixed(1)}%`}
                </div>
              </div>
            </div>
          </div>

          <aside
            style={{
              background: '#ffffff',
              border: '1px solid #eaecf0',
              borderRadius: 20,
              padding: 24,
            }}
          >
            <div
              style={{
                fontSize: 15,
                color: '#101828',
                fontWeight: 800,
                marginBottom: 14,
              }}
            >
              기본 정보
            </div>

            <div style={{ display: 'grid', gap: 12 }}>
              <div>
                <div
                  style={{
                    fontSize: 13,
                    color: '#667085',
                    fontWeight: 700,
                    marginBottom: 6,
                  }}
                >
                  지역 코드
                </div>
                <div
                  style={{
                    fontSize: 15,
                    color: '#101828',
                    fontWeight: 700,
                  }}
                >
                  {latest.region_code}
                </div>
              </div>

              <div>
                <div
                  style={{
                    fontSize: 13,
                    color: '#667085',
                    fontWeight: 700,
                    marginBottom: 6,
                  }}
                >
                  업종 ID
                </div>
                <div
                  style={{
                    fontSize: 15,
                    color: '#101828',
                    fontWeight: 700,
                  }}
                >
                  {latest.category_id}
                </div>
              </div>

              <div>
                <div
                  style={{
                    fontSize: 13,
                    color: '#667085',
                    fontWeight: 700,
                    marginBottom: 6,
                  }}
                >
                  업종명
                </div>
                <div
                  style={{
                    fontSize: 15,
                    color: '#101828',
                    fontWeight: 700,
                  }}
                >
                  {latest.category_name || `카테고리 ${latest.category_id}`}
                </div>
              </div>

              <div>
                <div
                  style={{
                    fontSize: 13,
                    color: '#667085',
                    fontWeight: 700,
                    marginBottom: 6,
                  }}
                >
                  활성 사업장 수
                </div>
                <div
                  style={{
                    fontSize: 15,
                    color: '#101828',
                    fontWeight: 700,
                  }}
                >
                  {numberLabel(latest.active_business_count)}
                </div>
              </div>
            </div>
          </aside>
        </section>

        <section
          style={{
            background: '#ffffff',
            border: '1px solid #eaecf0',
            borderRadius: 20,
            padding: 24,
            marginBottom: 16,
          }}
        >
          <div
            style={{
              fontSize: 18,
              color: '#101828',
              fontWeight: 800,
              marginBottom: 16,
            }}
          >
            최근 점수 흐름
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table
              style={{
                width: '100%',
                minWidth: 720,
                borderCollapse: 'collapse',
              }}
            >
              <thead>
                <tr style={{ background: '#f9fafb' }}>
                  {['기준일', '위험점수', '위험등급', '개업 수', '폐업 수', '폐업 비율'].map(
                    (label) => (
                      <th
                        key={label}
                        style={{
                          textAlign: 'left',
                          padding: '14px 16px',
                          fontSize: 13,
                          color: '#475467',
                          fontWeight: 700,
                          borderBottom: '1px solid #eaecf0',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {label}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {detailRows.map((row, index) => {
                  const rowBadge = gradeColors(row.risk_grade)

                  return (
                    <tr key={`${row.score_date || 'row'}-${index}`}>
                      <td
                        style={{
                          padding: '16px',
                          borderBottom: '1px solid #f2f4f7',
                          color: '#101828',
                          fontSize: 14,
                          fontWeight: 700,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {row.score_date || '-'}
                      </td>
                      <td
                        style={{
                          padding: '16px',
                          borderBottom: '1px solid #f2f4f7',
                          color: '#101828',
                          fontSize: 14,
                          fontWeight: 700,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {scoreLabel(row.risk_score)}
                      </td>
                      <td
                        style={{
                          padding: '16px',
                          borderBottom: '1px solid #f2f4f7',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            padding: '6px 10px',
                            borderRadius: 999,
                            fontSize: 12,
                            fontWeight: 800,
                            background: rowBadge.background,
                            color: rowBadge.color,
                            border: `1px solid ${rowBadge.border}`,
                          }}
                        >
                          {gradeLabel(row.risk_grade)}
                        </span>
                      </td>
                      <td
                        style={{
                          padding: '16px',
                          borderBottom: '1px solid #f2f4f7',
                          color: '#344054',
                          fontSize: 14,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {numberLabel(row.open_count)}
                      </td>
                      <td
                        style={{
                          padding: '16px',
                          borderBottom: '1px solid #f2f4f7',
                          color: '#344054',
                          fontSize: 14,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {numberLabel(row.close_count)}
                      </td>
                      <td
                        style={{
                          padding: '16px',
                          borderBottom: '1px solid #f2f4f7',
                          color: '#344054',
                          fontSize: 14,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {row.close_rate === null || row.close_rate === undefined
                          ? '-'
                          : `${Number(row.close_rate).toFixed(1)}%`}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </section>

        <section
          style={{
            background: '#ffffff',
            border: '1px solid #eaecf0',
            borderRadius: 20,
            padding: 24,
          }}
        >
          <div
            style={{
              fontSize: 18,
              color: '#101828',
              fontWeight: 800,
              marginBottom: 16,
            }}
          >
            관련 시그널
          </div>

          {relatedSignals.length === 0 ? (
            <div
              style={{
                borderRadius: 16,
                border: '1px dashed #d0d5dd',
                background: '#f9fafb',
                padding: 20,
                color: '#667085',
                fontSize: 14,
                fontWeight: 600,
              }}
            >
              현재 연결된 시그널이 없습니다.
            </div>
          ) : (
            <div style={{ display: 'grid', gap: 12 }}>
              {relatedSignals.map((signal, index) => {
                const signalBadge = gradeColors(signal.risk_grade)

                return (
                  <div
                    key={`${signal.signal_id || 'signal'}-${index}`}
                    style={{
                      border: '1px solid #eaecf0',
                      borderRadius: 16,
                      padding: 18,
                      background: '#fcfcfd',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        flexWrap: 'wrap',
                        marginBottom: 10,
                      }}
                    >
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          padding: '6px 10px',
                          borderRadius: 999,
                          fontSize: 12,
                          fontWeight: 800,
                          background: '#eff8ff',
                          color: '#175cd3',
                          border: '1px solid #b2ddff',
                        }}
                      >
                        {signal.signal_label || signal.signal_type || '시그널'}
                      </span>

                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          padding: '6px 10px',
                          borderRadius: 999,
                          fontSize: 12,
                          fontWeight: 800,
                          background: signalBadge.background,
                          color: signalBadge.color,
                          border: `1px solid ${signalBadge.border}`,
                        }}
                      >
                        {gradeLabel(signal.risk_grade)}
                      </span>

                      {signal.score_date ? (
                        <span
                          style={{
                            fontSize: 12,
                            color: '#667085',
                            fontWeight: 700,
                          }}
                        >
                          기준일 {signal.score_date}
                        </span>
                      ) : null}
                    </div>

                    <div
                      style={{
                        color: '#101828',
                        fontSize: 15,
                        lineHeight: 1.7,
                        fontWeight: 600,
                      }}
                    >
                      {signal.summary || '위험 변동 신호가 감지되었습니다.'}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  )
}
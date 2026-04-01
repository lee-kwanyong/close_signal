import Link from 'next/link'
import { loginAction } from './actions'

export default async function LoginPage({
  searchParams,
}: {
  searchParams?: Promise<{
    next?: string
    error?: string
  }>
}) {
  const params = (await searchParams) || {}
  const next = params.next && params.next.startsWith('/') ? params.next : '/'
  const error = params.error ? decodeURIComponent(params.error) : ''

  return (
    <main
      style={{
        minHeight: '100vh',
        background: '#f5f7fb',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '32px 20px',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 460,
          background: '#ffffff',
          border: '1px solid #eaecf0',
          borderRadius: 24,
          padding: 28,
          boxShadow: '0 8px 30px rgba(16,24,40,0.06)',
        }}
      >
        <div style={{ marginBottom: 20 }}>
          <div
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: '#667085',
              marginBottom: 8,
            }}
          >
            CLOSE SIGNAL
          </div>
          <h1
            style={{
              margin: 0,
              fontSize: 30,
              lineHeight: 1.2,
              fontWeight: 800,
              color: '#101828',
            }}
          >
            로그인
          </h1>
          <p
            style={{
              margin: '10px 0 0',
              fontSize: 14,
              lineHeight: 1.6,
              color: '#475467',
            }}
          >
            관심목록과 사용자 기능을 사용하려면 로그인해 주세요.
          </p>
        </div>

        {error ? (
          <div
            style={{
              marginBottom: 16,
              padding: '13px 14px',
              borderRadius: 14,
              background: '#fef3f2',
              border: '1px solid #fecdca',
              color: '#b42318',
              fontSize: 14,
              fontWeight: 600,
              lineHeight: 1.5,
            }}
          >
            {error}
          </div>
        ) : null}

        <form action={loginAction} style={{ display: 'grid', gap: 14 }}>
          <input type="hidden" name="next" value={next} />

          <div>
            <label
              htmlFor="email"
              style={{
                display: 'block',
                marginBottom: 8,
                fontSize: 14,
                fontWeight: 700,
                color: '#344054',
              }}
            >
              이메일
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              placeholder="you@example.com"
              style={{
                width: '100%',
                height: 48,
                borderRadius: 14,
                border: '1px solid #d0d5dd',
                padding: '0 14px',
                fontSize: 15,
                color: '#101828',
                outline: 'none',
                boxSizing: 'border-box',
                background: '#ffffff',
              }}
            />
          </div>

          <div>
            <label
              htmlFor="password"
              style={{
                display: 'block',
                marginBottom: 8,
                fontSize: 14,
                fontWeight: 700,
                color: '#344054',
              }}
            >
              비밀번호
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              placeholder="비밀번호 입력"
              style={{
                width: '100%',
                height: 48,
                borderRadius: 14,
                border: '1px solid #d0d5dd',
                padding: '0 14px',
                fontSize: 15,
                color: '#101828',
                outline: 'none',
                boxSizing: 'border-box',
                background: '#ffffff',
              }}
            />
          </div>

          <button
            type="submit"
            style={{
              marginTop: 4,
              height: 50,
              border: 'none',
              borderRadius: 14,
              background: '#101828',
              color: '#ffffff',
              fontSize: 15,
              fontWeight: 800,
              cursor: 'pointer',
            }}
          >
            로그인
          </button>
        </form>

        <div
          style={{
            marginTop: 18,
            display: 'flex',
            justifyContent: 'space-between',
            gap: 12,
            flexWrap: 'wrap',
          }}
        >
          <Link
            href="/"
            style={{
              textDecoration: 'none',
              color: '#475467',
              fontSize: 14,
              fontWeight: 600,
            }}
          >
            홈으로
          </Link>

          <div
            style={{
              fontSize: 14,
              color: '#667085',
            }}
          >
            테스트 계정이 없으면 Supabase Auth에서 먼저 생성
          </div>
        </div>
      </div>
    </main>
  )
}
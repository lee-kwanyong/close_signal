# Closure Signal

소상공인 폐업위험 예측 엔진을 메인 제품으로 둔 Next.js + Supabase 프로젝트입니다. 기존 Growth Signal 300 구조는 유지하되, 성장 점수는 폐업위험을 낮추기 위한 보조 지표로 사용합니다.

## 제품 방향

```text
메인 기능: 폐업위험 예측 엔진
서브 기능: 리뷰 계정 연동 / 리뷰 데이터 feature 모듈
보조 지표: 성장 개선 점수, 미션, 고객성공 큐
```

리뷰 플랫폼 연동은 독립 서비스가 아니라 아래 흐름의 데이터 입력 모듈입니다.

```text
review_platform_connections
  → review_weekly_stats / review_issue_snapshots
  → closure risk feature
  → predictClosureRisk()
  → closure_risk_snapshot + score_result.component_detail_json.closure_risk
```

## 구조

```text
Supabase  : PostgreSQL DB, SQL migration
Next.js   : 폐업위험 리포트, 액션 상세 화면, 관리자 화면
Node.js   : API Route, 폐업위험/성장 엔진, 데이터 sync, CSV import script
Vercel    : 배포, serverless API, cron job
```

## 1. Supabase migration 적용

SQL Editor에서 아래 순서대로 실행합니다.

```text
supabase/migrations/001_growth_signal_300_core_public.sql
supabase/migrations/002_real_data_layers_public.sql
supabase/migrations/003_cloud_extra_seeds.sql
supabase/migrations/004_closure_risk_main_review_submodule.sql
```

`004_closure_risk_main_review_submodule.sql`은 다음을 추가합니다.

```text
closure_risk_snapshot
business_sales_daily
business_cost_monthly
regional_market_indicators
external_closure_stats
review_platform_connections.account_identifier
review_weekly_stats
review_issue_snapshots
upsert_review_platform_connection RPC
```

적용 후 Supabase API 스키마 새로고침:

```sql
NOTIFY pgrst, 'reload schema';
```

## 2. 환경변수 설정

로컬에서는 `.env.local`을 만듭니다.

```bash
cp .env.example .env.local
```

필수 값:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
SENSITIVE_HASH_SECRET=
NEXT_PUBLIC_APP_URL=http://localhost:3000
CRON_SECRET=
```

`SUPABASE_SERVICE_ROLE_KEY`는 서버 API와 import script에서만 사용합니다. 브라우저에 노출하지 마세요.

## 3. Windows 로컬 실행

PowerShell 기준:

```powershell
npm install
npm run typecheck
npm run dev
```

브라우저:

```text
http://localhost:3000
```

## 4. 데모 고객 생성 + sync/all + 점수 생성

Next.js dev server가 켜진 상태에서:

```bash
npm run seed:demo
```

출력되는 `growth_report_url`을 브라우저에 붙여넣으면 폐업위험 리포트가 열립니다.

## 5. 주요 화면

```text
/customers/{customerId}/growth-report        폐업위험 메인 리포트
/customers/{customerId}/actions/{actionId}   액션 상세
/admin/customer-success                      고객성공 큐
```

## 6. 주요 API

기존 API 경로는 호환성을 위해 유지합니다. 다만 결과에는 이제 `closure_risk` 블록이 포함됩니다.

```text
POST /api/v1/customers/{customerId}/growth-signal/run
GET  /api/v1/customers/{customerId}/growth-signal/latest
```

`run` 실행 시:

```text
1. Supabase feature 로드
2. predictClosureRisk() 실행
3. score_result 저장
4. closure_risk_snapshot 저장
5. growth mission/sprint 생성
```

## 7. Git 기준 정리

Git에서 원본 프로젝트를 복구할 때는 소스와 설정 파일만 가져오세요.

가져올 파일/폴더:

```text
app/
components/
lib/
scripts/
sample_data/
supabase/migrations/001_growth_signal_300_core_public.sql
supabase/migrations/002_real_data_layers_public.sql
supabase/migrations/003_cloud_extra_seeds.sql
package.json
package-lock.json
tsconfig.json
next.config.mjs
vercel.json
.env.example
README.md
```

가져오거나 커밋하지 말 것:

```text
node_modules/
.next/
.env.local
```

그다음 이 수정본의 아래 파일을 덮어씌우면 됩니다.

```text
lib/closure-risk/*
components/risk/*
lib/engine/run.ts
lib/dto.ts
lib/mock-data.ts
app/customers/[customerId]/growth-report/page.tsx
app/api/v1/customers/[customerId]/growth-signal/run/route.ts
components/GrowthScoreHero.tsx
components/ComponentScoreGrid.tsx
components/AppShell.tsx
app/page.tsx
app/globals.css
supabase/migrations/004_closure_risk_main_review_submodule.sql
```

## 8. 운영 메모

- 처음에는 rule-based 폐업위험 엔진으로 시작합니다.
- 리뷰 데이터가 없어도 매출/비용/상권 데이터로 진단이 가능합니다.
- 리뷰 연동은 예측 정확도를 높이는 서브 모듈로 유지합니다.
- 향후 실제 리뷰 수집이 붙으면 `review_weekly_stats`, `review_issue_snapshots`를 채우고 엔진 feature로 반영하면 됩니다.

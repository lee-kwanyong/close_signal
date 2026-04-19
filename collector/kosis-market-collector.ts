import { loadEnvConfig } from '@next/env'
import { createSupabaseAdmin } from '@/lib/close-signal/supabase-admin'

loadEnvConfig(process.cwd())

type Json =
  | null
  | string
  | number
  | boolean
  | Json[]
  | { [key: string]: Json }

type CatalogRow = {
  indicator_key: string
  stage: number
  title: string
  description: string | null
  source_group: string
  endpoint_path: string
  table_id: string
  cycle: 'M' | 'Q' | 'A'
  value_unit: string | null
  region_required: boolean
  category_required: boolean
  request_params: Record<string, Json>
  response_data_path: string[]
  period_field: string
  value_field: string
  label_field: string
  is_active: boolean
}

type RegionMapRow = {
  region_code: string
  region_name: string | null
  kosis_region_code: string
  level: 'sido' | 'sigungu' | 'emd'
  fallback_region_code: string | null
}

type CategoryMapRow = {
  category_id: string
  indicator_key: string
  kosis_class_code: string
  label: string | null
  weight: number
}

type RawUpsertRow = {
  indicator_key: string
  region_code: string
  category_id: string
  base_period: string
  period_type: 'M' | 'Q' | 'A'
  value_num: number | null
  value_text: string | null
  label: string | null
  source_value: Record<string, Json>
  source_table_id: string
  source_region_code: string | null
  source_class_code: string | null
  collected_at: string
}

type CollectJob = {
  catalog: CatalogRow
  region: RegionMapRow
  category_id: string
  kosis_class_code: string | null
  startPeriod: string
  endPeriod: string
}

const supabase = createSupabaseAdmin()

const KOSIS_API_KEY = requireEnv('KOSIS_API_KEY')
const KOSIS_BASE_URL = process.env.KOSIS_OPEN_API_BASE_URL || 'https://kosis.kr'
const REQUEST_TIMEOUT_MS = toPositiveInt(process.env.KOSIS_REQUEST_TIMEOUT_MS, 30000)
const THROTTLE_MS = toPositiveInt(process.env.KOSIS_THROTTLE_MS, 300)
const UPSERT_BATCH_SIZE = toPositiveInt(process.env.KOSIS_UPSERT_BATCH_SIZE, 500)
const BACKFILL_PERIODS = toPositiveInt(process.env.KOSIS_BACKFILL_PERIODS, 2)
const RETRY_COUNT = toPositiveInt(process.env.KOSIS_RETRY_COUNT, 2)

type ParsedArgs = {
  stage: 1 | 2 | null
  indicator: string | null
  region: string | null
  category: string | null
  backfillPeriods: number
}

function requireEnv(name: string) {
  const value = process.env[name]
  if (!value) {
    throw new Error(`${name} is missing`)
  }
  return value
}

function toPositiveInt(value: string | undefined, fallback: number) {
  const n = Number(value)
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback
}

function parseArgs(argv: string[]): ParsedArgs {
  const args = new Map<string, string>()

  for (const token of argv.slice(2)) {
    if (!token.startsWith('--')) continue
    const eqIndex = token.indexOf('=')

    if (eqIndex === -1) {
      args.set(token.slice(2), 'true')
      continue
    }

    args.set(token.slice(2, eqIndex), token.slice(eqIndex + 1))
  }

  const stageRaw = args.get('stage')
  const stage =
    stageRaw === '1' ? 1 : stageRaw === '2' ? 2 : null

  return {
    stage,
    indicator: args.get('indicator') || null,
    region: args.get('region') || null,
    category: args.get('category') || null,
    backfillPeriods: toPositiveInt(args.get('backfillPeriods'), BACKFILL_PERIODS),
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function isRecord(value: unknown): value is Record<string, Json> {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

function chunk<T>(items: T[], size: number) {
  const out: T[][] = []
  for (let i = 0; i < items.length; i += size) {
    out.push(items.slice(i, i + size))
  }
  return out
}

function getTodayKstDate() {
  const now = new Date()
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000)
  return {
    year: kst.getUTCFullYear(),
    month: kst.getUTCMonth() + 1,
  }
}

function formatMonth(year: number, month: number) {
  return `${year}-${String(month).padStart(2, '0')}`
}

function shiftMonth(year: number, month: number, diff: number) {
  const d = new Date(Date.UTC(year, month - 1 + diff, 1))
  return {
    year: d.getUTCFullYear(),
    month: d.getUTCMonth() + 1,
  }
}

function getQuarter(month: number) {
  if (month <= 3) return 1
  if (month <= 6) return 2
  if (month <= 9) return 3
  return 4
}

function shiftQuarter(year: number, quarter: number, diff: number) {
  const month = (quarter - 1) * 3 + 1
  const shifted = new Date(Date.UTC(year, month - 1 + diff * 3, 1))
  return {
    year: shifted.getUTCFullYear(),
    quarter: getQuarter(shifted.getUTCMonth() + 1),
  }
}

function periodWindow(cycle: 'M' | 'Q' | 'A', backfillPeriods: number) {
  const today = getTodayKstDate()

  if (cycle === 'M') {
    const end = { year: today.year, month: today.month }
    const start = shiftMonth(today.year, today.month, -(backfillPeriods - 1))
    return {
      startPeriod: formatMonth(start.year, start.month),
      endPeriod: formatMonth(end.year, end.month),
    }
  }

  if (cycle === 'Q') {
    const currentQuarter = getQuarter(today.month)
    const end = { year: today.year, quarter: currentQuarter }
    const start = shiftQuarter(today.year, currentQuarter, -(backfillPeriods - 1))
    return {
      startPeriod: `${start.year}-Q${start.quarter}`,
      endPeriod: `${end.year}-Q${end.quarter}`,
    }
  }

  const endYear = today.year
  const startYear = endYear - (backfillPeriods - 1)

  return {
    startPeriod: String(startYear),
    endPeriod: String(endYear),
  }
}

function normalizePeriod(raw: unknown, cycle: 'M' | 'Q' | 'A', fallback: string) {
  const text = String(raw ?? '').trim()
  if (!text) return fallback

  if (cycle === 'M') {
    const m1 = text.match(/^(\d{4})[-.]?(\d{2})$/)
    if (m1) {
      return `${m1[1]}-${m1[2]}`
    }
  }

  if (cycle === 'Q') {
    const q1 = text.match(/^(\d{4})[-.]?Q([1-4])$/i)
    if (q1) {
      return `${q1[1]}-Q${q1[2]}`
    }
    const q2 = text.match(/^(\d{4})년?\s*([1-4])분기$/)
    if (q2) {
      return `${q2[1]}-Q${q2[2]}`
    }
  }

  if (cycle === 'A') {
    const y1 = text.match(/^(\d{4})$/)
    if (y1) {
      return y1[1]
    }
  }

  return fallback
}

function toNumeric(value: unknown) {
  if (value === null || value === undefined) return null
  if (typeof value === 'number') return Number.isFinite(value) ? value : null

  const text = String(value).trim()
  if (!text) return null

  const normalized = text.replace(/,/g, '').replace(/%/g, '').replace(/[^\d.-]/g, '')
  if (!normalized) return null

  const num = Number(normalized)
  return Number.isFinite(num) ? num : null
}

function getByPath(value: unknown, path: string[]) {
  let current: unknown = value

  for (const key of path) {
    if (!current || typeof current !== 'object' || Array.isArray(current)) {
      return undefined
    }
    current = (current as Record<string, unknown>)[key]
  }

  return current
}

function resolveDataArray(payload: unknown, path: string[]) {
  if (path.length > 0) {
    const found = getByPath(payload, path)
    if (Array.isArray(found)) return found
  }

  if (Array.isArray(payload)) return payload
  if (!payload || typeof payload !== 'object') return []

  const root = payload as Record<string, unknown>

  if (Array.isArray(root.data)) return root.data
  if (Array.isArray(root.DATA)) return root.DATA
  if (Array.isArray(root.result)) return root.result
  if (Array.isArray(root.RESULT)) return root.RESULT

  if (root.response && typeof root.response === 'object') {
    const response = root.response as Record<string, unknown>

    if (Array.isArray(response.data)) return response.data
    if (Array.isArray(response.DATA)) return response.DATA

    if (response.body && typeof response.body === 'object') {
      const body = response.body as Record<string, unknown>
      if (Array.isArray(body.data)) return body.data
      if (Array.isArray(body.items)) return body.items
      if (body.items && typeof body.items === 'object') {
        const items = body.items as Record<string, unknown>
        if (Array.isArray(items.item)) return items.item
      }
    }
  }

  return []
}

function replaceTemplates(value: Json, context: Record<string, string | null>): Json {
  if (typeof value === 'string') {
    return value.replace(/\{([A-Z0-9_]+)\}/g, (_, key: string) => context[key] ?? '')
  }

  if (Array.isArray(value)) {
    return value.map((item) => replaceTemplates(item, context))
  }

  if (isRecord(value)) {
    const next: Record<string, Json> = {}
    for (const [k, v] of Object.entries(value)) {
      next[k] = replaceTemplates(v, context)
    }
    return next
  }

  return value
}

function buildUrl(job: CollectJob) {
  const context = {
    REGION_CODE: job.region.kosis_region_code,
    CATEGORY_CODE: job.kosis_class_code,
    START_PERIOD: job.startPeriod,
    END_PERIOD: job.endPeriod,
    TABLE_ID: job.catalog.table_id,
    API_KEY: KOSIS_API_KEY,
  }

  const requestParams = replaceTemplates(job.catalog.request_params as Json, context)
  const url = new URL(job.catalog.endpoint_path, KOSIS_BASE_URL)

  const mergedParams: Record<string, Json> = {
    method: 'getList',
    apiKey: KOSIS_API_KEY,
    format: 'json',
    jsonVD: 'Y',
    tblId: job.catalog.table_id,
    ...(isRecord(requestParams) ? requestParams : {}),
  }

  for (const [key, value] of Object.entries(mergedParams)) {
    if (value === null || value === undefined) continue

    if (Array.isArray(value)) {
      for (const item of value) {
        if (item === null || item === undefined) continue
        url.searchParams.append(key, String(item))
      }
      continue
    }

    if (typeof value === 'object') {
      url.searchParams.set(key, JSON.stringify(value))
      continue
    }

    url.searchParams.set(key, String(value))
  }

  return url.toString()
}

async function fetchJsonWithRetry(url: string) {
  let lastError: unknown = null

  for (let attempt = 0; attempt <= RETRY_COUNT; attempt += 1) {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          Accept: 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error(`KOSIS request failed: ${response.status} ${response.statusText}`)
      }

      const data = (await response.json()) as unknown
      clearTimeout(timeout)
      return data
    } catch (error) {
      clearTimeout(timeout)
      lastError = error

      if (attempt < RETRY_COUNT) {
        await sleep(THROTTLE_MS * (attempt + 1))
      }
    }
  }

  throw lastError instanceof Error ? lastError : new Error(String(lastError))
}

async function loadCatalog(args: ParsedArgs) {
  let query = supabase
    .from('kosis_indicator_catalog')
    .select(
      [
        'indicator_key',
        'stage',
        'title',
        'description',
        'source_group',
        'endpoint_path',
        'table_id',
        'cycle',
        'value_unit',
        'region_required',
        'category_required',
        'request_params',
        'response_data_path',
        'period_field',
        'value_field',
        'label_field',
        'is_active',
      ].join(','),
    )
    .eq('is_active', true)
    .order('stage', { ascending: true })
    .order('indicator_key', { ascending: true })

  if (args.stage !== null) {
    query = query.eq('stage', args.stage)
  }

  if (args.indicator) {
    query = query.eq('indicator_key', args.indicator)
  }

  const { data, error } = await query

  if (error) {
    throw new Error(`failed to load kosis_indicator_catalog: ${error.message}`)
  }

  return (data ?? []) as CatalogRow[]
}

async function loadRegionMaps(args: ParsedArgs) {
  let query = supabase
    .from('region_kosis_map')
    .select('region_code, region_name, kosis_region_code, level, fallback_region_code')
    .order('region_code', { ascending: true })

  if (args.region) {
    query = query.eq('region_code', args.region)
  }

  const { data, error } = await query

  if (error) {
    throw new Error(`failed to load region_kosis_map: ${error.message}`)
  }

  return (data ?? []) as RegionMapRow[]
}

async function loadCategoryMaps(catalog: CatalogRow[], args: ParsedArgs) {
  const indicatorKeys = catalog
    .filter((row) => row.category_required)
    .map((row) => row.indicator_key)

  if (indicatorKeys.length === 0) {
    return [] as CategoryMapRow[]
  }

  let query = supabase
    .from('category_kosis_map')
    .select('category_id, indicator_key, kosis_class_code, label, weight')
    .in('indicator_key', indicatorKeys)
    .order('indicator_key', { ascending: true })
    .order('category_id', { ascending: true })

  if (args.category) {
    query = query.eq('category_id', args.category)
  }

  const { data, error } = await query

  if (error) {
    throw new Error(`failed to load category_kosis_map: ${error.message}`)
  }

  return (data ?? []) as CategoryMapRow[]
}

function buildJobs(
  catalogRows: CatalogRow[],
  regionRows: RegionMapRow[],
  categoryRows: CategoryMapRow[],
  backfillPeriods: number,
) {
  const jobs: CollectJob[] = []

  for (const catalog of catalogRows) {
    const window = periodWindow(catalog.cycle, backfillPeriods)

    if (catalog.category_required) {
      const filteredCategories = categoryRows.filter(
        (row) => row.indicator_key === catalog.indicator_key,
      )

      for (const region of regionRows) {
        for (const category of filteredCategories) {
          jobs.push({
            catalog,
            region,
            category_id: category.category_id,
            kosis_class_code: category.kosis_class_code,
            startPeriod: window.startPeriod,
            endPeriod: window.endPeriod,
          })
        }
      }

      continue
    }

    for (const region of regionRows) {
      jobs.push({
        catalog,
        region,
        category_id: '__ALL__',
        kosis_class_code: null,
        startPeriod: window.startPeriod,
        endPeriod: window.endPeriod,
      })
    }
  }

  return jobs
}

function toSourceValue(item: unknown) {
  if (isRecord(item)) {
    return item
  }

  return {
    value: item === undefined ? null : (item as Json),
  }
}

function extractRawRows(job: CollectJob, payload: unknown) {
  const items = resolveDataArray(payload, job.catalog.response_data_path)
  const fallbackPeriod = job.endPeriod
  const collectedAt = new Date().toISOString()

  const rows: RawUpsertRow[] = []

  for (const item of items) {
    const record = isRecord(item) ? item : { value: item as Json }

    const periodRaw = record[job.catalog.period_field]
    const valueRaw = record[job.catalog.value_field]
    const labelRaw = record[job.catalog.label_field]

    const basePeriod = normalizePeriod(periodRaw, job.catalog.cycle, fallbackPeriod)
    const valueNum = toNumeric(valueRaw)
    const valueText =
      valueRaw === null || valueRaw === undefined ? null : String(valueRaw)
    const label =
      labelRaw === null || labelRaw === undefined ? null : String(labelRaw)

    rows.push({
      indicator_key: job.catalog.indicator_key,
      region_code: job.region.region_code,
      category_id: job.category_id,
      base_period: basePeriod,
      period_type: job.catalog.cycle,
      value_num: valueNum,
      value_text: valueText,
      label,
      source_value: toSourceValue(item),
      source_table_id: job.catalog.table_id,
      source_region_code: job.region.kosis_region_code,
      source_class_code: job.kosis_class_code,
      collected_at: collectedAt,
    })
  }

  return rows
}

async function upsertRawRows(rows: RawUpsertRow[]) {
  for (const batch of chunk(rows, UPSERT_BATCH_SIZE)) {
    const { error } = await supabase
      .from('regional_market_indicators_raw')
      .upsert(batch, {
        onConflict: 'indicator_key,region_code,category_id,base_period',
      })

    if (error) {
      throw new Error(`regional_market_indicators_raw upsert failed: ${error.message}`)
    }
  }
}

async function rebuild(region: string | null, category: string | null) {
  const { error: indicatorsError } = await supabase.rpc(
    'rebuild_regional_market_indicators',
    {
      p_region_code: region,
      p_category_id: category,
      p_base_period: null,
    },
  )

  if (indicatorsError) {
    throw new Error(`rebuild_regional_market_indicators failed: ${indicatorsError.message}`)
  }

  const { error: scoresError } = await supabase.rpc(
    'rebuild_regional_market_scores',
    {
      p_region_code: region,
      p_category_id: category,
      p_base_period: null,
    },
  )

  if (scoresError) {
    throw new Error(`rebuild_regional_market_scores failed: ${scoresError.message}`)
  }
}

async function main() {
  const startedAt = Date.now()
  const args = parseArgs(process.argv)

  const catalogRows = await loadCatalog(args)
  if (catalogRows.length === 0) {
    throw new Error('no active KOSIS indicators found')
  }

  const regionRows = await loadRegionMaps(args)
  if (regionRows.length === 0) {
    throw new Error('no region_kosis_map rows found')
  }

  const categoryRows = await loadCategoryMaps(catalogRows, args)
  const jobs = buildJobs(catalogRows, regionRows, categoryRows, args.backfillPeriods)

  if (jobs.length === 0) {
    throw new Error('no collection jobs built')
  }

  let totalRawRows = 0
  const summaries: Array<{
    indicator_key: string
    region_code: string
    category_id: string
    row_count: number
  }> = []

  for (const job of jobs) {
    const url = buildUrl(job)
    const payload = await fetchJsonWithRetry(url)
    const rows = extractRawRows(job, payload)

    if (rows.length > 0) {
      await upsertRawRows(rows)
      totalRawRows += rows.length
    }

    summaries.push({
      indicator_key: job.catalog.indicator_key,
      region_code: job.region.region_code,
      category_id: job.category_id,
      row_count: rows.length,
    })

    await sleep(THROTTLE_MS)
  }

  await rebuild(args.region, args.category)

  console.log(
    JSON.stringify(
      {
        ok: true,
        jobs: jobs.length,
        raw_rows: totalRawRows,
        duration_ms: Date.now() - startedAt,
        filters: {
          stage: args.stage,
          indicator: args.indicator,
          region: args.region,
          category: args.category,
          backfillPeriods: args.backfillPeriods,
        },
        summaries,
      },
      null,
      2,
    ),
  )
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
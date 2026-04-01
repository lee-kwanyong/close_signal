import { createSupabaseAdmin } from '@/lib/close-signal/supabase-admin'
import { spawn } from 'node:child_process'

async function run() {
  const supabase = createSupabaseAdmin()

  const { data, error } = await supabase
    .from('sources')
    .select('source_key, priority, is_active')
    .eq('is_active', true)
    .order('priority', { ascending: true })

  if (error) {
    throw new Error(error.message)
  }

  const sources = data || []

  for (const source of sources) {
    await new Promise<void>((resolve, reject) => {
      const child = spawn(
        process.platform === 'win32' ? 'npx.cmd' : 'npx',
        ['tsx', 'workers/run-source.ts', source.source_key],
        {
          stdio: 'inherit',
          shell: false,
        },
      )

      child.on('close', (code) => {
        if (code === 0) {
          resolve()
        } else {
          reject(new Error(`source run failed: ${source.source_key}`))
        }
      })
    })
  }
}

run().catch((error) => {
  console.error(error)
  process.exit(1)
})
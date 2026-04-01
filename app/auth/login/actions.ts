'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

function getSafeNext(nextValue: string | null | undefined) {
  if (!nextValue) return '/'
  if (!nextValue.startsWith('/')) return '/'
  if (nextValue.startsWith('//')) return '/'
  return nextValue
}

export async function loginAction(formData: FormData) {
  const email = String(formData.get('email') || '').trim()
  const password = String(formData.get('password') || '')
  const next = getSafeNext(String(formData.get('next') || '/'))

  if (!email || !password) {
    redirect(
      `/auth/login?next=${encodeURIComponent(next)}&error=${encodeURIComponent(
        '이메일과 비밀번호를 입력해 주세요.',
      )}`,
    )
  }

  const supabase = await createClient()

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    redirect(
      `/auth/login?next=${encodeURIComponent(next)}&error=${encodeURIComponent(
        error.message,
      )}`,
    )
  }

  redirect(next)
}
import { NextResponse } from 'next/server'
import { sessionCookieOptions } from '@/lib/auth'
import { SESSION_COOKIE } from '@/lib/session'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST() {
  const res = NextResponse.json({ ok: true })
  res.cookies.set(SESSION_COOKIE, '', { ...sessionCookieOptions, maxAge: 0 })
  return res
}

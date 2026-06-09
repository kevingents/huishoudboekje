import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifyPassword, sessionCookieOptions } from '@/lib/auth'
import { signSession, SESSION_COOKIE } from '@/lib/session'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(req: Request) {
  const body = await req.json()
  const email = String(body?.email ?? '').trim().toLowerCase()
  const password = String(body?.password ?? '')

  const user = await prisma.user.findUnique({ where: { email } })
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return NextResponse.json({ error: 'Onjuist e-mailadres of wachtwoord.' }, { status: 401 })
  }

  const res = NextResponse.json({ user: { id: user.id, name: user.name, email: user.email } })
  res.cookies.set(SESSION_COOKIE, await signSession(user.id), sessionCookieOptions)
  return res
}

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifyLoginLink } from '@/lib/loginlink'
import { sessionCookieOptions } from '@/lib/auth'
import { signSession, SESSION_COOKIE } from '@/lib/session'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get('token') ?? ''
  const payload = await verifyLoginLink(token, Date.now())

  if (!payload) {
    return NextResponse.redirect(new URL('/inloggen?fout=link', req.url))
  }

  // Account moet nog bestaan met hetzelfde e-mailadres.
  const user = await prisma.user.findUnique({ where: { id: payload.userId } })
  if (!user || user.email !== payload.email) {
    return NextResponse.redirect(new URL('/inloggen?fout=link', req.url))
  }

  const res = NextResponse.redirect(new URL('/vandaag', req.url))
  res.cookies.set(SESSION_COOKIE, await signSession(user.id), sessionCookieOptions)
  return res
}

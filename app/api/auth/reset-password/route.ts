import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifyReset } from '@/lib/reset'
import { hashPassword, sessionCookieOptions } from '@/lib/auth'
import { signSession, SESSION_COOKIE } from '@/lib/session'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}))
  const token = String(body?.token ?? '')
  const password = String(body?.password ?? '')

  if (password.length < 6) {
    return NextResponse.json({ error: 'Kies een wachtwoord van minstens 6 tekens.' }, { status: 400 })
  }

  const payload = await verifyReset(token, Date.now())
  if (!payload) {
    return NextResponse.json(
      { error: 'Deze herstel-link is ongeldig of verlopen. Vraag een nieuwe aan.' },
      { status: 400 },
    )
  }

  // Controleer dat het account nog bestaat met dit e-mailadres.
  const user = await prisma.user.findUnique({ where: { id: payload.userId } })
  if (!user || user.email !== payload.email) {
    return NextResponse.json({ error: 'Account niet gevonden.' }, { status: 404 })
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: await hashPassword(password) },
  })

  // Log de gebruiker meteen in met het nieuwe wachtwoord.
  const res = NextResponse.json({ user: { id: user.id, name: user.name, email: user.email } })
  res.cookies.set(SESSION_COOKIE, await signSession(user.id), sessionCookieOptions)
  return res
}

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { hashPassword, sessionCookieOptions } from '@/lib/auth'
import { signSession, SESSION_COOKIE } from '@/lib/session'
import { verifyInvite } from '@/lib/invite'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

function initialsFrom(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export async function POST(req: Request) {
  const body = await req.json()
  const token = String(body?.token ?? '')
  const name = String(body?.name ?? '').trim()
  const password = String(body?.password ?? '')

  const payload = await verifyInvite(token, Date.now())
  if (!payload) {
    return NextResponse.json({ error: 'Deze uitnodiging is ongeldig of verlopen.' }, { status: 400 })
  }
  if (!name || password.length < 6) {
    return NextResponse.json(
      { error: 'Vul je naam en een wachtwoord van minstens 6 tekens in.' },
      { status: 400 },
    )
  }

  const household = await prisma.household.findUnique({ where: { id: payload.householdId } })
  if (!household) {
    return NextResponse.json({ error: 'Het huishouden bestaat niet meer.' }, { status: 400 })
  }

  const existing = await prisma.user.findUnique({ where: { email: payload.email } })
  if (existing) {
    return NextResponse.json({ error: 'Er bestaat al een account met dit e-mailadres.' }, { status: 409 })
  }

  const user = await prisma.user.create({
    data: {
      name,
      email: payload.email,
      passwordHash: await hashPassword(password),
      householdId: payload.householdId,
      role: 'member',
    },
  })

  // Voeg toe als gezinslid als die er nog niet is (op naam).
  const member = await prisma.familyMember.findFirst({
    where: { householdId: payload.householdId, name },
  })
  if (!member) {
    await prisma.familyMember.create({
      data: { householdId: payload.householdId, name, initials: initialsFrom(name), color: 'from-teal-400 to-cyan-500' },
    })
  }

  const res = NextResponse.json({ user: { id: user.id, name: user.name, email: user.email } })
  res.cookies.set(SESSION_COOKIE, await signSession(user.id), sessionCookieOptions)
  return res
}

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { hashPassword, sessionCookieOptions } from '@/lib/auth'
import { signSession, SESSION_COOKIE } from '@/lib/session'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

function initialsFrom(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

const GRADIENTS = [
  'from-sky-400 to-blue-500',
  'from-amber-400 to-orange-500',
  'from-emerald-400 to-green-500',
  'from-violet-400 to-purple-500',
  'from-rose-400 to-pink-500',
  'from-teal-400 to-cyan-500',
]

export async function POST(req: Request) {
  const body = await req.json()
  const name = String(body?.name ?? '').trim()
  const email = String(body?.email ?? '').trim().toLowerCase()
  const password = String(body?.password ?? '')

  if (!name || !email || password.length < 6) {
    return NextResponse.json(
      { error: 'Vul je naam, e-mailadres en een wachtwoord van minstens 6 tekens in.' },
      { status: 400 },
    )
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'Vul een geldig e-mailadres in.' }, { status: 400 })
  }

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    return NextResponse.json({ error: 'Er bestaat al een account met dit e-mailadres.' }, { status: 409 })
  }

  const user = await prisma.user.create({
    data: { name, email, passwordHash: await hashPassword(password) },
  })

  // Eventuele gezinsleden die tijdens registratie zijn opgegeven.
  const members = Array.isArray(body?.members) ? body.members : []
  let index = await prisma.familyMember.count()
  for (const m of members) {
    const memberName = String(m?.name ?? '').trim()
    if (!memberName) continue
    await prisma.familyMember.create({
      data: {
        name: memberName,
        initials: initialsFrom(memberName),
        color: GRADIENTS[index % GRADIENTS.length],
        role: m?.role ? String(m.role) : null,
        birthday: m?.birthday ? String(m.birthday) : null,
      },
    })
    index++
  }

  const res = NextResponse.json(
    { user: { id: user.id, name: user.name, email: user.email } },
    { status: 201 },
  )
  res.cookies.set(SESSION_COOKIE, await signSession(user.id), sessionCookieOptions)
  return res
}

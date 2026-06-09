import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser, hashPassword, verifyPassword } from '@/lib/auth'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(req: Request) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })
  const body = await req.json().catch(() => ({}))
  const current = String(body?.currentPassword ?? '')
  const next = String(body?.newPassword ?? '')
  if (next.length < 6) {
    return NextResponse.json({ error: 'Het nieuwe wachtwoord moet minstens 6 tekens zijn.' }, { status: 400 })
  }
  const full = await prisma.user.findUnique({ where: { id: user.id }, select: { passwordHash: true } })
  if (!full || !(await verifyPassword(current, full.passwordHash))) {
    return NextResponse.json({ error: 'Je huidige wachtwoord klopt niet.' }, { status: 403 })
  }
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash: await hashPassword(next) } })
  return NextResponse.json({ ok: true })
}

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const SELECT = {
  id: true,
  name: true,
  email: true,
  avatarUrl: true,
  nickname: true,
  phone: true,
  address: true,
  birthday: true,
  emergencyContact: true,
  role: true,
} as const

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })
  const profile = await prisma.user.findUnique({ where: { id: user.id }, select: SELECT })
  return NextResponse.json(profile)
}

export async function PATCH(req: Request) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })
  const body = await req.json().catch(() => ({}))
  const data: Record<string, unknown> = {}

  if (body.name !== undefined) {
    const name = String(body.name).trim()
    if (!name) return NextResponse.json({ error: 'Vul je naam in.' }, { status: 400 })
    data.name = name
  }
  if (body.email !== undefined) {
    const email = String(body.email).trim().toLowerCase()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Vul een geldig e-mailadres in.' }, { status: 400 })
    }
    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing && existing.id !== user.id) {
      return NextResponse.json({ error: 'Dit e-mailadres is al in gebruik.' }, { status: 409 })
    }
    data.email = email
  }
  if (body.avatarUrl !== undefined) data.avatarUrl = body.avatarUrl ? String(body.avatarUrl) : null
  if (body.nickname !== undefined) data.nickname = body.nickname ? String(body.nickname) : null
  if (body.phone !== undefined) data.phone = body.phone ? String(body.phone) : null
  if (body.address !== undefined) data.address = body.address ? String(body.address) : null
  if (body.birthday !== undefined) data.birthday = body.birthday ? String(body.birthday) : null
  if (body.emergencyContact !== undefined)
    data.emergencyContact = body.emergencyContact ? String(body.emergencyContact) : null

  const updated = await prisma.user.update({ where: { id: user.id }, data, select: SELECT })
  return NextResponse.json(updated)
}

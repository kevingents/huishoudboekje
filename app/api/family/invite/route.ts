import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { signInvite } from '@/lib/invite'
import { sendEmail, emailLayout } from '@/lib/email'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(req: Request) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })

  const body = await req.json()
  const email = String(body?.email ?? '').trim().toLowerCase()
  const name = String(body?.name ?? '').trim()
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'Vul een geldig e-mailadres in.' }, { status: 400 })
  }

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    return NextResponse.json({ error: 'Er bestaat al een account met dit e-mailadres.' }, { status: 409 })
  }

  const household = await prisma.household.findUnique({
    where: { id: user.householdId },
    select: { name: true },
  })
  const householdName = household?.name ?? 'je gezin'

  const token = await signInvite(
    { householdId: user.householdId, householdName, email, name },
    Date.now(),
  )
  const origin = process.env.NEXT_PUBLIC_BASE_URL || new URL(req.url).origin
  const link = `${origin}/uitnodiging?token=${encodeURIComponent(token)}`

  const sent = await sendEmail({
    to: email,
    subject: `Uitnodiging voor ${householdName}`,
    html: emailLayout(
      'Je bent uitgenodigd!',
      `<p>${user.name} nodigt je uit voor <strong>${householdName}</strong> in Huishoudboekje.</p>
       <p style="margin:20px 0"><a href="${link}" style="display:inline-block;background:#35B558;color:#fff;padding:11px 20px;border-radius:9999px;text-decoration:none;font-weight:700">Account aanmaken</a></p>
       <p style="font-size:12px;color:#94a3b8">Werkt de knop niet? Kopieer deze link:<br>${link}</p>`,
    ),
  })

  return NextResponse.json({ link, emailed: sent.sent })
}

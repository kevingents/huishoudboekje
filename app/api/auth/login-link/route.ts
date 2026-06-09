import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { signLoginLink } from '@/lib/loginlink'
import { sendEmail, emailLayout } from '@/lib/email'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}))
  const email = String(body?.email ?? '').trim().toLowerCase()

  // Altijd hetzelfde antwoord — we lekken niet welke e-mailadressen bestaan.
  const ok = NextResponse.json({ ok: true })
  if (!email) return ok

  const user = await prisma.user.findUnique({ where: { email } })
  if (!user) return ok

  const token = await signLoginLink({ userId: user.id, email: user.email }, Date.now())
  const origin = process.env.NEXT_PUBLIC_BASE_URL || new URL(req.url).origin
  const link = `${origin}/api/auth/login-link/verify?token=${encodeURIComponent(token)}`

  await sendEmail({
    to: user.email,
    subject: 'Je inloglink voor Fam',
    html: emailLayout(
      'Inloggen bij Fam',
      `<p>Klik op de knop hieronder om in te loggen. De link is <strong>15 minuten</strong> geldig en werkt één keer.</p>
       <p>Heb je dit niet aangevraagd? Dan kun je deze e-mail negeren.</p>`,
      { label: 'Inloggen', url: link },
    ),
  })

  return ok
}

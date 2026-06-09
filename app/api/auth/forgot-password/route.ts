import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { signReset } from '@/lib/reset'
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

  const token = await signReset({ userId: user.id, email: user.email }, Date.now())
  const origin = process.env.NEXT_PUBLIC_BASE_URL || new URL(req.url).origin
  const link = `${origin}/wachtwoord-herstellen?token=${encodeURIComponent(token)}`

  await sendEmail({
    to: user.email,
    subject: 'Wachtwoord opnieuw instellen',
    html: emailLayout(
      'Wachtwoord opnieuw instellen',
      `<p>Je hebt gevraagd om je wachtwoord opnieuw in te stellen. Klik op de knop hieronder om een nieuw wachtwoord te kiezen.</p>
       <p>Deze link is <strong>1 uur</strong> geldig. Heb je dit niet aangevraagd? Dan kun je deze e-mail negeren — er verandert niets.</p>
       <p style="font-size:12px;color:#94a3b8;margin-top:18px">Werkt de knop niet? Kopieer deze link:<br>${link}</p>`,
      { label: 'Nieuw wachtwoord kiezen', url: link },
    ),
  })

  return ok
}

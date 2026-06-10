import { prisma } from '@/lib/db'
import { verifySvixSignature } from '@/lib/svix'
import { resolveHousehold, processInboundEmail } from '@/lib/inbound'
import { notify } from '@/lib/notify'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Resend Inbound-webhook: ontvangt doorgestuurde mails, laat de AI ze
 * classificeren en zet ze automatisch op de juiste plek (Documenten / Agenda /
 * Boodschappen). Elke mail wordt ook als MailItem (inbox) bewaard.
 *
 * Geeft altijd 200 terug bij verwerkbare events (ook "niet gevonden"), zodat
 * Resend de webhook niet eindeloos opnieuw probeert.
 */
export async function POST(req: Request) {
  const raw = await req.text()

  // 1) Handtekening verifiëren (Svix) als het secret is ingesteld.
  const secret = process.env.RESEND_WEBHOOK_SECRET
  if (secret) {
    const ok = verifySvixSignature({
      secret,
      id: req.headers.get('svix-id'),
      timestamp: req.headers.get('svix-timestamp'),
      signature: req.headers.get('svix-signature'),
      body: raw,
    })
    if (!ok) return new Response('invalid signature', { status: 401 })
  } else {
    console.warn('[inbound] RESEND_WEBHOOK_SECRET niet gezet — handtekening niet geverifieerd')
  }

  // 2) Event parsen en filteren.
  let event: { type?: string; data?: Record<string, unknown> }
  try {
    event = JSON.parse(raw)
  } catch {
    return new Response('bad json', { status: 400 })
  }
  if (event?.type !== 'email.received') {
    return Response.json({ ignored: event?.type ?? 'unknown' })
  }

  const data = event.data ?? {}
  const emailId = (data.email_id as string) ?? (data.id as string) ?? undefined
  const toRaw = data.to
  const toList: string[] = Array.isArray(toRaw)
    ? toRaw.map(String)
    : toRaw
      ? [String(toRaw)]
      : []

  // 3) Bij welk huishouden hoort dit?
  const householdId = await resolveHousehold(toList)
  if (!householdId) {
    console.warn('[inbound] geen huishouden gevonden voor ontvanger(s):', toList)
    return Response.json({ ignored: 'no_household' })
  }

  // 4) Afzender/onderwerp uit de payload (de body wordt in processInboundEmail opgehaald).
  const fromAddr = String(data.from ?? '')
  const fromName = (fromAddr.match(/^([^<]+)</)?.[1] ?? '').trim() || null
  const subject = String(data.subject ?? '(geen onderwerp)')
  const payloadText = typeof data.text === 'string' ? data.text : data.html ? String(data.html) : ''

  // 5) Verwerken: body ophalen → classificeren → archiveren.
  const result = await processInboundEmail({ householdId, emailId, fromAddr, subject, payloadText })

  // 6) Inbox-item opslaan.
  await prisma.mailItem.create({
    data: {
      householdId,
      emailId: emailId ?? null,
      fromAddr,
      fromName,
      subject,
      snippet: result.snippet,
      status: result.filedType ? 'verwerkt' : 'nieuw',
      category: result.category,
      summary: result.summary,
      filedType: result.filedType,
      filedId: result.filedId,
      attachmentUrl: result.attachmentUrl,
      attachmentName: result.attachmentName,
    },
  })

  // 7) Het gezin op de hoogte brengen.
  await notify({
    householdId,
    type: 'system',
    title: 'Nieuwe gezinsmail verwerkt',
    body: `${result.title} — ${result.summary ?? ''}`.slice(0, 200),
  })

  return Response.json({ ok: true, category: result.category, filed: result.filedType })
}

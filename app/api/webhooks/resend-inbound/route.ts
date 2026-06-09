import { prisma } from '@/lib/db'
import { verifySvixSignature } from '@/lib/svix'
import {
  resolveHousehold,
  fetchReceivedEmail,
  listInboundAttachments,
  classifyMail,
} from '@/lib/inbound'
import { describeDate } from '@/lib/date'
import { notify } from '@/lib/notify'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function stripHtml(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function todayIso(): string {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

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

  // 4) Volledige body ophalen (anders de payload-velden gebruiken).
  const full = emailId ? await fetchReceivedEmail(emailId) : null
  const fromAddr = String(full?.from ?? data.from ?? '')
  const fromName = (fromAddr.match(/^([^<]+)</)?.[1] ?? '').trim() || null
  const subject = String(full?.subject ?? data.subject ?? '(geen onderwerp)')
  const text = String(
    full?.text ??
      data.text ??
      (full?.html ? stripHtml(full.html) : data.html ? stripHtml(String(data.html)) : ''),
  )

  // 5) Bijlagen ophalen (download-URL's).
  const attachments = emailId ? await listInboundAttachments(emailId) : []
  const firstAttachment = attachments[0] ?? null
  const imageAttachment = attachments.find((a) => (a.content_type || '').startsWith('image/')) ?? null

  // 6) Classificeren met de AI.
  const members = (
    await prisma.familyMember.findMany({ where: { householdId }, select: { name: true } })
  ).map((m) => m.name)
  const cls = await classifyMail({ subject, text, from: fromAddr, members, today: todayIso() })

  // 7) Automatisch op de juiste plek zetten.
  let filedType: string | null = null
  let filedId: number | null = null
  let actionMsg = ''
  try {
    if (cls.category === 'garantie' || cls.category === 'document' || cls.category === 'factuur') {
      const docType =
        cls.category === 'garantie'
          ? 'garantie'
          : cls.category === 'factuur'
            ? 'factuur'
            : cls.documentType === 'legitimatie'
              ? 'legitimatie'
              : 'overig'
      const amountText = cls.category === 'factuur' && cls.amount ? `Bedrag: €${cls.amount.toFixed(2)}` : ''
      const notes = [cls.summary, amountText].filter(Boolean).join(' · ') || null
      const doc = await prisma.document.create({
        data: {
          householdId,
          title: cls.title,
          type: docType,
          owner: cls.owner || null,
          expiresAt: cls.expiresAt || null,
          notes,
          imageUrl: imageAttachment?.download_url ?? null,
        },
      })
      filedType = 'document'
      filedId = doc.id
      actionMsg =
        cls.category === 'factuur'
          ? `Opgeslagen bij Documenten (factuur${cls.amount ? `, €${cls.amount.toFixed(2)}` : ''})`
          : `Opgeslagen bij Documenten (${docType})`
    } else if (cls.category === 'afspraak' && cls.eventDate) {
      const parts = describeDate(cls.eventDate)
      const ev = await prisma.agendaEvent.create({
        data: {
          householdId,
          ...parts,
          title: cls.title,
          time: cls.eventTime || 'Hele dag',
          who: cls.owner || 'Agenda',
          accent: 'violet',
          source: 'manual',
        },
      })
      filedType = 'agenda'
      filedId = ev.id
      actionMsg = `Toegevoegd aan de Agenda (${cls.eventDate})`
    } else if (cls.category === 'boodschap' && cls.shoppingItems.length) {
      const created = await Promise.all(
        cls.shoppingItems.slice(0, 30).map((label) =>
          prisma.shoppingItem.create({
            data: { householdId, label: String(label).slice(0, 120), category: 'Overig' },
          }),
        ),
      )
      filedType = 'shopping'
      filedId = created[0]?.id ?? null
      actionMsg = `${created.length} item(s) op de Boodschappenlijst gezet`
    } else {
      actionMsg = 'Bewaard in de Gezinsmail-inbox'
    }
  } catch (e) {
    console.error('[inbound] automatisch archiveren mislukt:', e)
    actionMsg = 'Bewaard in de inbox (automatisch opslaan mislukte)'
  }

  // 8) MailItem (inbox) opslaan.
  await prisma.mailItem.create({
    data: {
      householdId,
      emailId: emailId ?? null,
      fromAddr,
      fromName,
      subject,
      snippet: text ? text.slice(0, 160) : null,
      status: filedType ? 'verwerkt' : 'nieuw',
      category: cls.category,
      summary: cls.summary ? `${cls.summary} — ${actionMsg}` : actionMsg,
      filedType,
      filedId,
      attachmentUrl: firstAttachment?.download_url ?? null,
      attachmentName: firstAttachment?.filename ?? null,
    },
  })

  // 9) Het gezin op de hoogte brengen.
  await notify({
    householdId,
    type: 'system',
    title: 'Nieuwe gezinsmail verwerkt',
    body: `${cls.title} — ${actionMsg}.`,
  })

  return Response.json({ ok: true, category: cls.category, filed: filedType })
}

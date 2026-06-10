import { prisma } from '@/lib/db'
import { requireModule } from '@/lib/guard'
import { processInboundEmail } from '@/lib/inbound'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/** Haalt een eerder ontvangen mail opnieuw op, classificeert en archiveert hem. */
export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const hid = await requireModule('gezinsmail')
  if (hid instanceof Response) return hid

  const item = await prisma.mailItem.findFirst({ where: { id: Number(params.id), householdId: hid } })
  if (!item) return Response.json({ error: 'niet gevonden' }, { status: 404 })
  if (!item.emailId) {
    return Response.json(
      { error: 'Deze mail heeft geen e-mail-id; opnieuw ophalen kan niet.' },
      { status: 400 },
    )
  }

  // Verwijder het eerder automatisch gemaakte record om dubbele te voorkomen.
  if (item.filedId) {
    const where = { id: item.filedId, householdId: hid }
    if (item.filedType === 'document') await prisma.document.deleteMany({ where })
    else if (item.filedType === 'agenda') await prisma.agendaEvent.deleteMany({ where })
    else if (item.filedType === 'shopping') await prisma.shoppingItem.deleteMany({ where })
  }

  const result = await processInboundEmail({
    householdId: hid,
    emailId: item.emailId,
    fromAddr: item.fromAddr,
    subject: item.subject,
  })

  const updated = await prisma.mailItem.update({
    where: { id: item.id },
    data: {
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

  return Response.json({
    ok: true,
    bodyFetched: result.bodyFetched,
    category: result.category,
    filed: result.filedType,
    item: updated,
  })
}

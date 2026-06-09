import { prisma } from '@/lib/db'
import { requireHousehold } from '@/lib/guard'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET() {
  const hid = await requireHousehold()
  if (hid instanceof Response) return hid
  const contacts = await prisma.contact.findMany({ where: { householdId: hid }, orderBy: { id: 'asc' } })
  return Response.json(contacts)
}

export async function POST(req: Request) {
  const hid = await requireHousehold()
  if (hid instanceof Response) return hid
  const body = await req.json()
  const name = String(body?.name ?? '').trim()
  if (!name) return Response.json({ error: 'name is verplicht' }, { status: 400 })
  const contact = await prisma.contact.create({
    data: {
      householdId: hid,
      name,
      category: String(body?.category ?? 'overig'),
      phone: body?.phone ? String(body.phone) : null,
      address: body?.address ? String(body.address) : null,
      notes: body?.notes ? String(body.notes) : null,
    },
  })
  return Response.json(contact, { status: 201 })
}

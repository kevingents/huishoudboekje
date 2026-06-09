import { prisma } from '@/lib/db'
import { requireHousehold } from '@/lib/guard'

export const dynamic = 'force-dynamic'

export async function GET() {
  const hid = await requireHousehold()
  if (hid instanceof Response) return hid
  const items = await prisma.shoppingItem.findMany({ where: { householdId: hid }, orderBy: { id: 'asc' } })
  return Response.json(items)
}

export async function POST(req: Request) {
  const hid = await requireHousehold()
  if (hid instanceof Response) return hid
  const body = await req.json()
  if (!body?.label) {
    return Response.json({ error: 'label is verplicht' }, { status: 400 })
  }
  const item = await prisma.shoppingItem.create({
    data: {
      householdId: hid,
      label: String(body.label),
      category: String(body.category ?? 'Overig'),
      qty: body.qty ? String(body.qty) : null,
      checked: Boolean(body.checked ?? false),
    },
  })
  return Response.json(item, { status: 201 })
}

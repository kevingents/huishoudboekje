import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET() {
  const items = await prisma.shoppingItem.findMany({ orderBy: { id: 'asc' } })
  return Response.json(items)
}

export async function POST(req: Request) {
  const body = await req.json()
  if (!body?.label) {
    return Response.json({ error: 'label is verplicht' }, { status: 400 })
  }
  const item = await prisma.shoppingItem.create({
    data: {
      label: String(body.label),
      category: String(body.category ?? 'Overig'),
      qty: body.qty ? String(body.qty) : null,
      checked: Boolean(body.checked ?? false),
    },
  })
  return Response.json(item, { status: 201 })
}

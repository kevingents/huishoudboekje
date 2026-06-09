import { prisma } from '@/lib/db'
import { requireHousehold } from '@/lib/guard'

export const dynamic = 'force-dynamic'

export async function GET() {
  const hid = await requireHousehold()
  if (hid instanceof Response) return hid
  const categories = await prisma.budgetCategory.findMany({ where: { householdId: hid }, orderBy: { id: 'asc' } })
  return Response.json(categories)
}

export async function POST(req: Request) {
  const hid = await requireHousehold()
  if (hid instanceof Response) return hid
  const body = await req.json()
  if (!body?.name) {
    return Response.json({ error: 'name is verplicht' }, { status: 400 })
  }
  const category = await prisma.budgetCategory.create({
    data: {
      householdId: hid,
      name: String(body.name),
      icon: String(body.icon ?? 'ShoppingCart'),
      spent: Number(body.spent ?? 0),
      limit: Number(body.limit ?? 0),
      color: String(body.color ?? 'emerald'),
    },
  })
  return Response.json(category, { status: 201 })
}

import { prisma } from '@/lib/db'
import { requireHousehold, requireModule } from '@/lib/guard'

export const dynamic = 'force-dynamic'

export async function GET() {
  const hid = await requireHousehold()
  if (hid instanceof Response) return hid
  const items = await prisma.familyBudget.findMany({ where: { householdId: hid }, orderBy: { id: 'asc' } })
  return Response.json(items)
}

export async function POST(req: Request) {
  const hid = await requireModule('budgetplanner')
  if (hid instanceof Response) return hid
  const body = await req.json()
  if (!body?.name) {
    return Response.json({ error: 'name is verplicht' }, { status: 400 })
  }
  const item = await prisma.familyBudget.create({
    data: {
      householdId: hid,
      name: String(body.name),
      limit: Number(body.limit ?? 0),
      spent: Number(body.spent ?? 0),
      member: body.member ? String(body.member) : null,
      color: String(body.color ?? 'emerald'),
    },
  })
  return Response.json(item, { status: 201 })
}

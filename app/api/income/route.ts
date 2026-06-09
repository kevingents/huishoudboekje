import { prisma } from '@/lib/db'
import { requireHousehold } from '@/lib/guard'

export const dynamic = 'force-dynamic'

export async function GET() {
  const hid = await requireHousehold()
  if (hid instanceof Response) return hid
  const items = await prisma.income.findMany({ where: { householdId: hid }, orderBy: { id: 'desc' } })
  return Response.json(items)
}

export async function POST(req: Request) {
  const hid = await requireHousehold()
  if (hid instanceof Response) return hid
  const body = await req.json()
  const label = String(body?.label ?? '').trim()
  const amount = Number(body?.amount)
  if (!label || !amount) {
    return Response.json({ error: 'label en amount zijn verplicht' }, { status: 400 })
  }
  const income = await prisma.income.create({
    data: {
      householdId: hid,
      label,
      amount,
      category: String(body?.category ?? 'loon'),
      interval: String(body?.interval ?? '1 month'),
    },
  })
  return Response.json(income, { status: 201 })
}

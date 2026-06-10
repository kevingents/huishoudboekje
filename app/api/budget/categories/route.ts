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
  const name = String(body?.name ?? '').trim()
  if (!name) {
    return Response.json({ error: 'name is verplicht' }, { status: 400 })
  }
  // Bestaat de categorie al (case-insensitief)? Geef die terug i.p.v. een duplicaat.
  const existing = await prisma.budgetCategory.findFirst({
    where: { householdId: hid, name: { equals: name, mode: 'insensitive' } },
  })
  if (existing) return Response.json(existing, { status: 200 })

  const category = await prisma.budgetCategory.create({
    data: {
      householdId: hid,
      name,
      icon: String(body.icon ?? 'ShoppingCart'),
      limit: Number(body.limit ?? 0),
      color: String(body.color ?? 'emerald'),
    },
  })
  return Response.json(category, { status: 201 })
}

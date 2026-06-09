import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET() {
  const categories = await prisma.budgetCategory.findMany({ orderBy: { id: 'asc' } })
  return Response.json(categories)
}

export async function POST(req: Request) {
  const body = await req.json()
  if (!body?.name) {
    return Response.json({ error: 'name is verplicht' }, { status: 400 })
  }
  const category = await prisma.budgetCategory.create({
    data: {
      name: String(body.name),
      icon: String(body.icon ?? 'ShoppingCart'),
      spent: Number(body.spent ?? 0),
      limit: Number(body.limit ?? 0),
      color: String(body.color ?? 'emerald'),
    },
  })
  return Response.json(category, { status: 201 })
}

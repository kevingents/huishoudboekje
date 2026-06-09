import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET() {
  const costs = await prisma.fixedCost.findMany({ orderBy: { id: 'asc' } })
  return Response.json(costs)
}

export async function POST(req: Request) {
  const body = await req.json()
  if (!body?.name || body?.amount === undefined) {
    return Response.json({ error: 'name en amount zijn verplicht' }, { status: 400 })
  }
  const cost = await prisma.fixedCost.create({
    data: {
      name: String(body.name),
      amount: Number(body.amount),
      dueDay: body.dueDay ? Number(body.dueDay) : null,
    },
  })
  return Response.json(cost, { status: 201 })
}

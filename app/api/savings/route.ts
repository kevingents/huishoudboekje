import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET() {
  const goals = await prisma.savingsGoal.findMany({ orderBy: { id: 'asc' } })
  return Response.json(goals)
}

export async function POST(req: Request) {
  const body = await req.json()
  if (!body?.name || body?.target === undefined) {
    return Response.json({ error: 'name en target zijn verplicht' }, { status: 400 })
  }
  const goal = await prisma.savingsGoal.create({
    data: {
      name: String(body.name),
      target: Number(body.target),
      saved: Number(body.saved ?? 0),
    },
  })
  return Response.json(goal, { status: 201 })
}

import { prisma } from '@/lib/db'
import { requireHousehold, requireModule } from '@/lib/guard'

export const dynamic = 'force-dynamic'

export async function GET() {
  const hid = await requireHousehold()
  if (hid instanceof Response) return hid
  const goals = await prisma.savingsGoal.findMany({ where: { householdId: hid }, orderBy: { id: 'asc' } })
  return Response.json(goals)
}

export async function POST(req: Request) {
  const hid = await requireModule('budgetplanner')
  if (hid instanceof Response) return hid
  const body = await req.json()
  if (!body?.name || body?.target === undefined) {
    return Response.json({ error: 'name en target zijn verplicht' }, { status: 400 })
  }
  const goal = await prisma.savingsGoal.create({
    data: { householdId: hid, name: String(body.name), target: Number(body.target), saved: Number(body.saved ?? 0) },
  })
  return Response.json(goal, { status: 201 })
}

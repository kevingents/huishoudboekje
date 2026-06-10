import { prisma } from '@/lib/db'
import { requireHousehold, requireModule } from '@/lib/guard'

export const dynamic = 'force-dynamic'

export async function GET() {
  const hid = await requireHousehold()
  if (hid instanceof Response) return hid
  const loans = await prisma.loan.findMany({ where: { householdId: hid }, orderBy: { id: 'asc' } })
  return Response.json(loans)
}

export async function POST(req: Request) {
  const hid = await requireModule('budgetplanner')
  if (hid instanceof Response) return hid
  const body = await req.json()
  if (!body?.name) {
    return Response.json({ error: 'name is verplicht' }, { status: 400 })
  }
  const loan = await prisma.loan.create({
    data: {
      householdId: hid,
      name: String(body.name),
      lender: body.lender ? String(body.lender) : null,
      total: Number(body.total) || 0,
      termAmount: body.termAmount ? Number(body.termAmount) : null,
      matchPattern: body.matchPattern ? String(body.matchPattern).toLowerCase().trim() : null,
      excludePattern: body.excludePattern ? String(body.excludePattern).toLowerCase().trim() : null,
      manualPaid: Number(body.manualPaid) || 0,
      startDate: body.startDate ? String(body.startDate) : null,
    },
  })
  return Response.json(loan, { status: 201 })
}

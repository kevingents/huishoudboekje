import { prisma } from '@/lib/db'
import { requireModule, notFound } from '@/lib/guard'

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const hid = await requireModule('budgetplanner')
  if (hid instanceof Response) return hid
  const id = Number(params.id)
  const body = await req.json()
  const data: Record<string, unknown> = {}
  if (body.name !== undefined) data.name = String(body.name)
  if (body.lender !== undefined) data.lender = body.lender ? String(body.lender) : null
  if (body.total !== undefined) data.total = Number(body.total) || 0
  if (body.termAmount !== undefined) data.termAmount = body.termAmount ? Number(body.termAmount) : null
  if (body.matchPattern !== undefined)
    data.matchPattern = body.matchPattern ? String(body.matchPattern).toLowerCase().trim() : null
  if (body.excludePattern !== undefined)
    data.excludePattern = body.excludePattern ? String(body.excludePattern).toLowerCase().trim() : null
  if (body.manualPaid !== undefined) data.manualPaid = Number(body.manualPaid) || 0
  if (body.startDate !== undefined) data.startDate = body.startDate ? String(body.startDate) : null
  const result = await prisma.loan.updateMany({ where: { id, householdId: hid }, data })
  if (result.count === 0) return notFound()
  const loan = await prisma.loan.findUnique({ where: { id } })
  return Response.json(loan)
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const hid = await requireModule('budgetplanner')
  if (hid instanceof Response) return hid
  await prisma.loan.deleteMany({ where: { id: Number(params.id), householdId: hid } })
  return new Response(null, { status: 204 })
}

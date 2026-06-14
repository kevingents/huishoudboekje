import { prisma } from '@/lib/db'
import { requireModule, notFound } from '@/lib/guard'
import { getCurrentMemberName } from '@/lib/auth'
import { maySeePotjeSavings } from '@/lib/budget'

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const hid = await requireModule('budgetplanner')
  if (hid instanceof Response) return hid
  const id = Number(params.id)
  const body = await req.json()
  const data: Record<string, unknown> = {}
  if (body.name !== undefined) data.name = String(body.name)
  if (body.limit !== undefined) data.limit = Number(body.limit)
  if (body.savings !== undefined) data.savings = Number(body.savings)
  if (body.savedTotal !== undefined) {
    // Spaarsaldo is privé: alleen de eigenaar van het potje (of een gedeeld potje)
    // mag het bijwerken. Toets tegen het HUIDIGE lid, niet het lid uit de payload.
    const existing = await prisma.familyBudget.findFirst({ where: { id, householdId: hid }, select: { member: true } })
    if (!existing) return notFound()
    const me = await getCurrentMemberName()
    if (!maySeePotjeSavings(existing.member, me)) {
      return Response.json({ error: 'Dit spaarsaldo is privé voor het gezinslid van dit potje.' }, { status: 403 })
    }
    data.savedTotal = Math.max(0, Number(body.savedTotal) || 0)
  }
  if (body.spent !== undefined) data.spent = Number(body.spent)
  if (body.spend !== undefined) data.spent = { increment: Number(body.spend) }
  if (body.member !== undefined) data.member = body.member ? String(body.member) : null
  if (body.color !== undefined) data.color = String(body.color)
  if (body.entries !== undefined) data.entries = body.entries
  const result = await prisma.familyBudget.updateMany({ where: { id, householdId: hid }, data })
  if (result.count === 0) return notFound()
  const item = await prisma.familyBudget.findUnique({ where: { id } })
  // Ook in het PATCH-antwoord blijft het privé saldo verborgen voor een ánder lid
  // (bijv. een ouder die de limiet van een persoonlijk potje aanpast).
  if (item && !maySeePotjeSavings(item.member, await getCurrentMemberName())) {
    return Response.json({ ...item, savedTotal: null })
  }
  return Response.json(item)
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const hid = await requireModule('budgetplanner')
  if (hid instanceof Response) return hid
  await prisma.familyBudget.deleteMany({ where: { id: Number(params.id), householdId: hid } })
  return new Response(null, { status: 204 })
}

import { prisma } from '@/lib/db'
import { requireHousehold } from '@/lib/guard'

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const hid = await requireHousehold()
  if (hid instanceof Response) return hid
  const id = Number(params.id)
  const existing = await prisma.transaction.findFirst({ where: { id, householdId: hid } })
  if (!existing) return new Response(null, { status: 204 })

  await prisma.transaction.delete({ where: { id } })

  // Draai de uitgave terug bij de bijbehorende categorie van dit huishouden.
  await prisma.budgetCategory.updateMany({
    where: { householdId: hid, name: existing.category },
    data: { spent: { decrement: existing.amount } },
  })

  return new Response(null, { status: 204 })
}

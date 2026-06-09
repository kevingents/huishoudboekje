import { prisma } from '@/lib/db'

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const id = Number(params.id)
  const existing = await prisma.transaction.findUnique({ where: { id } })
  if (!existing) return new Response(null, { status: 204 })

  await prisma.transaction.delete({ where: { id } })

  // Draai de uitgave terug bij de bijbehorende categorie.
  await prisma.budgetCategory.updateMany({
    where: { name: existing.category },
    data: { spent: { decrement: existing.amount } },
  })

  return new Response(null, { status: 204 })
}

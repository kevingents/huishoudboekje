import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET() {
  const transactions = await prisma.transaction.findMany({ orderBy: { id: 'desc' } })
  return Response.json(transactions)
}

export async function POST(req: Request) {
  const body = await req.json()
  if (!body?.label || body?.amount === undefined) {
    return Response.json({ error: 'label en amount zijn verplicht' }, { status: 400 })
  }
  const amount = Number(body.amount)
  const category = String(body.category ?? 'Overig')

  const transaction = await prisma.transaction.create({
    data: {
      label: String(body.label),
      category,
      amount,
      date: String(body.date ?? 'Vandaag'),
    },
  })

  // Houd de uitgave van de bijbehorende categorie in sync.
  await prisma.budgetCategory.updateMany({
    where: { name: category },
    data: { spent: { increment: amount } },
  })

  return Response.json(transaction, { status: 201 })
}

import { prisma } from '@/lib/db'
import { notify } from '@/lib/notify'
import { requireHousehold } from '@/lib/guard'

export const dynamic = 'force-dynamic'

export async function GET() {
  const hid = await requireHousehold()
  if (hid instanceof Response) return hid
  const transactions = await prisma.transaction.findMany({ where: { householdId: hid }, orderBy: { id: 'desc' } })
  return Response.json(transactions)
}

export async function POST(req: Request) {
  const hid = await requireHousehold()
  if (hid instanceof Response) return hid
  const body = await req.json()
  if (!body?.label || body?.amount === undefined) {
    return Response.json({ error: 'label en amount zijn verplicht' }, { status: 400 })
  }
  const amount = Number(body.amount)
  const category = String(body.category ?? 'Overig')

  const cat = await prisma.budgetCategory.findFirst({ where: { householdId: hid, name: category } })

  const transaction = await prisma.transaction.create({
    data: { householdId: hid, label: String(body.label), category, amount, date: String(body.date ?? 'Vandaag') },
  })

  // Houd de uitgave van de bijbehorende categorie in sync + waarschuw bij 90%.
  if (cat) {
    const before = cat.spent
    const after = before + amount
    await prisma.budgetCategory.update({ where: { id: cat.id }, data: { spent: after } })
    const threshold = cat.limit * 0.9
    if (cat.limit > 0 && before < threshold && after >= threshold) {
      await notify({
        householdId: hid,
        type: 'budget',
        title: `Budget bijna op: ${cat.name}`,
        body: `Je hebt €${Math.round(after)} van €${Math.round(cat.limit)} uitgegeven deze maand.`,
      })
    }
  }

  return Response.json(transaction, { status: 201 })
}

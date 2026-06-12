import { prisma } from '@/lib/db'
import { requireHousehold, notFound } from '@/lib/guard'
import { EXCLUDED_CATEGORIES } from '@/lib/budget'

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const hid = await requireHousehold()
  if (hid instanceof Response) return hid
  const id = Number(params.id)
  const body = await req.json()
  const data: Record<string, unknown> = {}
  if (body.name !== undefined) {
    const name = String(body.name).trim()
    if (!name) return Response.json({ error: 'name mag niet leeg zijn' }, { status: 400 })
    if (EXCLUDED_CATEGORIES.some((r) => r.toLowerCase() === name.toLowerCase())) {
      return Response.json({ error: `"${name}" is gereserveerd en kan geen categorie zijn.` }, { status: 400 })
    }
    data.name = name
  }
  if (body.icon !== undefined) data.icon = String(body.icon)
  if (body.color !== undefined) data.color = String(body.color)
  if (body.limit !== undefined) data.limit = Number(body.limit)
  // 'spent' wordt server-side uit de transacties bepaald, niet via PATCH gezet.
  const result = await prisma.budgetCategory.updateMany({ where: { id, householdId: hid }, data })
  if (result.count === 0) return notFound()
  const category = await prisma.budgetCategory.findUnique({ where: { id } })
  return Response.json(category)
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const hid = await requireHousehold()
  if (hid instanceof Response) return hid
  const id = Number(params.id)

  const cat = await prisma.budgetCategory.findFirst({ where: { id, householdId: hid } })
  if (!cat) return new Response(null, { status: 204 })

  // Verwijder de categorie niet "blind": verplaats de transacties die eraan hangen
  // naar 'Overig' (anders blijven ze met een niet-bestaande categorie achter), en
  // ruim de geleerde regels op die naar deze categorie verwezen.
  if (cat.name !== 'Overig') {
    // Zorg dat de vangnet-categorie 'Overig' bestaat vóór we transacties verplaatsen
    // (oudere huishoudens / nieuw aangemaakte zonder Overig).
    const overig = await prisma.budgetCategory.findFirst({ where: { householdId: hid, name: 'Overig' } })
    if (!overig) {
      await prisma.budgetCategory.create({
        data: { householdId: hid, name: 'Overig', icon: 'ShoppingCart', color: 'slate', spent: 0, limit: 0 },
      })
    }
    await prisma.transaction.updateMany({
      where: { householdId: hid, category: cat.name },
      data: { category: 'Overig' },
    })
    await prisma.merchantRule.deleteMany({
      where: { householdId: hid, category: cat.name, kind: 'expense' },
    })
  }

  await prisma.budgetCategory.deleteMany({ where: { id, householdId: hid } })
  return new Response(null, { status: 204 })
}

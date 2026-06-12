import { prisma } from '@/lib/db'
import { requireHousehold } from '@/lib/guard'
import { isSpendingCategory } from '@/lib/budget'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * Voegt categorie `fromId` samen in categorie `intoId`: alle transacties en
 * geleerde regels gaan over naar de doelcategorie, daarna wordt de bron
 * verwijderd. De limieten worden opgeteld zodat het totale budget gelijk blijft.
 */
export async function POST(req: Request) {
  const hid = await requireHousehold()
  if (hid instanceof Response) return hid

  const body = await req.json().catch(() => ({}))
  const fromId = Number(body?.fromId)
  const intoId = Number(body?.intoId)
  if (!fromId || !intoId || fromId === intoId) {
    return Response.json({ error: 'fromId en intoId (verschillend) zijn verplicht' }, { status: 400 })
  }

  const [from, into] = await Promise.all([
    prisma.budgetCategory.findFirst({ where: { id: fromId, householdId: hid } }),
    prisma.budgetCategory.findFirst({ where: { id: intoId, householdId: hid } }),
  ])
  if (!from || !into) return Response.json({ error: 'Categorie niet gevonden' }, { status: 404 })
  // Gereserveerde categorieën (Inkomsten/Negeren/Vaste lasten) mogen niet bron of doel zijn.
  if (!isSpendingCategory(from.name) || !isSpendingCategory(into.name)) {
    return Response.json({ error: 'Gereserveerde categorieën kunnen niet samengevoegd worden.' }, { status: 400 })
  }

  const moved = await prisma.transaction.updateMany({
    where: { householdId: hid, category: from.name },
    data: { category: into.name },
  })
  await prisma.merchantRule.updateMany({
    where: { householdId: hid, category: from.name, kind: 'expense' },
    data: { category: into.name },
  })
  await prisma.budgetCategory.update({
    where: { id: into.id },
    data: { limit: into.limit + from.limit, spent: into.spent + from.spent },
  })
  await prisma.budgetCategory.delete({ where: { id: from.id } })

  return Response.json({ ok: true, moved: moved.count, into: into.name })
}

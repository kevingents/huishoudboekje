import { prisma } from '@/lib/db'
import { requireModule, notFound } from '@/lib/guard'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * Splitst een vaste last atomair in een rente- en een aflossingsdeel (hypotheek):
 * de bestaande post wordt "<naam> — rente" met het restbedrag, en er komt een
 * nieuwe post "<naam> — aflossing" (categorie Aflossingen) bij. Eén transactie,
 * dus nooit een half gesplitste staat.
 */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const hid = await requireModule('budgetplanner')
  if (hid instanceof Response) return hid

  const id = Number(params.id)
  const body = await req.json().catch(() => ({}))
  const aflossing = Math.round(Number(body?.aflossing) * 100) / 100

  const cost = await prisma.fixedCost.findFirst({ where: { id, householdId: hid } })
  if (!cost) return notFound()
  if (!aflossing || aflossing <= 0 || aflossing >= cost.amount) {
    return Response.json(
      { error: 'aflossing moet groter dan 0 en kleiner dan het totaalbedrag zijn' },
      { status: 400 },
    )
  }

  const rente = Math.round((cost.amount - aflossing) * 100) / 100
  const base = cost.name.trim()
  const [updated, created] = await prisma.$transaction([
    prisma.fixedCost.update({
      where: { id: cost.id },
      data: { name: `${base} — rente`, amount: rente },
    }),
    prisma.fixedCost.create({
      data: {
        householdId: hid,
        name: `${base} — aflossing`,
        amount: aflossing,
        category: 'Aflossingen',
        dueDay: cost.dueDay,
      },
    }),
  ])

  return Response.json({ ok: true, rente: updated, aflossing: created })
}

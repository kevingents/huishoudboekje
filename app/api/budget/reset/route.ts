import { prisma } from '@/lib/db'
import { requireHousehold } from '@/lib/guard'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * Maakt alle budgetgegevens van het huishouden leeg: transacties, categorieën,
 * inkomsten, vaste lasten, leningen en geleerde regels. Account, gezin, agenda
 * e.d. blijven bestaan — handig om met een schone maand opnieuw te beginnen.
 */
export async function POST() {
  const hid = await requireHousehold()
  if (hid instanceof Response) return hid
  const where = { householdId: hid }

  await prisma.$transaction([
    prisma.transaction.deleteMany({ where }),
    prisma.budgetCategory.deleteMany({ where }),
    prisma.income.deleteMany({ where }),
    prisma.fixedCost.deleteMany({ where }),
    prisma.loan.deleteMany({ where }),
    prisma.merchantRule.deleteMany({ where }),
  ])

  return Response.json({ ok: true })
}

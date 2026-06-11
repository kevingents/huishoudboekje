import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireHousehold, unauthorized } from '@/lib/guard'
import { getCurrentUser, sessionCookieOptions } from '@/lib/auth'
import { SESSION_COOKIE } from '@/lib/session'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET() {
  const hid = await requireHousehold()
  if (hid instanceof Response) return hid
  const household = await prisma.household.findUnique({
    where: { id: hid },
    select: { id: true, name: true, tier: true },
  })
  return Response.json(household)
}

export async function PATCH(req: Request) {
  const hid = await requireHousehold()
  if (hid instanceof Response) return hid
  const body = await req.json().catch(() => ({}))
  const name = String(body?.name ?? '').trim()
  if (!name) return Response.json({ error: 'Vul een gezinsnaam in.' }, { status: 400 })
  const household = await prisma.household.update({
    where: { id: hid },
    data: { name },
    select: { id: true, name: true, tier: true },
  })
  return Response.json(household)
}

/**
 * AVG art. 17 (recht op vergetelheid): verwijdert het hele huishouden en alle
 * bijbehorende gegevens onomkeerbaar. Alleen de eigenaar. Omdat het schema geen
 * database-cascade kent, wissen we elk model expliciet in één transactie.
 */
export async function DELETE() {
  const user = await getCurrentUser()
  if (!user) return unauthorized()
  if (user.role !== 'owner') {
    return Response.json({ error: 'Alleen de gezinseigenaar kan het account verwijderen.' }, { status: 403 })
  }
  const hid = user.householdId
  const where = { householdId: hid }

  const users = await prisma.user.findMany({ where, select: { id: true } })
  const userIds = users.map((u) => u.id)

  await prisma.$transaction([
    // Co-ouder ontkoppelen zodat het andere huishouden geen verwijzing houdt.
    prisma.household.updateMany({ where: { coParentHouseholdId: hid }, data: { coParentHouseholdId: null } }),
    // Alle huishouden-gescopete gegevens.
    prisma.agendaEvent.deleteMany({ where }),
    prisma.shoppingItem.deleteMany({ where }),
    prisma.recipe.deleteMany({ where }),
    prisma.budgetCategory.deleteMany({ where }),
    prisma.transaction.deleteMany({ where }),
    prisma.chatMessage.deleteMany({ where }),
    prisma.setting.deleteMany({ where }),
    prisma.integration.deleteMany({ where }),
    prisma.subscription.deleteMany({ where }),
    prisma.notification.deleteMany({ where }),
    prisma.savingsGoal.deleteMany({ where }),
    prisma.familyBudget.deleteMany({ where }),
    prisma.fixedCost.deleteMany({ where }),
    prisma.income.deleteMany({ where }),
    prisma.merchantRule.deleteMany({ where }),
    prisma.loan.deleteMany({ where }),
    prisma.card.deleteMany({ where }),
    prisma.task.deleteMany({ where }),
    prisma.redemption.deleteMany({ where }),
    prisma.contact.deleteMany({ where }),
    prisma.familyReward.deleteMany({ where }),
    prisma.document.deleteMany({ where }),
    prisma.mailItem.deleteMany({ where }),
    prisma.familyMember.deleteMany({ where }),
    // Push-abonnementen hangen aan userId, niet householdId.
    prisma.pushSubscription.deleteMany({ where: { userId: { in: userIds } } }),
    // Tot slot de gebruikers en het huishouden zelf.
    prisma.user.deleteMany({ where }),
    prisma.household.delete({ where: { id: hid } }),
  ])

  // Sessiecookie wissen.
  const res = NextResponse.json({ deleted: true })
  res.cookies.set(SESSION_COOKIE, '', { ...sessionCookieOptions, maxAge: 0 })
  return res
}

import { prisma } from '@/lib/db'
import { requireAdmin } from '@/lib/admin'
import { normalizeTier, tierInfo, TIERS } from '@/lib/modules'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET() {
  const admin = await requireAdmin()
  if (admin instanceof Response) return admin

  const [
    households,
    users,
    members,
    activeSubs,
    tierGroups,
    integrationGroups,
    recipes,
    agendaEvents,
    shoppingItems,
    transactions,
    chatMessages,
    savingsGoals,
    fixedCosts,
    notifications,
    cards,
    rewards,
    recentHouseholds,
  ] = await Promise.all([
    prisma.household.count(),
    prisma.user.count(),
    prisma.familyMember.count(),
    prisma.subscription.count({ where: { status: 'active' } }),
    prisma.household.groupBy({ by: ['tier'], _count: { _all: true } }),
    prisma.integration.groupBy({ by: ['key'], where: { status: 'connected' }, _count: { _all: true } }),
    prisma.recipe.count(),
    prisma.agendaEvent.count(),
    prisma.shoppingItem.count(),
    prisma.transaction.count(),
    prisma.chatMessage.count(),
    prisma.savingsGoal.count(),
    prisma.fixedCost.count(),
    prisma.notification.count(),
    prisma.card.count(),
    prisma.reward.count(),
    prisma.household.findMany({
      orderBy: { createdAt: 'desc' },
      take: 8,
      select: { id: true, name: true, tier: true, createdAt: true },
    }),
  ])

  // Tier-verdeling + geschatte maandomzet.
  const tiers: Record<string, number> = { basis: 0, plus: 0, compleet: 0 }
  let revenueMonthly = 0
  for (const g of tierGroups) {
    const t = normalizeTier(g.tier)
    const count = g._count._all
    tiers[t] = count
    revenueMonthly += count * tierInfo(t).price
  }

  const integrations: Record<string, number> = {}
  for (const g of integrationGroups) integrations[g.key] = g._count._all

  // Aanmeldingen per dag, laatste 14 dagen.
  const days = 14
  const start = new Date()
  start.setHours(0, 0, 0, 0)
  start.setDate(start.getDate() - (days - 1))
  const signupRows = await prisma.household.findMany({
    where: { createdAt: { gte: start } },
    select: { createdAt: true },
  })
  const buckets = Array.from({ length: days }, (_, i) => {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    return { date: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`, count: 0 }
  })
  for (const row of signupRows) {
    const d = new Date(row.createdAt)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    const b = buckets.find((x) => x.date === key)
    if (b) b.count++
  }

  // Voorbeeldcijfers (illustratief): tonen het platformpotentieel zolang er nog
  // weinig live verkeer is. Deterministisch en groeit mee met de echte aantallen.
  const demo = {
    activeFamilies: 1240 + households * 3,
    tasksCompleted: 18640 + members * 14,
    tasksOpen: 836 + members,
    cardsShared: 3910 + cards,
    rewardsClaimed: 642 + rewards * 2,
    popularCards: [
      { name: 'Bibliotheek', count: 1124 },
      { name: 'Albert Heijn Bonus', count: 982 },
      { name: 'Kruidvat', count: 763 },
      { name: 'IKEA Family', count: 431 },
      { name: 'Praxis Club', count: 318 },
      { name: 'Etos', count: 287 },
    ],
  }

  return Response.json({
    totals: { households, users, members, activeSubs },
    tiers,
    tierMeta: TIERS.map((t) => ({ key: t.key, name: t.name, price: t.price })),
    revenueMonthly,
    usage: {
      recipes,
      agendaEvents,
      shoppingItems,
      transactions,
      chatMessages,
      savingsGoals,
      fixedCosts,
      notifications,
      cards,
      rewards,
    },
    integrations,
    signups: buckets,
    recentHouseholds,
    demo,
  })
}

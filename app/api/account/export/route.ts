import { prisma } from '@/lib/db'
import { requireHousehold } from '@/lib/guard'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * AVG art. 15/20: download van alle gegevens van het huishouden als één
 * machineleesbaar JSON-bestand. Wachtwoord-hashes worden NIET meegegeven.
 */
export async function GET() {
  const hid = await requireHousehold()
  if (hid instanceof Response) return hid
  const where = { householdId: hid }

  const [
    household,
    users,
    familyMembers,
    agenda,
    shopping,
    recipes,
    budgetCategories,
    transactions,
    chat,
    settings,
    integrations,
    subscriptions,
    notifications,
    savings,
    fixedCosts,
    income,
    merchantRules,
    loans,
    cards,
    tasks,
    redemptions,
    contacts,
    familyRewards,
    documents,
    mail,
    familyBudgets,
  ] = await Promise.all([
    prisma.household.findUnique({ where: { id: hid } }),
    prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        nickname: true,
        phone: true,
        address: true,
        birthday: true,
        emergencyContact: true,
        avatarUrl: true,
        termsAcceptedAt: true,
        createdAt: true,
      },
    }),
    prisma.familyMember.findMany({ where }),
    prisma.agendaEvent.findMany({ where }),
    prisma.shoppingItem.findMany({ where }),
    prisma.recipe.findMany({ where }),
    prisma.budgetCategory.findMany({ where }),
    prisma.transaction.findMany({ where }),
    prisma.chatMessage.findMany({ where }),
    prisma.setting.findMany({ where }),
    prisma.integration.findMany({ where }),
    prisma.subscription.findMany({ where }),
    prisma.notification.findMany({ where }),
    prisma.savingsGoal.findMany({ where }),
    prisma.fixedCost.findMany({ where }),
    prisma.income.findMany({ where }),
    prisma.merchantRule.findMany({ where }),
    prisma.loan.findMany({ where }),
    prisma.card.findMany({ where }),
    prisma.task.findMany({ where }),
    prisma.redemption.findMany({ where }),
    prisma.contact.findMany({ where }),
    prisma.familyReward.findMany({ where }),
    prisma.document.findMany({ where }),
    prisma.mailItem.findMany({ where }),
    prisma.familyBudget.findMany({ where }),
  ])

  const data = {
    exportedAt: new Date().toISOString(),
    app: 'Fam',
    household,
    users,
    familyMembers,
    agenda,
    shopping,
    recipes,
    budgetCategories,
    transactions,
    aiChat: chat,
    settings,
    integrations,
    subscriptions,
    notifications,
    savings,
    fixedCosts,
    income,
    merchantRules,
    loans,
    cards,
    tasks,
    redemptions,
    contacts,
    familyRewards,
    documents,
    gezinsmail: mail,
    familyBudgets,
  }

  return new Response(JSON.stringify(data, null, 2), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': 'attachment; filename="fam-gegevens.json"',
    },
  })
}

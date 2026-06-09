import { NextResponse } from 'next/server'
import { SequenceType } from '@mollie/api-client'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { getMollie, baseUrl, isPublic } from '@/lib/mollie'
import { normalizeTier, tierInfo, yearlyPrice, type Tier } from '@/lib/modules'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(req: Request) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })
  // Alleen de eigenaar mag het pakket wijzigen.
  if (user.role !== 'owner') {
    return NextResponse.json({ error: 'Alleen de gezinseigenaar kan het pakket wijzigen.' }, { status: 403 })
  }

  const body = await req.json()
  const tier: Tier = normalizeTier(body?.tier)
  const price = tierInfo(tier).price
  const householdId = user.householdId

  // Maand- of jaarabonnement. Jaar = 10% korting + 12-maanden-interval.
  const yearly = String(body?.billing) === 'yearly'
  const amount = yearly ? yearlyPrice(price) : price
  const interval = yearly ? '12 months' : '1 month'
  const planName = `${tierInfo(tier).name}${yearly ? ' (jaar)' : ''}`

  // Gratis pakket (Basis) of geen Mollie: direct activeren.
  const mollie = getMollie()
  if (price === 0 || !mollie) {
    await prisma.household.update({ where: { id: householdId }, data: { tier } })
    return NextResponse.json({ activated: true, tier, free: price === 0 })
  }

  // Betaald pakket via Mollie: eerste (terugkerende) betaling opzetten.
  try {
    const customer = await mollie.customers.create({ name: `${user.name} (${planName})` })
    const origin = baseUrl(req)
    const payment = await mollie.customerPayments.create({
      customerId: customer.id,
      amount: { currency: 'EUR', value: amount.toFixed(2) },
      description: `Fam ${planName}`,
      sequenceType: SequenceType.first,
      redirectUrl: `${origin}/modules`,
      metadata: { householdId: String(householdId), tier, billing: yearly ? 'yearly' : 'monthly' },
      ...(isPublic(origin) ? { webhookUrl: `${origin}/api/webhooks/mollie` } : {}),
    })

    await prisma.subscription.create({
      data: {
        householdId,
        name: `Pakket ${planName}`,
        amount,
        interval,
        status: 'pending',
        mollieCustomerId: customer.id,
      },
    })

    return NextResponse.json({ checkoutUrl: payment.getCheckoutUrl() })
  } catch (e) {
    return NextResponse.json({ error: `Mollie-fout: ${String(e)}` }, { status: 502 })
  }
}

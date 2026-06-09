import { SequenceType } from '@mollie/api-client'
import { prisma } from '@/lib/db'
import { getMollie, baseUrl, isPublic } from '@/lib/mollie'

export const dynamic = 'force-dynamic'

export async function GET() {
  const subs = await prisma.subscription.findMany({ orderBy: { id: 'desc' } })
  return Response.json(subs)
}

export async function POST(req: Request) {
  const body = await req.json()
  const name = String(body?.name ?? '').trim()
  const amount = Number(body?.amount)
  const interval = String(body?.interval ?? '1 month')
  if (!name || !amount) {
    return Response.json({ error: 'name en amount zijn verplicht' }, { status: 400 })
  }

  const sub = await prisma.subscription.create({
    data: { name, amount, interval, status: 'pending' },
  })

  const mollie = getMollie()
  if (!mollie) {
    // Lokale tracker zonder echte betaling.
    const updated = await prisma.subscription.update({
      where: { id: sub.id },
      data: { status: 'active' },
    })
    return Response.json({ subscription: updated, local: true })
  }

  try {
    const customer = await mollie.customers.create({ name })
    const origin = baseUrl(req)
    const payment = await mollie.customerPayments.create({
      customerId: customer.id,
      amount: { currency: 'EUR', value: amount.toFixed(2) },
      description: `Eerste betaling — ${name}`,
      sequenceType: SequenceType.first,
      redirectUrl: `${origin}/abonnementen`,
      // Mollie weigert localhost-webhooks; alleen meesturen als publiek bereikbaar.
      ...(isPublic(origin) ? { webhookUrl: `${origin}/api/webhooks/mollie` } : {}),
    })

    const updated = await prisma.subscription.update({
      where: { id: sub.id },
      data: { mollieCustomerId: customer.id },
    })

    const checkoutUrl = payment.getCheckoutUrl()
    return Response.json({ subscription: updated, checkoutUrl })
  } catch (e) {
    await prisma.subscription.delete({ where: { id: sub.id } })
    return Response.json({ error: `Mollie-fout: ${String(e)}` }, { status: 502 })
  }
}

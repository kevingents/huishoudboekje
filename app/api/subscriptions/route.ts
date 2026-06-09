import { SequenceType } from '@mollie/api-client'
import { prisma } from '@/lib/db'
import { getMollie, baseUrl, isPublic } from '@/lib/mollie'
import { requireHousehold } from '@/lib/guard'

export const dynamic = 'force-dynamic'

export async function GET() {
  const hid = await requireHousehold()
  if (hid instanceof Response) return hid
  const subs = await prisma.subscription.findMany({ where: { householdId: hid }, orderBy: { id: 'desc' } })
  return Response.json(subs)
}

export async function POST(req: Request) {
  const hid = await requireHousehold()
  if (hid instanceof Response) return hid
  const body = await req.json()
  const name = String(body?.name ?? '').trim()
  const amount = Number(body?.amount)
  const interval = String(body?.interval ?? '1 month')
  if (!name || !amount) {
    return Response.json({ error: 'name en amount zijn verplicht' }, { status: 400 })
  }

  const sub = await prisma.subscription.create({
    data: { householdId: hid, name, amount, interval, status: 'pending' },
  })

  const mollie = getMollie()
  if (!mollie) {
    const updated = await prisma.subscription.update({ where: { id: sub.id }, data: { status: 'active' } })
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
      redirectUrl: `${origin}/modules`,
      ...(isPublic(origin) ? { webhookUrl: `${origin}/api/webhooks/mollie` } : {}),
    })

    const updated = await prisma.subscription.update({
      where: { id: sub.id },
      data: { mollieCustomerId: customer.id },
    })

    return Response.json({ subscription: updated, checkoutUrl: payment.getCheckoutUrl() })
  } catch (e) {
    await prisma.subscription.delete({ where: { id: sub.id } })
    return Response.json({ error: `Mollie-fout: ${String(e)}` }, { status: 502 })
  }
}

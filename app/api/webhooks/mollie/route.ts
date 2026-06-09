import { prisma } from '@/lib/db'
import { getMollie, baseUrl, isPublic } from '@/lib/mollie'
import { normalizeTier } from '@/lib/modules'

export const dynamic = 'force-dynamic'

/**
 * Mollie roept deze webhook aan met een payment-id. Bij een betaalde eerste
 * betaling activeren we het pakket (tier) van het huishouden en maken we het
 * terugkerende abonnement aan.
 */
export async function POST(req: Request) {
  const form = await req.formData()
  const paymentId = String(form.get('id') ?? '')
  if (!paymentId) return new Response('geen id', { status: 400 })

  const mollie = getMollie()
  if (!mollie) return new Response('mollie niet geconfigureerd', { status: 200 })

  try {
    const payment = await mollie.payments.get(paymentId)
    const customerId = (payment as { customerId?: string }).customerId
    const metadata = ((payment as { metadata?: Record<string, unknown> }).metadata ?? {}) as Record<string, unknown>

    if (String(payment.sequenceType) === 'first' && String(payment.status) === 'paid' && customerId) {
      // Pakket-upgrade: activeer de tier van het huishouden uit de metadata.
      const householdId = Number(metadata.householdId)
      const tier = metadata.tier ? normalizeTier(String(metadata.tier)) : null
      if (householdId && tier) {
        await prisma.household.update({ where: { id: householdId }, data: { tier } }).catch(() => {})
      }

      const sub = await prisma.subscription.findFirst({
        where: { mollieCustomerId: customerId, mollieSubscriptionId: null },
      })
      if (sub) {
        const origin = baseUrl(req)
        // 1e maand gratis: de terugkerende betaling start pas over een maand.
        const start = new Date()
        start.setMonth(start.getMonth() + 1)
        const startDate = start.toISOString().slice(0, 10)
        const created = await mollie.customerSubscriptions.create({
          customerId,
          amount: { currency: 'EUR', value: sub.amount.toFixed(2) },
          interval: sub.interval,
          description: sub.name,
          startDate,
          ...(isPublic(origin) ? { webhookUrl: `${origin}/api/webhooks/mollie` } : {}),
        })
        await prisma.subscription.update({
          where: { id: sub.id },
          data: { status: 'active', mollieSubscriptionId: created.id },
        })
      }
    }
  } catch (e) {
    console.error('Mollie-webhook fout:', e)
  }

  // Mollie verwacht altijd een 200.
  return new Response('ok', { status: 200 })
}

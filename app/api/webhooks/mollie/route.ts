import { prisma } from '@/lib/db'
import { getMollie, baseUrl, isPublic } from '@/lib/mollie'

export const dynamic = 'force-dynamic'

/**
 * Mollie roept deze webhook aan met een payment-id. Bij een betaalde eerste
 * betaling (mandaat verkregen) maken we het terugkerende abonnement aan.
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

    if (String(payment.sequenceType) === 'first' && String(payment.status) === 'paid' && customerId) {
      const sub = await prisma.subscription.findFirst({
        where: { mollieCustomerId: customerId, mollieSubscriptionId: null },
      })
      if (sub) {
        const origin = baseUrl(req)
        const created = await mollie.customerSubscriptions.create({
          customerId,
          amount: { currency: 'EUR', value: sub.amount.toFixed(2) },
          interval: sub.interval,
          description: sub.name,
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

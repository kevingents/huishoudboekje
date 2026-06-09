import { prisma } from '@/lib/db'
import { getMollie } from '@/lib/mollie'

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const id = Number(params.id)
  const sub = await prisma.subscription.findUnique({ where: { id } })
  if (!sub) return new Response(null, { status: 204 })

  // Zeg het Mollie-abonnement op als het bestaat.
  const mollie = getMollie()
  if (mollie && sub.mollieCustomerId && sub.mollieSubscriptionId) {
    try {
      await mollie.customerSubscriptions.cancel(sub.mollieSubscriptionId, {
        customerId: sub.mollieCustomerId,
      })
    } catch (e) {
      console.error('Mollie opzeggen mislukt:', e)
    }
  }

  await prisma.subscription.delete({ where: { id } })
  return new Response(null, { status: 204 })
}

import { prisma } from '@/lib/db'
import { getMollie } from '@/lib/mollie'
import { requireHousehold } from '@/lib/guard'

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const hid = await requireHousehold()
  if (hid instanceof Response) return hid
  const id = Number(params.id)
  const sub = await prisma.subscription.findFirst({ where: { id, householdId: hid } })
  if (!sub) return new Response(null, { status: 204 })

  const mollie = getMollie()
  if (mollie && sub.mollieCustomerId && sub.mollieSubscriptionId) {
    try {
      await mollie.customerSubscriptions.cancel(sub.mollieSubscriptionId, { customerId: sub.mollieCustomerId })
    } catch (e) {
      console.error('Mollie opzeggen mislukt:', e)
    }
  }

  await prisma.subscription.delete({ where: { id } })
  return new Response(null, { status: 204 })
}

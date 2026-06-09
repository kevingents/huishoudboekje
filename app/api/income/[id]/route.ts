import { prisma } from '@/lib/db'
import { requireHousehold } from '@/lib/guard'

export const dynamic = 'force-dynamic'

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const hid = await requireHousehold()
  if (hid instanceof Response) return hid
  await prisma.income.deleteMany({ where: { id: Number(params.id), householdId: hid } })
  return new Response(null, { status: 204 })
}

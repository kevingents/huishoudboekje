import { prisma } from '@/lib/db'
import { requireModule } from '@/lib/guard'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const hid = await requireModule('pasjes')
  if (hid instanceof Response) return hid
  await prisma.card.deleteMany({ where: { id: Number(params.id), householdId: hid } })
  return new Response(null, { status: 204 })
}

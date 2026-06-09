import { prisma } from '@/lib/db'
import { requireHousehold } from '@/lib/guard'

export const dynamic = 'force-dynamic'

export async function GET() {
  const hid = await requireHousehold()
  if (hid instanceof Response) return hid
  const household = await prisma.household.findUnique({
    where: { id: hid },
    select: { id: true, name: true, tier: true },
  })
  return Response.json(household)
}

export async function PATCH(req: Request) {
  const hid = await requireHousehold()
  if (hid instanceof Response) return hid
  const body = await req.json().catch(() => ({}))
  const name = String(body?.name ?? '').trim()
  if (!name) return Response.json({ error: 'Vul een gezinsnaam in.' }, { status: 400 })
  const household = await prisma.household.update({
    where: { id: hid },
    data: { name },
    select: { id: true, name: true, tier: true },
  })
  return Response.json(household)
}

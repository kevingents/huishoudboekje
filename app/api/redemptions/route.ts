import { prisma } from '@/lib/db'
import { requireHousehold } from '@/lib/guard'
import { notify } from '@/lib/notify'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET() {
  const hid = await requireHousehold()
  if (hid instanceof Response) return hid
  const items = await prisma.redemption.findMany({ where: { householdId: hid }, orderBy: { id: 'desc' } })
  return Response.json(items)
}

export async function POST(req: Request) {
  const hid = await requireHousehold()
  if (hid instanceof Response) return hid
  const body = await req.json()
  const member = String(body?.member ?? '').trim()
  const title = String(body?.title ?? '').trim()
  const cost = Number(body?.cost ?? 0) || 0
  if (!member || !title) return Response.json({ error: 'member en title zijn verplicht' }, { status: 400 })

  const redemption = await prisma.redemption.create({
    data: { householdId: hid, member, title, cost },
  })

  await notify({
    householdId: hid,
    type: 'system',
    title: 'Beloning ingewisseld',
    body: `${member} wisselde ${cost} punten in voor: ${title}.`,
  }).catch(() => {})

  return Response.json(redemption, { status: 201 })
}

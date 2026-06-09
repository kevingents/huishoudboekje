import { prisma } from '@/lib/db'
import { requireModule } from '@/lib/guard'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET() {
  const hid = await requireModule('pasjes')
  if (hid instanceof Response) return hid
  const cards = await prisma.card.findMany({ where: { householdId: hid }, orderBy: { id: 'asc' } })
  return Response.json(cards)
}

export async function POST(req: Request) {
  const hid = await requireModule('pasjes')
  if (hid instanceof Response) return hid
  const body = await req.json()
  const name = String(body?.name ?? '').trim()
  if (!name) return Response.json({ error: 'name is verplicht' }, { status: 400 })
  const code = body?.code ? String(body.code).trim() : null
  const imageUrl = body?.imageUrl ? String(body.imageUrl) : null
  if (!code && !imageUrl) {
    return Response.json({ error: 'Voeg een barcode-nummer of een foto toe.' }, { status: 400 })
  }
  const card = await prisma.card.create({
    data: {
      householdId: hid,
      name,
      code,
      format: String(body?.format ?? 'CODE128'),
      imageUrl,
      color: String(body?.color ?? 'from-sky-400 to-blue-500'),
    },
  })
  return Response.json(card, { status: 201 })
}

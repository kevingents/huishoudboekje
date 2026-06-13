import { requireHousehold } from '@/lib/guard'
import { geocode } from '@/lib/geocode'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(req: Request) {
  const hid = await requireHousehold()
  if (hid instanceof Response) return hid
  const q = new URL(req.url).searchParams.get('q') ?? ''
  if (q.trim().length < 2) return Response.json({ results: [] })
  try {
    const results = await geocode(q)
    return Response.json({ results })
  } catch {
    return Response.json({ error: 'Plaats zoeken lukt even niet.' }, { status: 502 })
  }
}

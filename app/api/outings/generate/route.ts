import { requireHousehold } from '@/lib/guard'
import { generateOutings } from '@/lib/outings'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(req: Request) {
  const hid = await requireHousehold()
  if (hid instanceof Response) return hid

  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json(
      { error: 'Koppel eerst de AI-assistent (ANTHROPIC_API_KEY) om uitjes te laten verzinnen.' },
      { status: 503 },
    )
  }

  const body = await req.json().catch(() => ({}))
  const count = Math.min(15, Math.max(1, Math.floor(Number(body?.count)) || 10))
  try {
    const { created } = await generateOutings(hid, count)
    return Response.json({ ok: true, created }, { status: 201 })
  } catch (e) {
    console.error('Uitjes genereren fout:', e)
    return Response.json({ error: 'Verzinnen mislukt. Probeer het zo nog eens.' }, { status: 502 })
  }
}

import Anthropic from '@anthropic-ai/sdk'
import { prisma } from '@/lib/db'
import { requireHousehold } from '@/lib/guard'
import { proceduralCrest, sanitizeCrestSvg } from '@/lib/crest'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

async function aiCrest(description: string): Promise<string | null> {
  if (!process.env.ANTHROPIC_API_KEY) return null
  try {
    const client = new Anthropic()
    const res = await client.messages.create({
      model: process.env.ANTHROPIC_MODEL || 'claude-opus-4-8',
      max_tokens: 2000,
      system:
        'Je ontwerpt een familiewapen (coat of arms) als nette, platte SVG. Output UITSLUITEND geldige ' +
        'SVG-code, geen uitleg, geen markdown-hekken. Eisen: precies één <svg> met viewBox="0 0 200 240"; ' +
        'gebruik alleen <path>, <circle>, <rect>, <polygon>, <ellipse>, <line>, <g>, <text>, <defs>, ' +
        '<linearGradient>, <stop>. GEEN <script>, <image>, <foreignObject>, geen externe URLs, geen ' +
        'event-handlers (on...). Gebruik een wapenschild-vorm met 2 tot 4 harmonieuze kleuren en eenvoudige ' +
        'symbolen die bij de beschrijving passen. Maximaal ongeveer 1500 tekens.',
      messages: [{ role: 'user', content: `Ontwerp een familiewapen dat past bij dit gezin: ${description}` }],
    })
    const text = res.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('')
    return sanitizeCrestSvg(text)
  } catch (e) {
    console.error('Familiewapen-generatie fout:', e)
    return null
  }
}

export async function POST(req: Request) {
  const hid = await requireHousehold()
  if (hid instanceof Response) return hid
  const body = await req.json().catch(() => ({}))
  const description = String(body?.description ?? '').trim()
  if (!description) {
    return Response.json({ error: 'Beschrijf jullie gezin in een paar woorden.' }, { status: 400 })
  }

  const household = await prisma.household.findUnique({ where: { id: hid }, select: { name: true } })
  const initial = (household?.name?.replace(/^Het\s+/, '').charAt(0) || 'F').toUpperCase()

  // AI maakt het wapen; zonder key valt het terug op de procedurele variant.
  const svg = (await aiCrest(description)) || proceduralCrest(description, initial)

  // Server-side opslaan (autoritatief) zodat het altijd bewaard blijft.
  await prisma.setting.upsert({
    where: { householdId_key: { householdId: hid, key: 'familyCrest' } },
    update: { value: JSON.stringify(svg) },
    create: { householdId: hid, key: 'familyCrest', value: JSON.stringify(svg) },
  })
  await prisma.setting.upsert({
    where: { householdId_key: { householdId: hid, key: 'familyCrestDescription' } },
    update: { value: JSON.stringify(description) },
    create: { householdId: hid, key: 'familyCrestDescription', value: JSON.stringify(description) },
  })

  return Response.json({ svg })
}

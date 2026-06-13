import Anthropic from '@anthropic-ai/sdk'
import { prisma } from './db'

const SEASONS = ['winter', 'winter', 'lente', 'lente', 'lente', 'zomer', 'zomer', 'zomer', 'herfst', 'herfst', 'herfst', 'winter']
function seasonNow(): string {
  return SEASONS[new Date().getMonth()]
}

/** Naam van de ingestelde (weer)locatie, voor "uitjes in de omgeving". */
async function areaName(householdId: number): Promise<string> {
  const row = await prisma.setting.findFirst({ where: { householdId, key: 'weatherLocation' } })
  if (row) {
    try {
      const p = JSON.parse(row.value)
      if (p?.name) return String(p.name)
    } catch {
      /* val terug op default */
    }
  }
  return 'Nederland'
}

const CATEGORIES = ['natuur', 'speeltuin', 'water', 'cultuur', 'dieren', 'sport', 'creatief', 'eten', 'uitstapje']

const OUTINGS_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    outings: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          title: { type: 'string', description: 'Korte pakkende titel (NL), bv. "Speeltuinen-tour door de stad".' },
          description: { type: 'string', description: 'Eén zin: wat het is en waarom leuk voor het gezin.' },
          category: { type: 'string', enum: CATEGORIES },
          cost: { type: 'string', enum: ['gratis', 'laag', 'gemiddeld', 'hoog'] },
          area: { type: 'string', description: 'Waar/omgeving, bv. de plaatsnaam of "thuis".' },
        },
        required: ['title', 'description', 'category', 'cost', 'area'],
      },
    },
  },
  required: ['outings'],
} as const

interface GeneratedOuting {
  title: string
  description: string
  category: string
  cost: string
  area: string
}

/**
 * Laat de AI `count` gezinsuitjes verzinnen voor de omgeving van het huishouden:
 * een mix van gratis/creatieve ideeën (speeltuinen-tour, natuurbingo, …) en een
 * paar betaalde uitstapjes, passend bij het seizoen. Slaat ze op (source 'ai',
 * status 'idee') en dedupt op titel. Vereist ANTHROPIC_API_KEY.
 */
export async function generateOutings(householdId: number, count = 10): Promise<{ created: number }> {
  if (!process.env.ANTHROPIC_API_KEY) throw new Error('NO_AI_KEY')
  const area = await areaName(householdId)
  const season = seasonNow()

  const client = new Anthropic()
  const params = {
    model: process.env.ANTHROPIC_MODEL || 'claude-opus-4-8',
    max_tokens: 2048,
    system:
      'Je bedenkt leuke, concrete dingen om met het gezin (ouders + kinderen) te doen. ' +
      'Geef een gevarieerde mix: vooral GRATIS en creatieve ideeën (bv. een speeltuinen-tour, ' +
      'natuurbingo, stoepkrijt-route, kikkers zoeken, sterren kijken), plus een paar betaalde ' +
      'uitstapjes. Houd het realistisch en uitvoerbaar in of dichtbij de opgegeven omgeving, ' +
      'passend bij het seizoen. Korte, frisse titels. Geen herhaling.',
    messages: [
      {
        role: 'user',
        content: `Bedenk ${count} verschillende uitjes/activiteiten voor het gezin in de omgeving van ${area}. Het is ${season}. Varieer in categorie en kosten, met de nadruk op gratis en origineel.`,
      },
    ],
    output_config: { format: { type: 'json_schema', schema: OUTINGS_SCHEMA } },
  }
  const response = (await client.messages.create(params as never)) as Anthropic.Message
  const text = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('')
  const parsed = JSON.parse(text) as { outings?: GeneratedOuting[] }
  const ideas = Array.isArray(parsed.outings) ? parsed.outings : []

  // Niet opnieuw toevoegen wat er al staat (op titel).
  const existing = new Set(
    (await prisma.outing.findMany({ where: { householdId }, select: { title: true } })).map((o) => o.title.toLowerCase()),
  )
  const fresh = ideas
    .filter((o) => o?.title && !existing.has(o.title.trim().toLowerCase()))
    .slice(0, count)
  if (fresh.length === 0) return { created: 0 }

  await prisma.outing.createMany({
    data: fresh.map((o) => ({
      householdId,
      title: String(o.title).trim(),
      description: o.description ? String(o.description).trim() : null,
      category: CATEGORIES.includes(String(o.category)) ? String(o.category) : 'uitstapje',
      cost: ['gratis', 'laag', 'gemiddeld', 'hoog'].includes(String(o.cost)) ? String(o.cost) : null,
      area: o.area ? String(o.area).trim() : area,
      status: 'idee',
      source: 'ai',
    })),
  })
  return { created: fresh.length }
}

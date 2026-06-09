import Anthropic from '@anthropic-ai/sdk'
import { prisma } from '@/lib/db'
import { requireModule } from '@/lib/guard'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const RECEIPT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    merchant: { type: 'string', description: 'Naam van de winkel/leverancier.' },
    date: { type: 'string', description: 'Datum yyyy-mm-dd, of leeg als onbekend.' },
    total: { type: 'number', description: 'Het totaal betaalde bedrag in euro.' },
    category: { type: 'string', description: 'De best passende categorie uit de gegeven lijst, of "Overig".' },
    items: {
      type: 'array',
      description: 'De afzonderlijke posten op de bon/factuur.',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          name: { type: 'string' },
          price: { type: 'number' },
        },
        required: ['name', 'price'],
      },
    },
    advice: { type: 'string', description: 'Kort budgetadvies (1-2 zinnen) in het Nederlands.' },
  },
  required: ['merchant', 'date', 'total', 'category', 'items', 'advice'],
} as const

type ImageMedia = 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif'

function parseFile(
  dataUrl: string,
): { kind: 'image'; media: ImageMedia; data: string } | { kind: 'pdf'; data: string } | null {
  const img = /^data:(image\/(?:jpeg|png|webp|gif));base64,(.+)$/.exec(dataUrl)
  if (img) return { kind: 'image', media: img[1] as ImageMedia, data: img[2] }
  const pdf = /^data:application\/pdf;base64,(.+)$/.exec(dataUrl)
  if (pdf) return { kind: 'pdf', data: pdf[1] }
  return null
}

export async function POST(req: Request) {
  const hid = await requireModule('budgetplanner')
  if (hid instanceof Response) return hid

  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json(
      { error: 'Koppel eerst de AI-assistent (ANTHROPIC_API_KEY) om bonnen te kunnen scannen.' },
      { status: 503 },
    )
  }

  const body = await req.json().catch(() => ({}))
  const file = parseFile(String(body?.file ?? ''))
  if (!file) {
    return Response.json({ error: 'Geen geldige foto of PDF ontvangen.' }, { status: 400 })
  }

  const categories = (
    await prisma.budgetCategory.findMany({ where: { householdId: hid }, select: { name: true } })
  ).map((c) => c.name)
  const catText = categories.length ? categories.join(', ') : 'Boodschappen, Vaste lasten, Vrije tijd, Overig'

  const contentBlock =
    file.kind === 'image'
      ? { type: 'image', source: { type: 'base64', media_type: file.media, data: file.data } }
      : { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: file.data } }

  try {
    const client = new Anthropic()
    const params = {
      model: process.env.ANTHROPIC_MODEL || 'claude-opus-4-8',
      max_tokens: 1500,
      system:
        'Je leest een kassabon of factuur. Haal de winkel/leverancier, de datum (yyyy-mm-dd), het ' +
        'totaal betaalde bedrag en de afzonderlijke posten (naam + prijs) eruit. Kies de best passende ' +
        `categorie uit deze lijst: ${catText}. Past niets, gebruik "Overig". Geef tot slot kort, concreet ` +
        'budgetadvies (1-2 zinnen) op basis van wat er gekocht is. Antwoord in het Nederlands. Verzin ' +
        'geen bedragen die je niet kunt lezen; laat de datum leeg als die onleesbaar is.',
      messages: [
        {
          role: 'user',
          content: [
            contentBlock,
            { type: 'text', text: 'Lees deze bon/factuur uit: bedrag, posten, categorie en advies.' },
          ],
        },
      ],
      output_config: { format: { type: 'json_schema', schema: RECEIPT_SCHEMA } },
    }
    const response = (await client.messages.create(params as never)) as Anthropic.Message
    const text = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('')
    const parsed = JSON.parse(text)

    // Categorie terugmappen naar een bestaande categorie (case-insensitief).
    const match = categories.find((c) => c.toLowerCase() === String(parsed.category ?? '').toLowerCase())

    return Response.json({
      merchant: String(parsed.merchant ?? ''),
      date: String(parsed.date ?? ''),
      total: Number(parsed.total) || 0,
      category: match ?? categories[0] ?? 'Overig',
      items: Array.isArray(parsed.items)
        ? parsed.items.map((i: { name?: unknown; price?: unknown }) => ({
            name: String(i?.name ?? ''),
            price: Number(i?.price) || 0,
          }))
        : [],
      advice: String(parsed.advice ?? ''),
    })
  } catch (e) {
    console.error('Bon-scan fout:', e)
    return Response.json({ error: 'Uitlezen mislukt. Probeer een duidelijkere foto of PDF.' }, { status: 502 })
  }
}

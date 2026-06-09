import Anthropic from '@anthropic-ai/sdk'
import { requireModule } from '@/lib/guard'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const SCAN_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    ingredients: { type: 'array', items: { type: 'string' } },
    suggestions: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          title: { type: 'string' },
          description: { type: 'string' },
        },
        required: ['title', 'description'],
      },
    },
  },
  required: ['ingredients', 'suggestions'],
} as const

type MediaType = 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif'

function parseDataUrl(dataUrl: string): { media: MediaType; data: string } | null {
  const m = /^data:(image\/(?:jpeg|png|webp|gif));base64,(.+)$/.exec(dataUrl)
  if (!m) return null
  return { media: m[1] as MediaType, data: m[2] }
}

export async function POST(req: Request) {
  const hid = await requireModule('koelkast')
  if (hid instanceof Response) return hid

  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json(
      { error: 'Koppel eerst de AI-assistent (ANTHROPIC_API_KEY) om foto’s te analyseren.' },
      { status: 503 },
    )
  }

  const body = await req.json().catch(() => ({}))
  const image = parseDataUrl(String(body?.image ?? ''))
  if (!image) {
    return Response.json({ error: 'Geen geldige afbeelding ontvangen.' }, { status: 400 })
  }

  try {
    const client = new Anthropic()
    const params = {
      model: process.env.ANTHROPIC_MODEL || 'claude-opus-4-8',
      max_tokens: 1024,
      system:
        'Je bekijkt een foto van een koelkast of voorraadkast. Noem de zichtbare, eetbare ' +
        'ingrediënten in het Nederlands (kort, enkelvoud) en stel 2 tot 4 gerechten voor die je ' +
        'met die ingrediënten kunt maken.',
      messages: [
        {
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: image.media, data: image.data } },
            { type: 'text', text: 'Wat zie je en wat kan ik hiermee koken?' },
          ],
        },
      ],
      output_config: { format: { type: 'json_schema', schema: SCAN_SCHEMA } },
    }
    const response = (await client.messages.create(params as never)) as Anthropic.Message
    const text = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('')
    const parsed = JSON.parse(text)
    return Response.json({
      ingredients: Array.isArray(parsed.ingredients) ? parsed.ingredients.map(String) : [],
      suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions : [],
    })
  } catch (e) {
    console.error('Koelkast-scan fout:', e)
    return Response.json({ error: 'Analyse mislukt. Probeer een duidelijkere foto.' }, { status: 502 })
  }
}

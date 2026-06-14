import Anthropic from '@anthropic-ai/sdk'
import { chatModel } from '@/lib/aiModels'
import { consumeAiCredit, aiLimitResponse } from '@/lib/aiUsage'
import { prisma } from '@/lib/db'
import { serializeRecipe, tagsToString } from '@/lib/serialize'
import { requireModule } from '@/lib/guard'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const FALLBACK_IMAGE =
  'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=900&q=80'

const RECIPE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    title: { type: 'string' },
    description: { type: 'string' },
    time: { type: 'string' },
    servings: { type: 'string' },
    tags: { type: 'array', items: { type: 'string' } },
    ingredients: {
      type: 'array',
      description: 'Alle ingrediënten met hoeveelheid.',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          name: { type: 'string', description: 'Productnaam, kort (NL), bv. "pasta", "ui".' },
          amount: { type: 'string', description: 'Hoeveelheid, bv. "200 g", "1 stuk", "2 el".' },
        },
        required: ['name', 'amount'],
      },
    },
    steps: { type: 'array', description: 'De bereidingsstappen in volgorde.', items: { type: 'string' } },
  },
  required: ['title', 'description', 'time', 'servings', 'tags', 'ingredients', 'steps'],
} as const

export async function POST(req: Request) {
  const hid = await requireModule('ai')
  if (hid instanceof Response) return hid

  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json(
      { error: 'Koppel eerst de AI-assistent (ANTHROPIC_API_KEY) om recepten te laten genereren.' },
      { status: 503 },
    )
  }

  const body = await req.json().catch(() => ({}))
  const wish = String(body?.wish ?? '').trim()
  const ingredients: string[] = Array.isArray(body?.ingredients) ? body.ingredients.map(String) : []

  // Smaakvoorkeur afleiden uit eerder geduimde recepten van dit huishouden.
  const liked = await prisma.recipe.findMany({ where: { householdId: hid, vote: { gt: 0 } }, select: { tags: true } })
  const likedTags = [...new Set(liked.flatMap((r) => r.tags.split(',').map((t) => t.trim()).filter(Boolean)))]

  const context = [
    likedTags.length ? `Het gezin houdt van: ${likedTags.join(', ')}.` : '',
    ingredients.length ? `Beschikbare ingrediënten: ${ingredients.join(', ')}.` : '',
    wish ? `Wens: ${wish}.` : '',
  ]
    .filter(Boolean)
    .join(' ')

  const credit = await consumeAiCredit(hid)
  if (!credit.ok) return aiLimitResponse()

  try {
    const client = new Anthropic()
    // output_config (structured outputs) is nog niet getypt in deze SDK-versie.
    const params = {
      model: chatModel(),
      max_tokens: 1024,
      system:
        'Je bent een kok die makkelijke, gezinsvriendelijke Nederlandse recepten bedenkt. ' +
        'Geef één recept terug dat past bij de voorkeuren. Houd het realistisch en kort. ' +
        'Vermeld ALTIJD de volledige ingrediëntenlijst (met hoeveelheid per ingrediënt) en ' +
        'duidelijke, genummerde bereidingsstappen.',
      messages: [
        {
          role: 'user',
          content: `Bedenk één recept voor het gezin. ${context || 'Verras me met iets lekkers.'}`,
        },
      ],
      output_config: { format: { type: 'json_schema', schema: RECIPE_SCHEMA } },
    }
    const response = (await client.messages.create(params as never)) as Anthropic.Message

    const text = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('')
    const parsed = JSON.parse(text)

    const ingredients = Array.isArray(parsed.ingredients)
      ? parsed.ingredients
          .map((i: { name?: unknown; amount?: unknown }) => ({
            name: String(i?.name ?? '').trim(),
            amount: String(i?.amount ?? '').trim(),
          }))
          .filter((i: { name: string }) => i.name)
      : []
    const steps = Array.isArray(parsed.steps)
      ? parsed.steps.map((s: unknown) => String(s).trim()).filter(Boolean)
      : []

    const recipe = await prisma.recipe.create({
      data: {
        householdId: hid,
        title: String(parsed.title),
        description: String(parsed.description ?? ''),
        time: String(parsed.time ?? ''),
        servings: String(parsed.servings ?? ''),
        tags: tagsToString([...(parsed.tags ?? []), 'AI']),
        ingredients,
        steps,
        image: FALLBACK_IMAGE,
        favorite: false,
      },
    })

    return Response.json(serializeRecipe(recipe), { status: 201 })
  } catch (e) {
    console.error('Receptgeneratie fout:', e)
    return Response.json({ error: 'Genereren mislukt. Probeer het zo nog eens.' }, { status: 502 })
  }
}

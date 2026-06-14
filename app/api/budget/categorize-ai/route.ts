import Anthropic from '@anthropic-ai/sdk'
import { fastModel } from '@/lib/aiModels'
import { prisma } from '@/lib/db'
import { requireHousehold } from '@/lib/guard'
import { RULE_KINDS } from '@/lib/budget'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    items: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          key: { type: 'string', description: 'De winkel-sleutel exact zoals gegeven.' },
          category: { type: 'string', description: 'Beste categorie uit de lijst (leeg bij income/fixed/ignore).' },
          kind: { type: 'string', enum: ['expense', 'income', 'fixed', 'ignore'] },
        },
        required: ['key', 'category', 'kind'],
      },
    },
  },
  required: ['items'],
} as const

export async function POST(req: Request) {
  const hid = await requireHousehold()
  if (hid instanceof Response) return hid

  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json(
      { error: 'Koppel eerst de AI-assistent (ANTHROPIC_API_KEY) om automatisch in te delen.' },
      { status: 503 },
    )
  }

  const body = await req.json().catch(() => ({}))
  const groups = (Array.isArray(body?.groups) ? body.groups : []).slice(0, 60) as Array<{
    key?: string
    example?: string
  }>
  const items = groups.map((g) => ({ key: String(g?.key ?? ''), example: String(g?.example ?? '') })).filter((g) => g.key)
  if (!items.length) return Response.json({ items: [] })

  const categories = (await prisma.budgetCategory.findMany({ where: { householdId: hid }, select: { name: true } }))
    .map((c) => c.name)
    .filter((n) => n !== 'Inkomsten' && n !== 'Negeren')
  const catText = categories.length
    ? categories.join(', ')
    : 'Boodschappen, Horeca, Vervoer, Gas/Elektra/Water, Verzekeringen, Internet/TV/Telefoon, Winkels, Apotheek/Medisch, Aflossingen, Belastingen, Sport, Leuke dingen/Uitjes, Overig'

  try {
    const client = new Anthropic()
    const listText = items.map((g, i) => `${i + 1}. "${g.key}" (voorbeeld: ${g.example})`).join('\n')
    const params = {
      model: fastModel(),
      max_tokens: 2500,
      thinking: { type: 'adaptive' },
      system:
        'Je bent een Nederlandse budgetassistent. Je krijgt winkels/omschrijvingen van bankafschriften. ' +
        `Kies voor elk de best passende categorie uit deze lijst: ${catText}. ` +
        'Is iets eigenlijk INKOMEN (salaris, toeslag, teruggave, ontvangen geld)? Zet kind="income". ' +
        'Is het een vaste maandelijkse last (huur, hypotheek, energie, water, verzekering, abonnement, telecom)? Zet kind="fixed". ' +
        'Is het een overboeking naar een eigen spaarrekening of iets dat niet als uitgave telt? Zet kind="ignore". ' +
        'Anders kind="expense" met de beste categorie. Geef voor elk item de key exact terug zoals gegeven. ' +
        'Twijfel je sterk, gebruik category="Overig" en kind="expense".',
      messages: [{ role: 'user', content: [{ type: 'text', text: `Deel deze posten in:\n${listText}` }] }],
      output_config: { format: { type: 'json_schema', schema: SCHEMA } },
    }
    const response = (await client.messages.create(params as never)) as Anthropic.Message
    const text = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('')
    const parsed = JSON.parse(text)
    const out = Array.isArray(parsed?.items)
      ? parsed.items
          .map((it: { key?: unknown; category?: unknown; kind?: unknown }) => ({
            key: String(it?.key ?? ''),
            category: String(it?.category ?? ''),
            kind: RULE_KINDS.includes(it?.kind as never) ? (it!.kind as string) : 'expense',
          }))
          .filter((it: { key: string }) => it.key)
      : []
    return Response.json({ items: out })
  } catch (e) {
    console.error('AI-categorisatie fout:', e)
    return Response.json({ error: 'AI-indeling mislukt. Probeer het later opnieuw.' }, { status: 502 })
  }
}

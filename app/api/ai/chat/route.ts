import Anthropic from '@anthropic-ai/sdk'
import { prisma } from '@/lib/db'
import { requireHousehold, requireModule } from '@/lib/guard'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const SYSTEM_PROMPT = `Je bent de behulpzame AI-assistent in het gezinsdashboard "Huishoudboekje".
Je helpt met maaltijden plannen, boodschappen, agenda, budget en huishoudelijke vragen.
Antwoord in het Nederlands, vriendelijk en kort en bondig. Geef direct het antwoord, zonder je redenering te tonen.
Gebruik de gezinsgegevens hieronder om persoonlijk en concreet te antwoorden. Verzin geen gegevens die er niet staan.`

const FALLBACK_REPLY =
  'Ik kan nu nog geen live antwoord geven — koppel je AI-assistent in Instellingen (Anthropic API-key) om echte antwoorden te krijgen. Tot die tijd noteer ik je vraag alvast.'

const AI_OFF_REPLY = 'De AI-assistent staat uit. Zet ‘m aan in Instellingen om weer te kunnen chatten.'

type DataPrefs = {
  agenda: boolean
  boodschappen: boolean
  budget: boolean
  recepten: boolean
  gezin: boolean
}

/** Leest de AI-instellingen (aan/uit + welke data) voor dit huishouden. */
async function readAiSettings(householdId: number): Promise<{ enabled: boolean; data: DataPrefs }> {
  const rows = await prisma.setting.findMany({
    where: { householdId, key: { in: ['aiEnabled', 'aiData'] } },
  })
  const get = (k: string): unknown => {
    const r = rows.find((x) => x.key === k)
    if (!r) return undefined
    try {
      return JSON.parse(r.value)
    } catch {
      return undefined
    }
  }
  const d = (get('aiData') ?? {}) as Partial<DataPrefs>
  return {
    enabled: get('aiEnabled') !== false, // standaard aan
    data: {
      agenda: d.agenda !== false,
      boodschappen: d.boodschappen !== false,
      budget: d.budget !== false,
      recepten: d.recepten !== false,
      gezin: d.gezin !== false,
    },
  }
}

/** Bouwt een korte context-tekst uit de toegestane gezinsgegevens. */
async function buildContext(householdId: number, data: DataPrefs): Promise<string> {
  const parts: string[] = []

  if (data.gezin) {
    const members = await prisma.familyMember.findMany({ where: { householdId } })
    if (members.length) {
      parts.push(
        `Gezinsleden: ${members.map((m) => (m.role ? `${m.name} (${m.role})` : m.name)).join(', ')}.`,
      )
    }
  }

  if (data.agenda) {
    const today = new Date().toISOString().slice(0, 10)
    const events = await prisma.agendaEvent.findMany({
      where: { householdId, dateKey: { gte: today } },
      orderBy: [{ dateKey: 'asc' }, { id: 'asc' }],
      take: 15,
    })
    if (events.length) {
      parts.push(
        `Aankomende afspraken:\n${events
          .map((e) => `- ${e.dateKey}${e.time ? ` ${e.time}` : ''} ${e.title} (voor ${e.who})`)
          .join('\n')}`,
      )
    }
  }

  if (data.boodschappen) {
    const items = await prisma.shoppingItem.findMany({ where: { householdId, checked: false } })
    if (items.length) parts.push(`Open boodschappen: ${items.map((i) => i.label).join(', ')}.`)
  }

  if (data.budget) {
    const cats = await prisma.budgetCategory.findMany({ where: { householdId } })
    if (cats.length) {
      const spent = Math.round(cats.reduce((a, c) => a + c.spent, 0))
      const limit = Math.round(cats.reduce((a, c) => a + c.limit, 0))
      parts.push(
        `Budget deze maand: €${spent} uitgegeven van €${limit}. Per categorie: ${cats
          .map((c) => `${c.name} €${Math.round(c.spent)}/€${Math.round(c.limit)}`)
          .join(', ')}.`,
      )
    }
  }

  if (data.recepten) {
    const recipes = await prisma.recipe.findMany({
      where: { householdId, OR: [{ favorite: true }, { vote: { gt: 0 } }] },
      take: 15,
    })
    if (recipes.length) parts.push(`Geliefde recepten: ${recipes.map((r) => r.title).join(', ')}.`)
  }

  return parts.join('\n\n')
}

export async function GET() {
  const hid = await requireHousehold()
  if (hid instanceof Response) return hid
  const messages = await prisma.chatMessage.findMany({ where: { householdId: hid }, orderBy: { id: 'asc' } })
  return Response.json(messages)
}

export async function POST(req: Request) {
  const hid = await requireModule('ai')
  if (hid instanceof Response) return hid
  const body = await req.json()
  const text = String(body?.text ?? '').trim()
  if (!text) return Response.json({ error: 'text is verplicht' }, { status: 400 })

  await prisma.chatMessage.create({ data: { householdId: hid, role: 'user', text } })

  const settings = await readAiSettings(hid)
  let reply: string
  if (!settings.enabled) {
    reply = AI_OFF_REPLY
  } else {
    const context = await buildContext(hid, settings.data)
    const system = context ? `${SYSTEM_PROMPT}\n\n--- Gezinsgegevens ---\n${context}` : SYSTEM_PROMPT
    reply = await generateReply(hid, system)
  }

  await prisma.chatMessage.create({ data: { householdId: hid, role: 'assistant', text: reply } })
  const messages = await prisma.chatMessage.findMany({ where: { householdId: hid }, orderBy: { id: 'asc' } })
  return Response.json({ reply, messages })
}

async function generateReply(householdId: number, system: string): Promise<string> {
  if (!process.env.ANTHROPIC_API_KEY) return FALLBACK_REPLY

  try {
    const client = new Anthropic()
    const history = await prisma.chatMessage.findMany({ where: { householdId }, orderBy: { id: 'asc' } })

    // Bouw de gespreksgeschiedenis; de Messages-API moet met 'user' beginnen.
    const apiMessages = history.map((m) => ({ role: m.role as 'user' | 'assistant', content: m.text }))
    while (apiMessages.length && apiMessages[0].role !== 'user') apiMessages.shift()

    const response = await client.messages.create({
      model: process.env.ANTHROPIC_MODEL || 'claude-opus-4-8',
      max_tokens: 1024,
      system,
      messages: apiMessages,
    })

    const out = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map((block) => block.text)
      .join('')
      .trim()

    return out || FALLBACK_REPLY
  } catch (e) {
    console.error('AI-chat fout:', e)
    return 'Er ging iets mis bij het ophalen van een antwoord. Probeer het zo nog eens.'
  }
}

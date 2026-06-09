import Anthropic from '@anthropic-ai/sdk'
import { prisma } from '@/lib/db'
import { requireHousehold } from '@/lib/guard'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const SYSTEM_PROMPT = `Je bent de behulpzame AI-assistent in het gezinsdashboard "Huishoudboekje".
Je helpt met maaltijden plannen, boodschappen, agenda, budget en huishoudelijke vragen.
Antwoord in het Nederlands, vriendelijk en kort en bondig. Geef direct het antwoord, zonder je redenering te tonen.`

const FALLBACK_REPLY =
  'Ik kan nu nog geen live antwoord geven — koppel je AI-assistent in Instellingen (Anthropic API-key) om echte antwoorden te krijgen. Tot die tijd noteer ik je vraag alvast.'

export async function GET() {
  const hid = await requireHousehold()
  if (hid instanceof Response) return hid
  const messages = await prisma.chatMessage.findMany({ where: { householdId: hid }, orderBy: { id: 'asc' } })
  return Response.json(messages)
}

export async function POST(req: Request) {
  const hid = await requireHousehold()
  if (hid instanceof Response) return hid
  const body = await req.json()
  const text = String(body?.text ?? '').trim()
  if (!text) return Response.json({ error: 'text is verplicht' }, { status: 400 })

  await prisma.chatMessage.create({ data: { householdId: hid, role: 'user', text } })

  const reply = await generateReply(hid)

  await prisma.chatMessage.create({ data: { householdId: hid, role: 'assistant', text: reply } })
  const messages = await prisma.chatMessage.findMany({ where: { householdId: hid }, orderBy: { id: 'asc' } })
  return Response.json({ reply, messages })
}

async function generateReply(householdId: number): Promise<string> {
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
      system: SYSTEM_PROMPT,
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

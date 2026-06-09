import crypto from 'crypto'
import Anthropic from '@anthropic-ai/sdk'
import { prisma } from './db'

/* -------------------------------------------------------------------------- */
/*  Inbound-adres (Resend Inbound)                                            */
/* -------------------------------------------------------------------------- */

/** Het inbound-domein. Platform-config; standaard het Resend-subdomein. */
export const INBOUND_DOMAIN = process.env.INBOUND_DOMAIN || 'granednal.resend.app'

export function inboundAddress(token: string): string {
  return `${token}@${INBOUND_DOMAIN}`
}

function generateInboundToken(): string {
  return `fam-${crypto.randomBytes(4).toString('hex')}`
}

/**
 * Geeft het inbound-token van een huishouden terug, en maakt er één aan als het
 * nog niet bestaat. Botst de unieke index (heel onwaarschijnlijk), dan opnieuw.
 */
export async function ensureInboundToken(householdId: number): Promise<string> {
  const hh = await prisma.household.findUnique({ where: { id: householdId }, select: { inboundToken: true } })
  if (hh?.inboundToken) return hh.inboundToken
  for (let attempt = 0; attempt < 5; attempt++) {
    const token = generateInboundToken()
    try {
      await prisma.household.update({ where: { id: householdId }, data: { inboundToken: token } })
      return token
    } catch {
      // unieke botsing — opnieuw proberen
    }
  }
  throw new Error('Kon geen inbound-token aanmaken')
}

/** Haalt het lokale deel (vóór de @) uit een "Naam <x@y>"- of "x@y"-adres. */
export function localPartOf(addr: string): string {
  const m = addr.match(/<([^>]+)>/)
  const email = (m ? m[1] : addr).trim()
  const local = email.split('@')[0] ?? ''
  // strip "+subadres"
  return local.split('+')[0].toLowerCase()
}

/** Vindt het huishouden voor een lijst van ontvangers (op inboundToken). */
export async function resolveHousehold(toList: string[]): Promise<number | null> {
  for (const to of toList) {
    const token = localPartOf(to)
    if (!token) continue
    const hh = await prisma.household.findUnique({ where: { inboundToken: token }, select: { id: true } })
    if (hh) return hh.id
  }
  // Fallback: als er precies één huishouden bestaat, route daarheen (handig tijdens
  // het opzetten, als er nog naar een willekeurig adres gemaild is).
  const count = await prisma.household.count()
  if (count === 1) {
    const only = await prisma.household.findFirst({ select: { id: true } })
    return only?.id ?? null
  }
  return null
}

/* -------------------------------------------------------------------------- */
/*  Body + bijlagen ophalen via de Resend Receiving API                       */
/* -------------------------------------------------------------------------- */

const RESEND_BASE = 'https://api.resend.com'

export interface ReceivedEmail {
  from?: string
  to?: string[]
  subject?: string
  text?: string | null
  html?: string | null
}

/** GET /emails/receiving/{id} — volledige body. Best-effort (null bij geen key/fout). */
export async function fetchReceivedEmail(emailId: string): Promise<ReceivedEmail | null> {
  const key = process.env.RESEND_API_KEY
  if (!key) return null
  try {
    const res = await fetch(`${RESEND_BASE}/emails/receiving/${emailId}`, {
      headers: { Authorization: `Bearer ${key}` },
    })
    if (!res.ok) return null
    return (await res.json()) as ReceivedEmail
  } catch {
    return null
  }
}

export interface InboundAttachment {
  id: string
  filename: string
  content_type: string
  download_url: string
  expires_at?: string
}

/** GET /emails/receiving/{id}/attachments — bijlagen met download-URL. Best-effort. */
export async function listInboundAttachments(emailId: string): Promise<InboundAttachment[]> {
  const key = process.env.RESEND_API_KEY
  if (!key) return []
  try {
    const res = await fetch(`${RESEND_BASE}/emails/receiving/${emailId}/attachments`, {
      headers: { Authorization: `Bearer ${key}` },
    })
    if (!res.ok) return []
    const json = (await res.json()) as { data?: InboundAttachment[] }
    return Array.isArray(json.data) ? json.data : []
  } catch {
    return []
  }
}

/* -------------------------------------------------------------------------- */
/*  AI-classificatie                                                          */
/* -------------------------------------------------------------------------- */

export interface MailClassification {
  category: 'garantie' | 'document' | 'afspraak' | 'boodschap' | 'overig'
  documentType: 'garantie' | 'legitimatie' | 'overig' | 'geen'
  title: string
  summary: string
  owner: string
  expiresAt: string
  eventDate: string
  eventTime: string
  shoppingItems: string[]
}

const MAIL_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    category: { type: 'string', enum: ['garantie', 'document', 'afspraak', 'boodschap', 'overig'] },
    documentType: { type: 'string', enum: ['garantie', 'legitimatie', 'overig', 'geen'] },
    title: { type: 'string' },
    summary: { type: 'string' },
    owner: { type: 'string' },
    expiresAt: { type: 'string' },
    eventDate: { type: 'string' },
    eventTime: { type: 'string' },
    shoppingItems: { type: 'array', items: { type: 'string' } },
  },
  required: [
    'category',
    'documentType',
    'title',
    'summary',
    'owner',
    'expiresAt',
    'eventDate',
    'eventTime',
    'shoppingItems',
  ],
} as const

function fallbackClassification(subject: string): MailClassification {
  return {
    category: 'overig',
    documentType: 'geen',
    title: subject || 'Doorgestuurde mail',
    summary: 'Ontvangen — nog niet geclassificeerd (AI niet gekoppeld).',
    owner: '',
    expiresAt: '',
    eventDate: '',
    eventTime: '',
    shoppingItems: [],
  }
}

/**
 * Classificeert een doorgestuurde mail met Claude en haalt de relevante velden
 * eruit. Zonder ANTHROPIC_API_KEY valt het terug op een neutrale classificatie.
 */
export async function classifyMail(input: {
  subject: string
  text: string
  from: string
  members: string[]
  today: string // yyyy-mm-dd
}): Promise<MailClassification> {
  if (!process.env.ANTHROPIC_API_KEY) return fallbackClassification(input.subject)

  const body = input.text.slice(0, 6000)
  const system =
    'Je bent de slimme postsorteerder van een gezinsapp. Je krijgt een doorgestuurde e-mail ' +
    '(factuur, garantiebewijs, officieel document, afspraakbevestiging of boodschappenlijst) en ' +
    'bepaalt de categorie en haalt de belangrijkste gegevens eruit. Antwoord in het Nederlands.\n\n' +
    'Regels:\n' +
    '- category "garantie": aankoopbon/garantiebewijs van een product. Zet bij documentType "garantie" ' +
    'en bij expiresAt de einddatum van de garantie als die te bepalen is (anders leeg).\n' +
    '- category "document": officieel document (paspoort, rijbewijs, verzekeringspolis, diploma). ' +
    'Zet documentType "legitimatie" voor ID-bewijzen, anders "overig". expiresAt = verloopdatum indien bekend.\n' +
    '- category "afspraak": een afspraak/reservering met datum. Vul eventDate (yyyy-mm-dd) en eventTime (HH:MM, leeg als hele dag).\n' +
    '- category "boodschap": een boodschappenlijst. Vul shoppingItems met losse producten.\n' +
    '- category "overig": iets anders.\n' +
    '- documentType "geen" als het geen document of garantie is.\n' +
    '- owner: het gezinslid waar het bij hoort als dat duidelijk is, anders leeg.\n' +
    '- Gebruik lege strings voor onbekende velden; verzin geen datums.\n' +
    `- Vandaag is ${input.today}. Bekende gezinsleden: ${input.members.join(', ') || '(onbekend)'}.`

  try {
    const client = new Anthropic()
    const params = {
      model: process.env.ANTHROPIC_MODEL || 'claude-opus-4-8',
      max_tokens: 1024,
      system,
      messages: [
        {
          role: 'user',
          content: `Afzender: ${input.from}\nOnderwerp: ${input.subject}\n\nInhoud:\n${body || '(geen tekst)'}`,
        },
      ],
      output_config: { format: { type: 'json_schema', schema: MAIL_SCHEMA } },
    }
    const response = (await client.messages.create(params as never)) as Anthropic.Message
    const out = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('')
    const parsed = JSON.parse(out) as Partial<MailClassification>
    const fb = fallbackClassification(input.subject)
    return {
      category: (parsed.category as MailClassification['category']) ?? fb.category,
      documentType: (parsed.documentType as MailClassification['documentType']) ?? 'geen',
      title: String(parsed.title || fb.title),
      summary: String(parsed.summary || ''),
      owner: String(parsed.owner || ''),
      expiresAt: String(parsed.expiresAt || ''),
      eventDate: String(parsed.eventDate || ''),
      eventTime: String(parsed.eventTime || ''),
      shoppingItems: Array.isArray(parsed.shoppingItems) ? parsed.shoppingItems.map(String) : [],
    }
  } catch (e) {
    console.error('[inbound] AI-classificatie mislukt:', e)
    return fallbackClassification(input.subject)
  }
}

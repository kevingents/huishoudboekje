// Slimme verloop-reminders voor documenten. Per type een eigen aanlooptijd:
// een paspoort/ID/rijbewijs wil je een half jaar vooruit weten (afspraak bij de
// gemeente + verwerkingstijd), een garantie pas vlak van tevoren.

export type DocumentType = 'garantie' | 'factuur' | 'contract' | 'officieel' | 'legitimatie' | string

/** Is dit een identiteitsdocument (lange aanlooptijd nodig)? */
export function isIdDocument(type: string): boolean {
  return type === 'legitimatie'
}

/**
 * Op welke dagen-vóór-verloop sturen we een reminder. Vaste drempels i.p.v.
 * dagelijks, zodat het niet spamt. Identiteitsdocumenten beginnen 6 maanden
 * vooruit; contracten 2 maanden; overige documenten ~1 maand.
 */
export function reminderThresholds(type: string): number[] {
  if (isIdDocument(type)) return [180, 90, 60, 30, 14, 7, 1, 0]
  if (type === 'contract' || type === 'officieel') return [60, 30, 14, 7, 1, 0]
  return [30, 14, 7, 1, 0]
}

/** Dagen tot een yyyy-mm-dd-datum (hele dagen, in UTC). */
export function daysUntil(iso: string): number | null {
  const [y, m, d] = iso.split('-').map(Number)
  if (!y || !m || !d) return null
  const target = Date.UTC(y, m - 1, d)
  const now = new Date()
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  return Math.round((target - today) / 86_400_000)
}

/** Mensvriendelijke "verloopt over …"-tekst: maanden/weken/dagen naar gelang. */
export function expiryPhrase(days: number): string {
  if (days < 0) return 'is verlopen'
  if (days === 0) return 'verloopt vandaag'
  if (days === 1) return 'verloopt morgen'
  if (days < 14) return `verloopt over ${days} dagen`
  if (days < 60) {
    const w = Math.round(days / 7)
    return `verloopt over ${w} ${w === 1 ? 'week' : 'weken'}`
  }
  const months = Math.round(days / 30)
  return `verloopt over ${months} ${months === 1 ? 'maand' : 'maanden'}`
}

/** Concrete vervolgactie per documenttype (wat moet de gebruiker dóen). */
export function expiryAction(type: string): string {
  if (isIdDocument(type)) return 'Plan op tijd een afspraak bij de gemeente voor een nieuwe.'
  if (type === 'contract') return 'Let op de opzegtermijn — wil je verlengen of opzeggen?'
  if (type === 'garantie') return 'Daarna vervalt de garantie.'
  if (type === 'factuur') return ''
  return 'Vraag op tijd een nieuwe aan.'
}

/**
 * Toewijzing aan meerdere personen. We bewaren een JSON-lijst van gezinslid-namen
 * (Task.assignees / AgendaEvent.whoList) en houden het legacy enkelvoudige veld
 * (assignedTo / who) als weergave/terugval. Deze helpers zetten beide vormen om.
 */

/** Parse een opgeslagen JSON-namenlijst → opgeschoonde, ontdubbelde namen. */
export function parseNames(json: string | null | undefined): string[] {
  if (!json) return []
  let raw: unknown
  try {
    raw = JSON.parse(json)
  } catch {
    return []
  }
  if (!Array.isArray(raw)) return []
  const out: string[] = []
  for (const v of raw) {
    const name = typeof v === 'string' ? v.trim() : ''
    if (name && !out.includes(name)) out.push(name)
  }
  return out
}

/** Maak een namenlijst klaar voor opslag (ontdubbeld/getrimd), of null bij leeg. */
export function serializeNames(list: string[]): string | null {
  const clean: string[] = []
  for (const v of list) {
    const name = (v ?? '').trim()
    if (name && !clean.includes(name)) clean.push(name)
  }
  return clean.length ? JSON.stringify(clean) : null
}

/** De toegewezen personen van een taak (assignees-lijst, of legacy assignedTo). */
export function taskAssignees(task: { assignees?: string | null; assignedTo?: string | null }): string[] {
  const list = parseNames(task.assignees)
  if (list.length) return list
  const single = (task.assignedTo ?? '').trim()
  return single ? [single] : []
}

/** De "voor wie" van een afspraak (whoList, of legacy who; "Gezin" = niemand specifiek). */
export function eventWho(event: { whoList?: string | null; who?: string | null }): string[] {
  const list = parseNames(event.whoList)
  if (list.length) return list
  const single = (event.who ?? '').trim()
  return single && single.toLowerCase() !== 'gezin' ? [single] : []
}

/** Weergavetekst voor een namenlijst: de namen aaneen, of "Gezin" als niemand. */
export function displayNames(list: string[]): string {
  return list.length ? list.join(', ') : 'Gezin'
}

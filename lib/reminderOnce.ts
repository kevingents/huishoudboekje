import { prisma } from './db'

/**
 * Stuur een melding met sleutel `key` voor een huishouden hooguit één keer.
 * We claimen eerst de slot via een unieke insert in ReminderLog; lukt dat niet,
 * dan is 'ie al verstuurd. Zo verliest een gemiste cron-run de melding niet en
 * ontstaat er geen spam — ook als meerdere triggers (dag-cron én de externe
 * reminder-pinger) dezelfde melding willen sturen.
 *
 * Geeft true als er nu daadwerkelijk verstuurd is.
 */
export async function once(householdId: number, key: string, send: () => Promise<void>): Promise<boolean> {
  try {
    await prisma.reminderLog.create({ data: { householdId, key } }) // claim de slot
  } catch {
    return false // al verstuurd (unieke index)
  }
  try {
    await send()
  } catch {
    // Verzenden faalde: claim weer vrijgeven zodat een volgende run het opnieuw
    // probeert (anders zou de melding definitief verloren zijn).
    await prisma.reminderLog.deleteMany({ where: { householdId, key } }).catch(() => {})
    return false
  }
  return true
}

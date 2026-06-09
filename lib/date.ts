const MONTHS_SHORT = ['jan', 'feb', 'mrt', 'apr', 'mei', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec']
const WEEKDAYS = ['Zondag', 'Maandag', 'Dinsdag', 'Woensdag', 'Donderdag', 'Vrijdag', 'Zaterdag']

export interface DateParts {
  dateKey: string
  day: string
  month: string
  weekday: string
}

/**
 * Zet een ISO-datum (yyyy-mm-dd) om naar de losse velden die de agenda gebruikt.
 * Parse handmatig (niet via Date-tijdzone) zodat de dag niet verschuift.
 */
export function describeDate(iso: string): DateParts {
  const [year, month, day] = iso.split('-').map(Number)
  const d = new Date(Date.UTC(year, month - 1, day))
  return {
    dateKey: iso,
    day: String(day),
    month: MONTHS_SHORT[month - 1] ?? '',
    weekday: WEEKDAYS[d.getUTCDay()],
  }
}

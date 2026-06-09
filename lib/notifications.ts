/* Gedeelde definitie van meldingstypen + standaardkanalen.
   Importeerbaar door zowel de client (Instellingen-UI) als de server (notify). */

export interface NotificationPref {
  key: string
  label: string
  description: string
  inApp: boolean
  email: boolean
}

export const NOTIFICATION_TYPES: NotificationPref[] = [
  { key: 'stock', label: 'Voorraadmeldingen', description: 'Krijg een seintje als iets bijna op is.', inApp: true, email: false },
  { key: 'agenda', label: 'Agenda-herinneringen', description: 'Herinnering voor een afspraak.', inApp: true, email: false },
  { key: 'budget', label: 'Budgetwaarschuwingen', description: 'Melding bij 90% van een maandlimiet.', inApp: true, email: true },
  { key: 'menu', label: 'Wekelijks menu', description: 'Overzicht van het menu en de boodschappen.', inApp: false, email: true },
  { key: 'ai', label: 'AI-suggesties', description: 'Tips van je assistent.', inApp: true, email: false },
]

/** Voegt opgeslagen voorkeuren samen met de standaarden (tolerant voor oude vorm). */
export function mergePrefs(stored: unknown): NotificationPref[] {
  const list = Array.isArray(stored) ? (stored as Partial<NotificationPref>[]) : []
  return NOTIFICATION_TYPES.map((def) => {
    const found = list.find((p) => p.key === def.key)
    if (!found) return def
    return {
      ...def,
      inApp: typeof found.inApp === 'boolean' ? found.inApp : (found as { enabled?: boolean }).enabled ?? def.inApp,
      email: typeof found.email === 'boolean' ? found.email : def.email,
    }
  })
}

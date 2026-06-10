import type { PrismaClient } from '@prisma/client'

/* Standaard-data voor een nieuw huishouden: budgetcategorieën, instellingen en
   integraties. Gebruikt bij registratie (en als basis in de seed). */

export const DEFAULT_BUDGET_CATEGORIES = [
  { name: 'Boodschappen', icon: 'ShoppingCart', limit: 500, color: 'emerald' },
  { name: 'Verzorging', icon: 'Sparkles', limit: 100, color: 'violet' },
  { name: 'Vrije tijd', icon: 'Calendar', limit: 150, color: 'amber' },
  { name: 'Vervoer', icon: 'Car', limit: 200, color: 'sky' },
  // Vangnet-categorie: import en het verwijderen/ontkoppelen van categorieën
  // verplaatsen transacties hierheen, dus deze moet altijd bestaan.
  { name: 'Overig', icon: 'ShoppingCart', limit: 0, color: 'slate' },
]

export const DEFAULT_NOTIFICATION_PREFS = [
  { key: 'stock', label: 'Voorraadmeldingen', description: 'Krijg een seintje als iets bijna op is.', inApp: true, email: false },
  { key: 'agenda', label: 'Agenda-herinneringen', description: 'Herinnering voor een afspraak.', inApp: true, email: false },
  { key: 'budget', label: 'Budgetwaarschuwingen', description: 'Melding bij 90% van een maandlimiet.', inApp: true, email: true },
  { key: 'menu', label: 'Wekelijks menu', description: 'Overzicht van het menu en de boodschappen.', inApp: false, email: true },
  { key: 'ai', label: 'AI-suggesties', description: 'Tips van je assistent.', inApp: true, email: false },
]

export const DEFAULT_INTEGRATIONS = [
  { key: 'weather', name: 'Weer (Open-Meteo)', status: 'connected', config: '{}' },
  { key: 'ical', name: 'Agenda & school (Parro, Google, Outlook)', status: 'disconnected', config: JSON.stringify({ urls: [] }) },
  { key: 'ai', name: 'AI Assistent (Claude)', status: 'disconnected', config: '{}' },
  { key: 'mollie', name: 'Abonnementen (Mollie)', status: 'disconnected', config: '{}' },
  { key: 'supermarkt', name: 'Boodschappen (supermarkt)', status: 'coming_soon', config: '{}' },
]

export function defaultSettings(householdId: number) {
  return [
    { householdId, key: 'budgetTarget', value: '500' },
    { householdId, key: 'notifications', value: JSON.stringify(DEFAULT_NOTIFICATION_PREFS) },
    { householdId, key: 'weatherLocation', value: JSON.stringify({ name: 'Amsterdam', lat: 52.37, lon: 4.9 }) },
  ]
}

/** Vult een nieuw huishouden met standaardcategorieën, instellingen en integraties. */
export async function createDefaultsForHousehold(db: PrismaClient, householdId: number) {
  await db.budgetCategory.createMany({
    data: DEFAULT_BUDGET_CATEGORIES.map((c) => ({ ...c, spent: 0, householdId })),
  })
  await db.setting.createMany({ data: defaultSettings(householdId) })
  await db.integration.createMany({
    data: DEFAULT_INTEGRATIONS.map((i) => ({ ...i, householdId })),
  })
}

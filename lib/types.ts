/* Gedeelde types die overeenkomen met de API-/DB-vorm. */

export interface FamilyMember {
  id: number
  name: string
  initials: string
  color: string
  role?: string | null
  birthday?: string | null
}

export interface AgendaEvent {
  id: number
  dateKey: string
  day: string
  month: string
  weekday: string
  title: string
  time: string
  who: string
  accent: string
  source: string
  externalId?: string | null
}

export interface ShoppingItem {
  id: number
  label: string
  checked: boolean
  category: string
  qty?: string | null
}

export interface Recipe {
  id: number
  title: string
  image: string
  time: string
  servings: string
  tags: string[]
  description: string
  favorite: boolean
}

export interface BudgetCategory {
  id: number
  name: string
  /** lucide-iconnaam, via resolveIcon() naar component. */
  icon: string
  spent: number
  limit: number
  color: string
}

export interface Transaction {
  id: number
  label: string
  category: string
  amount: number
  date: string
}

export interface ChatMessage {
  id: number
  role: 'assistant' | 'user'
  text: string
}

export interface NotificationSetting {
  key: string
  label: string
  description: string
  enabled: boolean
}

export interface WeatherLocation {
  name: string
  lat: number
  lon: number
}

export type IntegrationStatus = 'connected' | 'disconnected' | 'coming_soon'

export interface Integration {
  key: string
  name: string
  status: IntegrationStatus
  config: Record<string, unknown>
}

export interface Subscription {
  id: number
  name: string
  amount: number
  interval: string
  status: string
  mollieCustomerId?: string | null
  mollieSubscriptionId?: string | null
}

'use client'

import useSWR from 'swr'
import { fetcher, apiPost, apiPatch, apiPut, apiDelete } from './api'
import { hasModule, normalizeTier, type Tier } from './modules'
import type {
  ShoppingItem,
  AgendaEvent,
  Recipe,
  FamilyMember,
  BudgetCategory,
  Transaction,
  Integration,
  ChatMessage,
  Subscription,
  NotificationItem,
  SavingsGoal,
  FixedCost,
} from './types'

// Negatieve, dalende tijdelijke id's voor optimistische toevoegingen.
let tempCounter = -1
const nextTempId = () => tempCounter--

/**
 * Generieke CRUD-hook over een REST-collectie met optimistische updates.
 * `create` toont meteen een tijdelijk item en haalt daarna de echte lijst op;
 * `update`/`remove` passen de cache direct aan.
 */
function useCollection<T extends { id: number }>(endpoint: string) {
  const { data, isLoading, mutate } = useSWR<T[]>(endpoint, fetcher)
  const items = data ?? []

  async function create(payload: Record<string, unknown>, optimistic: Omit<T, 'id'>) {
    await mutate(
      async () => {
        await apiPost(endpoint, payload)
        return fetcher(endpoint) as Promise<T[]>
      },
      {
        optimisticData: [...items, { ...(optimistic as object), id: nextTempId() } as T],
        rollbackOnError: true,
        revalidate: false,
      },
    )
  }

  async function update(id: number, payload: Record<string, unknown>) {
    await mutate(
      async () => {
        const updated = (await apiPatch(`${endpoint}/${id}`, payload)) as T
        return items.map((item) => (item.id === id ? updated : item))
      },
      {
        optimisticData: items.map((item) => (item.id === id ? { ...item, ...payload } : item)),
        rollbackOnError: true,
        revalidate: false,
      },
    )
  }

  async function remove(id: number) {
    await mutate(
      async () => {
        await apiDelete(`${endpoint}/${id}`)
        return items.filter((item) => item.id !== id)
      },
      {
        optimisticData: items.filter((item) => item.id !== id),
        rollbackOnError: true,
        revalidate: false,
      },
    )
  }

  return { items, isLoading, mutate, create, update, remove }
}

/* -------------------------------------------------------------------------- */
/*  Boodschappen                                                              */
/* -------------------------------------------------------------------------- */

export function useShopping() {
  const c = useCollection<ShoppingItem>('/api/shopping')
  return {
    items: c.items,
    isLoading: c.isLoading,
    addItem: (label: string, category = 'Overig', qty?: string) =>
      c.create({ label, category, qty }, { label, category, qty: qty ?? null, checked: false }),
    toggleItem: (item: ShoppingItem) => c.update(item.id, { checked: !item.checked }),
    removeItem: (id: number) => c.remove(id),
    clearChecked: async () => {
      const checked = c.items.filter((i) => i.checked)
      await Promise.all(checked.map((i) => apiDelete(`/api/shopping/${i.id}`)))
      await c.mutate()
    },
  }
}

/* -------------------------------------------------------------------------- */
/*  Agenda                                                                    */
/* -------------------------------------------------------------------------- */

interface NewEvent {
  date: string
  title: string
  time: string
  who: string
  accent: string
}

export function useAgenda() {
  const c = useCollection<AgendaEvent>('/api/agenda')
  return {
    events: c.items,
    isLoading: c.isLoading,
    addEvent: (e: NewEvent) =>
      c.create(
        { ...e },
        { dateKey: e.date, day: e.date.split('-')[2] ?? '', month: '', weekday: '', title: e.title, time: e.time, who: e.who, accent: e.accent, source: 'manual', externalId: null },
      ),
    updateEvent: (id: number, payload: Partial<NewEvent>) => c.update(id, payload),
    removeEvent: (id: number) => c.remove(id),
  }
}

/* -------------------------------------------------------------------------- */
/*  Recepten                                                                  */
/* -------------------------------------------------------------------------- */

interface NewRecipe {
  title: string
  description?: string
  time?: string
  servings?: string
  tags?: string[]
  image?: string
}

export function useRecipes() {
  const c = useCollection<Recipe>('/api/recipes')
  return {
    recipes: c.items,
    isLoading: c.isLoading,
    addRecipe: (r: NewRecipe) =>
      c.create(
        { ...r },
        { title: r.title, description: r.description ?? '', time: r.time ?? '', servings: r.servings ?? '', tags: r.tags ?? [], image: r.image ?? '', favorite: false, vote: 0 },
      ),
    toggleFavorite: (recipe: Recipe) => c.update(recipe.id, { favorite: !recipe.favorite }),
    // Duim toggelen: nogmaals dezelfde duim zet 'm weer op neutraal.
    setVote: (recipe: Recipe, value: 1 | -1) =>
      c.update(recipe.id, { vote: recipe.vote === value ? 0 : value }),
    removeRecipe: (id: number) => c.remove(id),
    generateRecipe: async (wish?: string, ingredients?: string[]) => {
      const created = await apiPost('/api/recipes/generate', { wish, ingredients })
      await c.mutate()
      return created as Recipe
    },
  }
}

/* -------------------------------------------------------------------------- */
/*  Gezin                                                                     */
/* -------------------------------------------------------------------------- */

interface NewMember {
  name: string
  role?: string
  birthday?: string
}

export function useFamily() {
  const c = useCollection<FamilyMember>('/api/family')
  return {
    members: c.items,
    isLoading: c.isLoading,
    addMember: (m: NewMember) =>
      c.create(
        { ...m },
        { name: m.name, initials: '·', color: 'from-slate-300 to-slate-400', role: m.role ?? null, birthday: m.birthday ?? null },
      ),
    updateMember: (id: number, payload: Partial<NewMember>) => c.update(id, payload),
    removeMember: (id: number) => c.remove(id),
  }
}

/* -------------------------------------------------------------------------- */
/*  Budget                                                                    */
/* -------------------------------------------------------------------------- */

interface NewTransaction {
  label: string
  category: string
  amount: number
  date?: string
}

export function useBudget() {
  const cats = useCollection<BudgetCategory>('/api/budget/categories')
  const tx = useCollection<Transaction>('/api/budget/transactions')

  return {
    categories: cats.items,
    transactions: tx.items,
    isLoading: cats.isLoading || tx.isLoading,
    updateCategory: (id: number, payload: { name?: string; limit?: number; color?: string }) =>
      cats.update(id, payload),
    addTransaction: async (t: NewTransaction) => {
      await tx.create(
        { ...t },
        { label: t.label, category: t.category, amount: t.amount, date: t.date ?? 'Vandaag' },
      )
      await cats.mutate() // categorie-uitgave is op de server bijgewerkt
    },
    removeTransaction: async (id: number) => {
      await tx.remove(id)
      await cats.mutate()
    },
  }
}

/* -------------------------------------------------------------------------- */
/*  Budgetplanner: spaardoelen + vaste lasten                                 */
/* -------------------------------------------------------------------------- */

export function useSavings() {
  const c = useCollection<SavingsGoal>('/api/savings')
  return {
    goals: c.items,
    isLoading: c.isLoading,
    addGoal: (name: string, target: number) =>
      c.create({ name, target }, { name, target, saved: 0 }),
    deposit: (goal: SavingsGoal, amount: number) =>
      c.update(goal.id, { saved: Math.max(0, goal.saved + amount) }),
    updateGoal: (id: number, payload: { name?: string; target?: number }) => c.update(id, payload),
    removeGoal: (id: number) => c.remove(id),
  }
}

export function useFixedCosts() {
  const c = useCollection<FixedCost>('/api/fixed-costs')
  return {
    costs: c.items,
    isLoading: c.isLoading,
    addCost: (name: string, amount: number, dueDay?: number) =>
      c.create({ name, amount, dueDay }, { name, amount, dueDay: dueDay ?? null }),
    removeCost: (id: number) => c.remove(id),
  }
}

/* -------------------------------------------------------------------------- */
/*  Instellingen                                                              */
/* -------------------------------------------------------------------------- */

export function useSettings() {
  const { data, isLoading, mutate } = useSWR<Record<string, unknown>>('/api/settings', fetcher)
  const settings = data ?? {}
  return {
    settings,
    isLoading,
    setSetting: async (key: string, value: unknown) => {
      await mutate(
        async () => {
          await apiPut('/api/settings', { key, value })
          return { ...settings, [key]: value }
        },
        { optimisticData: { ...settings, [key]: value }, rollbackOnError: true, revalidate: false },
      )
    },
  }
}

/* -------------------------------------------------------------------------- */
/*  Authenticatie                                                             */
/* -------------------------------------------------------------------------- */

export interface AuthUser {
  id: number
  name: string
  email: string
  role?: string
  householdId?: number
  isAdmin?: boolean
}

export function useAuth() {
  const { data, isLoading, mutate } = useSWR<{ user: AuthUser | null }>('/api/auth/me', fetcher)
  return {
    user: data?.user ?? null,
    isLoading,
    logout: async () => {
      await apiPost('/api/auth/logout', {})
      await mutate({ user: null }, { revalidate: false })
      window.location.href = '/inloggen'
    },
  }
}

/* -------------------------------------------------------------------------- */
/*  Huishouden + pakket (tier/modules)                                        */
/* -------------------------------------------------------------------------- */

export interface HouseholdInfo {
  id: number
  name: string
  tier: Tier
}

export function useHousehold() {
  const { data, isLoading, mutate } = useSWR<{ id: number; name: string; tier: string }>(
    '/api/household',
    fetcher,
  )
  const tier = normalizeTier(data?.tier)
  return {
    household: data ? { id: data.id, name: data.name, tier } : null,
    tier,
    isLoading,
    /** Heeft het huishouden deze module in zijn pakket? */
    can: (moduleKey: string) => hasModule(tier, moduleKey),
    mutate,
  }
}

/* -------------------------------------------------------------------------- */
/*  Meldingen                                                                 */
/* -------------------------------------------------------------------------- */

export function useNotifications() {
  const { data, isLoading, mutate } = useSWR<{ items: NotificationItem[]; unread: number }>(
    '/api/notifications',
    fetcher,
    { refreshInterval: 60_000 },
  )
  return {
    items: data?.items ?? [],
    unread: data?.unread ?? 0,
    isLoading,
    markRead: async (id: number) => {
      await apiPatch(`/api/notifications/${id}`, { read: true })
      await mutate()
    },
    markAllRead: async () => {
      await apiPost('/api/notifications/read', {})
      await mutate()
    },
    remove: async (id: number) => {
      await apiDelete(`/api/notifications/${id}`)
      await mutate()
    },
  }
}

/* -------------------------------------------------------------------------- */
/*  AI Assistent (Claude)                                                     */
/* -------------------------------------------------------------------------- */

export function useAiChat() {
  const { data, isLoading, mutate } = useSWR<ChatMessage[]>('/api/ai/chat', fetcher)
  const messages = data ?? []
  return {
    messages,
    isLoading,
    send: async (text: string) => {
      await mutate(
        async () => {
          const res = (await apiPost('/api/ai/chat', { text })) as { messages: ChatMessage[] }
          return res.messages
        },
        {
          optimisticData: [...messages, { id: nextTempId(), role: 'user', text }],
          rollbackOnError: true,
          revalidate: false,
        },
      )
    },
  }
}

/* -------------------------------------------------------------------------- */
/*  Weer (Open-Meteo)                                                         */
/* -------------------------------------------------------------------------- */

export interface WeatherData {
  location: string
  day: string
  temp: number
  high: number
  low: number
  code: number
  condition: string
  icon: string
  wet: boolean
}

export function useWeather() {
  const { data, isLoading, error } = useSWR<WeatherData>('/api/weather', fetcher, {
    refreshInterval: 30 * 60 * 1000, // elk half uur verversen
  })
  return { weather: data, isLoading, error }
}

/* -------------------------------------------------------------------------- */
/*  Integraties                                                               */
/* -------------------------------------------------------------------------- */

export function useIntegrations() {
  const { data, isLoading, mutate } = useSWR<Integration[]>('/api/integrations', fetcher)
  return {
    integrations: data ?? [],
    isLoading,
    updateIntegration: async (key: string, payload: { status?: string; config?: unknown }) => {
      await apiPatch(`/api/integrations/${key}`, payload)
      await mutate()
    },
  }
}

/* -------------------------------------------------------------------------- */
/*  Abonnementen (Mollie)                                                     */
/* -------------------------------------------------------------------------- */

interface NewSubscription {
  name: string
  amount: number
  interval: string
}

export function useSubscriptions() {
  const { data, isLoading, mutate } = useSWR<Subscription[]>('/api/subscriptions', fetcher)
  const subscriptions = data ?? []
  return {
    subscriptions,
    isLoading,
    addSubscription: async (payload: NewSubscription) => {
      const res = (await apiPost('/api/subscriptions', payload)) as {
        checkoutUrl?: string
        local?: boolean
      }
      await mutate()
      return res
    },
    removeSubscription: async (id: number) => {
      await mutate(
        async () => {
          await apiDelete(`/api/subscriptions/${id}`)
          return subscriptions.filter((s) => s.id !== id)
        },
        { optimisticData: subscriptions.filter((s) => s.id !== id), rollbackOnError: true, revalidate: false },
      )
    },
  }
}

/* -------------------------------------------------------------------------- */
/*  Beloningen (platform-breed, adverteerder-gesponsord)                      */
/* -------------------------------------------------------------------------- */

export interface Reward {
  id: number
  partner: string
  title: string
  description: string
  imageUrl: string | null
  conditions: string | null
  category: string
  active: boolean
  sortOrder: number
}

/** Beheer (admin): volledige CRUD op de globale beloningen-catalogus. */
export function useAdminRewards() {
  const c = useCollection<Reward>('/api/admin/rewards')
  return {
    rewards: c.items,
    isLoading: c.isLoading,
    addReward: (payload: Partial<Reward>) =>
      c.create(payload as Record<string, unknown>, {
        partner: payload.partner ?? '',
        title: payload.title ?? '',
        description: payload.description ?? '',
        imageUrl: payload.imageUrl ?? null,
        conditions: payload.conditions ?? null,
        category: payload.category ?? 'uitje',
        active: payload.active ?? true,
        sortOrder: payload.sortOrder ?? 0,
      }),
    updateReward: (id: number, payload: Partial<Reward>) => c.update(id, payload),
    removeReward: (id: number) => c.remove(id),
  }
}

/** Gezin: leest de actieve beloningen-catalogus. */
export function useRewards() {
  const { data, isLoading } = useSWR<Reward[]>('/api/rewards', fetcher)
  return { rewards: data ?? [], isLoading }
}

/* -------------------------------------------------------------------------- */
/*  Pasjes (gedeelde klantenkaarten, premium)                                 */
/* -------------------------------------------------------------------------- */

export interface Card {
  id: number
  name: string
  code: string | null
  format: string
  imageUrl: string | null
  color: string
}

export function useCards() {
  const c = useCollection<Card>('/api/cards')
  return {
    cards: c.items,
    isLoading: c.isLoading,
    addCard: (payload: { name: string; code?: string | null; imageUrl?: string | null; color?: string }) =>
      c.create(payload as Record<string, unknown>, {
        name: payload.name,
        code: payload.code ?? null,
        format: 'CODE128',
        imageUrl: payload.imageUrl ?? null,
        color: payload.color ?? 'from-sky-400 to-blue-500',
      }),
    removeCard: (id: number) => c.remove(id),
  }
}

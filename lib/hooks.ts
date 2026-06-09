'use client'

import useSWR from 'swr'
import { fetcher, apiPost, apiPatch, apiPut, apiDelete } from './api'
import type {
  ShoppingItem,
  AgendaEvent,
  Recipe,
  FamilyMember,
  BudgetCategory,
  Transaction,
  Integration,
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
        { title: r.title, description: r.description ?? '', time: r.time ?? '', servings: r.servings ?? '', tags: r.tags ?? [], image: r.image ?? '', favorite: false },
      ),
    toggleFavorite: (recipe: Recipe) => c.update(recipe.id, { favorite: !recipe.favorite }),
    removeRecipe: (id: number) => c.remove(id),
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

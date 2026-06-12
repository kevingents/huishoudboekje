'use client'

import useSWR, { mutate as globalMutate } from 'swr'
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
  FamilyBudget,
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
  coShared?: boolean
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
  ingredients?: { name: string; amount: string }[]
  steps?: string[]
}

export function useRecipes() {
  const c = useCollection<Recipe>('/api/recipes')
  return {
    recipes: c.items,
    isLoading: c.isLoading,
    addRecipe: (r: NewRecipe) =>
      c.create(
        { ...r },
        {
          title: r.title,
          description: r.description ?? '',
          time: r.time ?? '',
          servings: r.servings ?? '',
          tags: r.tags ?? [],
          ingredients: r.ingredients ?? [],
          steps: r.steps ?? [],
          image: r.image ?? '',
          favorite: false,
          vote: 0,
        },
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
  isChild?: boolean
  bloodType?: string
  allergies?: string
  medication?: string
  medicalNotes?: string
}

export function useFamily() {
  const c = useCollection<FamilyMember>('/api/family')
  return {
    members: c.items,
    isLoading: c.isLoading,
    addMember: (m: NewMember) =>
      c.create(
        { ...m },
        {
          name: m.name,
          initials: '·',
          color: 'from-slate-300 to-slate-400',
          role: m.role ?? null,
          birthday: m.birthday ?? null,
          isChild: m.isChild ?? false,
          bloodType: m.bloodType ?? null,
          allergies: m.allergies ?? null,
          medication: m.medication ?? null,
          medicalNotes: m.medicalNotes ?? null,
        },
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
  note?: string | null
  paymentMethod?: string | null
}

export function useBudget() {
  const cats = useCollection<BudgetCategory>('/api/budget/categories')
  const tx = useCollection<Transaction>('/api/budget/transactions')

  return {
    categories: cats.items,
    transactions: tx.items,
    isLoading: cats.isLoading || tx.isLoading,
    updateCategory: (id: number, payload: { name?: string; limit?: number; color?: string; icon?: string }) =>
      cats.update(id, payload),
    addCategory: (payload: { name: string; color?: string; icon?: string; limit?: number }) =>
      cats.create(payload, {
        name: payload.name,
        color: payload.color ?? 'emerald',
        icon: payload.icon ?? 'ShoppingCart',
        limit: payload.limit ?? 0,
        spent: 0,
      }),
    removeCategory: async (id: number) => {
      await cats.remove(id)
      await tx.mutate() // transacties zijn server-side naar 'Overig' verplaatst
    },
    /** Verplaats alle transacties van een winkel (pattern) naar een categorie en
     *  onthoud dat (regel). 'Overig' = ontkoppelen. */
    assignMerchant: async (pattern: string, category: string) => {
      await apiPost('/api/budget/categories/assign', { pattern, category, remember: true })
      await Promise.all([tx.mutate(), cats.mutate()])
    },
    /** Voeg categorie `fromId` samen in `intoId` (transacties + regels mee, bron weg). */
    mergeCategory: async (fromId: number, intoId: number) => {
      await apiPost('/api/budget/categories/merge', { fromId, intoId })
      await Promise.all([tx.mutate(), cats.mutate()])
    },
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

type SavingsInput = { name: string; target: number; targetDate?: string | null; theme?: string | null }

export function useSavings() {
  const c = useCollection<SavingsGoal>('/api/savings')
  return {
    goals: c.items,
    isLoading: c.isLoading,
    addGoal: (payload: SavingsInput) =>
      c.create(payload as Record<string, unknown>, {
        name: payload.name,
        target: payload.target,
        saved: 0,
        targetDate: payload.targetDate ?? null,
        theme: payload.theme ?? null,
      }),
    deposit: (goal: SavingsGoal, amount: number) =>
      c.update(goal.id, { saved: Math.max(0, goal.saved + amount) }),
    updateGoal: (id: number, payload: Partial<SavingsInput>) => c.update(id, payload as Record<string, unknown>),
    removeGoal: (id: number) => c.remove(id),
  }
}

type FamilyBudgetInput = { name: string; limit?: number; member?: string | null; color?: string }

export function useFamilyBudgets() {
  const c = useCollection<FamilyBudget>('/api/family-budgets')
  return {
    budgets: c.items,
    isLoading: c.isLoading,
    addBudget: (payload: FamilyBudgetInput) =>
      c.create(payload as Record<string, unknown>, {
        name: payload.name,
        limit: payload.limit ?? 0,
        spent: 0,
        member: payload.member ?? null,
        color: payload.color ?? 'emerald',
      }),
    updateBudget: (id: number, payload: Partial<FamilyBudgetInput> & { spent?: number }) =>
      c.update(id, payload as Record<string, unknown>),
    logSpend: (budget: FamilyBudget, amount: number) =>
      c.update(budget.id, { spent: Math.max(0, budget.spent + amount) }),
    removeBudget: (id: number) => c.remove(id),
  }
}

type FixedCostInput = {
  name?: string
  amount?: number
  dueDay?: number | null
  category?: string
  isSubscription?: boolean
  subscriptionInterval?: string | null
  subscriptionCancelable?: boolean
  subscriptionEndDate?: string | null
}

export function useFixedCosts() {
  const c = useCollection<FixedCost>('/api/fixed-costs')
  return {
    costs: c.items,
    isLoading: c.isLoading,
    addCost: (payload: FixedCostInput & { name: string; amount: number }) =>
      c.create(payload as Record<string, unknown>, {
        name: payload.name,
        amount: payload.amount,
        dueDay: payload.dueDay ?? null,
        category: payload.category ?? 'Overig',
        isSubscription: payload.isSubscription ?? false,
        subscriptionInterval: payload.subscriptionInterval ?? null,
        subscriptionCancelable: payload.subscriptionCancelable ?? true,
        subscriptionEndDate: payload.subscriptionEndDate ?? null,
      }),
    updateCost: (id: number, payload: FixedCostInput) => c.update(id, payload as Record<string, unknown>),
    removeCost: (id: number) => c.remove(id),
  }
}

export interface Income {
  id: number
  label: string
  amount: number
  category: string
  interval: string
}

export function useIncome() {
  const c = useCollection<Income>('/api/income')
  return {
    incomes: c.items,
    isLoading: c.isLoading,
    addIncome: (payload: { label: string; amount: number; category?: string; interval?: string }) =>
      c.create(payload as Record<string, unknown>, {
        label: payload.label,
        amount: payload.amount,
        category: payload.category ?? 'loon',
        interval: payload.interval ?? '1 month',
      }),
    updateIncome: (id: number, payload: { label?: string; amount?: number; category?: string; interval?: string }) =>
      c.update(id, payload),
    removeIncome: (id: number) => c.remove(id),
  }
}

export interface Loan {
  id: number
  name: string
  lender: string | null
  total: number
  termAmount: number | null
  matchPattern: string | null
  excludePattern: string | null
  manualPaid: number
  startDate: string | null
}

type NewLoan = {
  name: string
  lender?: string | null
  total?: number
  termAmount?: number | null
  matchPattern?: string | null
  excludePattern?: string | null
  manualPaid?: number
  startDate?: string | null
}

export function useLoans() {
  const c = useCollection<Loan>('/api/loans')
  return {
    loans: c.items,
    isLoading: c.isLoading,
    addLoan: (payload: NewLoan) =>
      c.create(payload as Record<string, unknown>, {
        name: payload.name,
        lender: payload.lender ?? null,
        total: payload.total ?? 0,
        termAmount: payload.termAmount ?? null,
        matchPattern: payload.matchPattern ?? null,
        excludePattern: payload.excludePattern ?? null,
        manualPaid: payload.manualPaid ?? 0,
        startDate: payload.startDate ?? null,
      }),
    updateLoan: (id: number, payload: Partial<NewLoan>) => c.update(id, payload as Record<string, unknown>),
    removeLoan: (id: number) => c.remove(id),
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
    mutate,
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
/*  Co-ouderschap (twee huishoudens gekoppeld)                                */
/* -------------------------------------------------------------------------- */

export function useCoParent() {
  const { data, isLoading, mutate } = useSWR<{ linked: boolean; linkedName: string | null; link: string }>(
    '/api/coparent',
    fetcher,
  )
  return {
    linked: data?.linked ?? false,
    linkedName: data?.linkedName ?? null,
    link: data?.link ?? '',
    isLoading,
    refresh: mutate,
    unlink: async () => {
      await apiDelete('/api/coparent')
      await mutate()
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
  memberId?: number | null
  isAdmin?: boolean
  isChild?: boolean
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

export interface Profile {
  id: number
  name: string
  email: string
  avatarUrl: string | null
  nickname: string | null
  phone: string | null
  address: string | null
  birthday: string | null
  emergencyContact: string | null
  role: string
}

export function useProfile() {
  const { data, isLoading, mutate } = useSWR<Profile>('/api/account/profile', fetcher)
  return {
    profile: data ?? null,
    isLoading,
    updateProfile: async (
      payload: Partial<
        Pick<
          Profile,
          'name' | 'email' | 'avatarUrl' | 'nickname' | 'phone' | 'address' | 'birthday' | 'emergencyContact'
        >
      >,
    ) => {
      const updated = (await apiPatch('/api/account/profile', payload as Record<string, unknown>)) as Profile
      await mutate(updated, { revalidate: false })
      await globalMutate('/api/auth/me') // naam/e-mail/avatar in de rest van de app verversen
      return updated
    },
    changePassword: (currentPassword: string, newPassword: string) =>
      apiPost('/api/account/password', { currentPassword, newPassword }),
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
/*  Advertenties / aanbiedingen (platform-breed)                              */
/* -------------------------------------------------------------------------- */

export interface Ad {
  id: number
  sponsor: string
  title: string
  body: string | null
  imageUrl: string | null
  linkUrl: string | null
  active: boolean
  sortOrder: number
}

export function useAdminAds() {
  const c = useCollection<Ad>('/api/admin/ads')
  return {
    ads: c.items,
    isLoading: c.isLoading,
    addAd: (payload: Partial<Ad>) =>
      c.create(payload as Record<string, unknown>, {
        sponsor: payload.sponsor ?? '',
        title: payload.title ?? '',
        body: payload.body ?? null,
        imageUrl: payload.imageUrl ?? null,
        linkUrl: payload.linkUrl ?? null,
        active: payload.active ?? true,
        sortOrder: payload.sortOrder ?? 0,
      }),
    updateAd: (id: number, payload: Partial<Ad>) => c.update(id, payload),
    removeAd: (id: number) => c.remove(id),
  }
}

export function useAds() {
  const { data, isLoading } = useSWR<Ad[]>('/api/ads', fetcher)
  return { ads: data ?? [], isLoading }
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

/* -------------------------------------------------------------------------- */
/*  Eigen gezins-beloningen                                                   */
/* -------------------------------------------------------------------------- */

export interface FamilyReward {
  id: number
  title: string
  description: string | null
  cost: number
}

export function useFamilyRewards() {
  const c = useCollection<FamilyReward>('/api/family-rewards')
  return {
    rewards: c.items,
    isLoading: c.isLoading,
    addReward: (payload: { title: string; description?: string | null; cost?: number }) =>
      c.create(payload as Record<string, unknown>, {
        title: payload.title,
        description: payload.description ?? null,
        cost: payload.cost ?? 0,
      }),
    removeReward: (id: number) => c.remove(id),
  }
}

/* -------------------------------------------------------------------------- */
/*  Documenten (garantie / legitimatie, met verloopdatum)                     */
/* -------------------------------------------------------------------------- */

export interface FamilyDocument {
  id: number
  title: string
  type: string
  owner: string | null
  imageUrl: string | null
  expiresAt: string | null
  notes: string | null
}

export function useDocuments() {
  const c = useCollection<FamilyDocument>('/api/documents')
  return {
    documents: c.items,
    isLoading: c.isLoading,
    addDocument: (payload: {
      title: string
      type: string
      owner?: string | null
      imageUrl?: string | null
      expiresAt?: string | null
      notes?: string | null
    }) =>
      c.create(payload as Record<string, unknown>, {
        title: payload.title,
        type: payload.type,
        owner: payload.owner ?? null,
        imageUrl: payload.imageUrl ?? null,
        expiresAt: payload.expiresAt ?? null,
        notes: payload.notes ?? null,
      }),
    removeDocument: (id: number) => c.remove(id),
  }
}

/* -------------------------------------------------------------------------- */
/*  Belangrijke contacten                                                     */
/* -------------------------------------------------------------------------- */

export interface Contact {
  id: number
  name: string
  category: string
  phone: string | null
  address: string | null
  notes: string | null
}

export function useContacts() {
  const c = useCollection<Contact>('/api/contacts')
  return {
    contacts: c.items,
    isLoading: c.isLoading,
    addContact: (payload: {
      name: string
      category: string
      phone?: string | null
      address?: string | null
      notes?: string | null
    }) =>
      c.create(payload as Record<string, unknown>, {
        name: payload.name,
        category: payload.category,
        phone: payload.phone ?? null,
        address: payload.address ?? null,
        notes: payload.notes ?? null,
      }),
    removeContact: (id: number) => c.remove(id),
  }
}

/* -------------------------------------------------------------------------- */
/*  Gezinsspel: taken + ingewisselde beloningen                               */
/* -------------------------------------------------------------------------- */

export interface Task {
  id: number
  title: string
  description: string | null
  assignedTo: string | null
  points: number
  status: string
  dueDate: string | null
  recurrence?: string
}

export function useTasks() {
  const c = useCollection<Task>('/api/tasks')
  return {
    tasks: c.items,
    isLoading: c.isLoading,
    addTask: (payload: {
      title: string
      description?: string | null
      assignedTo?: string | null
      points?: number
      dueDate?: string | null
      recurrence?: string
    }) =>
      c.create(payload as Record<string, unknown>, {
        title: payload.title,
        description: payload.description ?? null,
        assignedTo: payload.assignedTo ?? null,
        points: payload.points ?? 0,
        status: payload.assignedTo ? 'open' : 'todo',
        dueDate: payload.dueDate ?? null,
        recurrence: payload.recurrence ?? 'geen',
      }),
    setStatus: (id: number, status: string) => c.update(id, { status }),
    removeTask: (id: number) => c.remove(id),
  }
}

export interface Redemption {
  id: number
  member: string
  title: string
  cost: number
}

export function useRedemptions() {
  const c = useCollection<Redemption>('/api/redemptions')
  return {
    redemptions: c.items,
    isLoading: c.isLoading,
    addRedemption: (payload: { member: string; title: string; cost: number }) =>
      c.create(payload as Record<string, unknown>, {
        member: payload.member,
        title: payload.title,
        cost: payload.cost,
      }),
  }
}

/* -------------------------------------------------------------------------- */
/*  Gezinsmail (premium)                                                      */
/* -------------------------------------------------------------------------- */

export interface MailItem {
  id: number
  emailId: string | null
  fromAddr: string
  fromName: string | null
  subject: string
  snippet: string | null
  status: string // nieuw | verwerkt | genegeerd
  category: string | null
  summary: string | null
  filedType: string | null // document | agenda | shopping
  filedId: number | null
  attachmentUrl: string | null
  attachmentName: string | null
  createdAt: string
}

export function useMail() {
  const { data, isLoading, mutate } = useSWR<{ address: string; items: MailItem[] }>(
    '/api/mail',
    fetcher,
    { refreshInterval: 60_000 },
  )
  return {
    address: data?.address ?? '',
    items: data?.items ?? [],
    isLoading,
    setStatus: async (id: number, status: string) => {
      await apiPatch(`/api/mail/${id}`, { status })
      await mutate()
    },
    remove: async (id: number) => {
      await apiDelete(`/api/mail/${id}`)
      await mutate()
    },
    reprocess: async (id: number) => {
      const res = (await apiPost(`/api/mail/${id}/reprocess`, {})) as { bodyFetched?: boolean }
      await mutate()
      return res
    },
    refresh: () => mutate(),
  }
}

/** Puntensaldo per gezinslid: verdiend (afgeronde taken) − ingewisseld. */
export function pointsByMember(tasks: Task[], redemptions: Redemption[]): Record<string, number> {
  const bal: Record<string, number> = {}
  for (const t of tasks) {
    if (t.status === 'klaar' && t.assignedTo) bal[t.assignedTo] = (bal[t.assignedTo] ?? 0) + t.points
  }
  for (const r of redemptions) bal[r.member] = (bal[r.member] ?? 0) - r.cost
  return bal
}

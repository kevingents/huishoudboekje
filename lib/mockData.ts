import {
  Home,
  Calendar,
  ShoppingCart,
  ChefHat,
  BarChart3,
  Users,
  Sparkles,
  Settings,
  LayoutGrid,
  Wallet,
  type LucideIcon,
} from 'lucide-react'

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */

export interface NavItem {
  label: string
  icon: LucideIcon
  /** Route this item links to. */
  href: string
}

export interface FamilyMember {
  name: string
  initials: string
  /** Tailwind gradient classes used for the avatar background. */
  color: string
  /** Role within the family (shown on the Gezin page). */
  role?: string
  /** Birthday, free-form. */
  birthday?: string
}

export interface Appointment {
  day: string
  month: string
  title: string
  date: string
  time: string
}

export interface ShoppingItem {
  id: number
  label: string
  checked: boolean
  /** Aisle / category used to group the list. */
  category: string
  /** Quantity label, e.g. "2 pak". */
  qty?: string
}

export interface AgendaEvent {
  id: number
  /** ISO-ish date key used to group events, e.g. "2026-05-23". */
  dateKey: string
  day: string
  month: string
  weekday: string
  title: string
  time: string
  /** Which family member it belongs to. */
  who: string
  /** Tailwind colour token used for the accent dot/badge. */
  accent: string
}

export interface Recipe {
  id: number
  title: string
  image: string
  time: string
  servings: string
  tags: string[]
  description: string
  favorite?: boolean
}

export interface BudgetCategory {
  name: string
  icon: LucideIcon
  spent: number
  limit: number
  /** Tailwind text/bg colour family, e.g. "emerald". */
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

export interface SettingItem {
  key: string
  label: string
  description: string
  enabled: boolean
}

/* -------------------------------------------------------------------------- */
/*  Navigation                                                                */
/* -------------------------------------------------------------------------- */

export const sidebarNav: NavItem[] = [
  { label: 'Vandaag', icon: Home, href: '/' },
  { label: 'Agenda', icon: Calendar, href: '/agenda' },
  { label: 'Boodschappen', icon: ShoppingCart, href: '/boodschappen' },
  { label: 'Recepten', icon: ChefHat, href: '/recepten' },
  { label: 'Budget', icon: BarChart3, href: '/budget' },
  { label: 'Gezin', icon: Users, href: '/gezin' },
  { label: 'AI Assistent', icon: Sparkles, href: '/ai-assistent' },
  { label: 'Instellingen', icon: Settings, href: '/instellingen' },
]

/** Bottom navigation items shown on mobile (the central "+" is rendered apart). */
export const mobileNav: NavItem[] = [
  { label: 'Vandaag', icon: LayoutGrid, href: '/' },
  { label: 'Agenda', icon: Calendar, href: '/agenda' },
  { label: 'Boodschappen', icon: ShoppingCart, href: '/boodschappen' },
  { label: 'Budget', icon: Wallet, href: '/budget' },
]

/* -------------------------------------------------------------------------- */
/*  Header / family                                                           */
/* -------------------------------------------------------------------------- */

export const family = {
  greetingName: 'Sanne',
  familyName: 'Het Jansen Gezin',
  photo:
    'https://images.unsplash.com/photo-1511895426328-dc8714191300?auto=format&fit=crop&w=240&q=80',
  members: [
    { name: 'Mark', initials: 'M', color: 'from-sky-400 to-blue-500', role: 'Vader', birthday: '14 maart' },
    { name: 'Tom', initials: 'T', color: 'from-amber-400 to-orange-500', role: 'Zoon (8)', birthday: '2 september' },
    { name: 'Opa Jan', initials: 'OJ', color: 'from-emerald-400 to-green-500', role: 'Opa', birthday: '30 november' },
    { name: 'Sanne', initials: 'S', color: 'from-violet-400 to-purple-500', role: 'Moeder', birthday: '21 mei' },
  ] satisfies FamilyMember[],
}

export const today = {
  weekday: 'Woensdag',
  date: '21 mei',
}

export const notificationCount = 3

/* -------------------------------------------------------------------------- */
/*  Dashboard card data                                                       */
/* -------------------------------------------------------------------------- */

export const recipe = {
  title: 'Romige kip-pasta met broccoli',
  image:
    'https://images.unsplash.com/photo-1473093295043-cdd812d0e601?auto=format&fit=crop&w=900&q=80',
  time: '30 min',
  servings: '4 personen',
}

export const stockAlert = {
  title: 'Melk is bijna op',
  subtitle: 'Zet op je boodschappenlijstje',
}

export const budget = {
  spent: 387,
  total: 500,
  remaining: 113,
}

export const weather = {
  day: 'Donderdag',
  condition: 'Regen',
  low: 12,
  high: 17,
  question: 'Voetbaltraining afgelast?',
}

export const appointments: Appointment[] = [
  {
    day: '23',
    month: 'mei',
    title: 'Pleindienst',
    date: 'Vrijdag 23 mei',
    time: '18:00 – 20:00',
  },
  {
    day: '23',
    month: 'mei',
    title: 'Herinnering: afspraak consultatiebureau',
    date: 'Vrijdag 23 mei',
    time: '10:30',
  },
]

export const diaperStock = {
  title: 'Luiervoorraad',
  daysLeft: 5,
  /** Percentage of the progress bar that is still filled. */
  percent: 35,
}

export const aiSuggestion = {
  text: 'Maak zondag een dubbele portie lasagne, ingrediënten zijn in de aanbieding.',
  image:
    'https://images.unsplash.com/photo-1574894709920-11b28e7367e3?auto=format&fit=crop&w=600&q=80',
}

/* -------------------------------------------------------------------------- */
/*  Boodschappen                                                              */
/* -------------------------------------------------------------------------- */

export const shoppingList: ShoppingItem[] = [
  { id: 1, label: 'Melk', checked: true, category: 'Zuivel', qty: '2 pak' },
  { id: 2, label: 'Bananen', checked: false, category: 'Groente & fruit', qty: '1 tros' },
  { id: 3, label: 'Broccoli', checked: false, category: 'Groente & fruit' },
  { id: 4, label: 'Luiers maat 5', checked: false, category: 'Verzorging', qty: '1 pak' },
  { id: 5, label: 'Raspkaas', checked: false, category: 'Zuivel' },
  { id: 6, label: 'Volkoren pasta', checked: false, category: 'Voorraadkast' },
  { id: 7, label: 'Kipfilet', checked: false, category: 'Vlees & vis', qty: '500 g' },
  { id: 8, label: 'Appels', checked: true, category: 'Groente & fruit', qty: '6 st' },
  { id: 9, label: 'Tandpasta', checked: false, category: 'Verzorging' },
  { id: 10, label: 'Eieren', checked: false, category: 'Zuivel', qty: '10 st' },
]

/* -------------------------------------------------------------------------- */
/*  Agenda                                                                    */
/* -------------------------------------------------------------------------- */

export const agendaEvents: AgendaEvent[] = [
  { id: 1, dateKey: '2026-05-21', day: '21', month: 'mei', weekday: 'Woensdag', title: 'Zwemles Tom', time: '16:00 – 16:45', who: 'Tom', accent: 'sky' },
  { id: 2, dateKey: '2026-05-21', day: '21', month: 'mei', weekday: 'Woensdag', title: 'Avondeten met Opa Jan', time: '18:30', who: 'Gezin', accent: 'emerald' },
  { id: 3, dateKey: '2026-05-23', day: '23', month: 'mei', weekday: 'Vrijdag', title: 'Pleindienst', time: '18:00 – 20:00', who: 'Sanne', accent: 'violet' },
  { id: 4, dateKey: '2026-05-23', day: '23', month: 'mei', weekday: 'Vrijdag', title: 'Afspraak consultatiebureau', time: '10:30', who: 'Sanne', accent: 'violet' },
  { id: 5, dateKey: '2026-05-24', day: '24', month: 'mei', weekday: 'Zaterdag', title: 'Voetbaltraining', time: '09:30 – 11:00', who: 'Tom', accent: 'amber' },
  { id: 6, dateKey: '2026-05-24', day: '24', month: 'mei', weekday: 'Zaterdag', title: 'Boodschappen doen', time: '14:00', who: 'Mark', accent: 'sky' },
  { id: 7, dateKey: '2026-05-26', day: '26', month: 'mei', weekday: 'Maandag', title: 'Tandarts Mark', time: '11:15', who: 'Mark', accent: 'sky' },
  { id: 8, dateKey: '2026-05-28', day: '28', month: 'mei', weekday: 'Woensdag', title: 'Verjaardag buurvrouw', time: 'Hele dag', who: 'Gezin', accent: 'rose' },
]

/* -------------------------------------------------------------------------- */
/*  Recepten                                                                  */
/* -------------------------------------------------------------------------- */

export const recipes: Recipe[] = [
  {
    id: 1,
    title: 'Romige kip-pasta met broccoli',
    image: 'https://images.unsplash.com/photo-1473093295043-cdd812d0e601?auto=format&fit=crop&w=900&q=80',
    time: '30 min',
    servings: '4 personen',
    tags: ['Snel', 'Kindvriendelijk'],
    description: 'Romige pasta met malse kip en verse broccoli. Klaar in een half uur.',
    favorite: true,
  },
  {
    id: 2,
    title: 'Verse lasagne uit de oven',
    image: 'https://images.unsplash.com/photo-1574894709920-11b28e7367e3?auto=format&fit=crop&w=900&q=80',
    time: '55 min',
    servings: '6 personen',
    tags: ['Oven', 'Meal prep'],
    description: 'Klassieke lasagne met rijke tomaten-gehaktsaus en romige bechamel.',
    favorite: true,
  },
  {
    id: 3,
    title: 'Buddha bowl met kikkererwten',
    image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=900&q=80',
    time: '25 min',
    servings: '2 personen',
    tags: ['Vegetarisch', 'Gezond'],
    description: 'Kleurrijke bowl met geroosterde groenten, kikkererwten en tahindressing.',
  },
  {
    id: 4,
    title: 'Pannenkoeken voor het hele gezin',
    image: 'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?auto=format&fit=crop&w=900&q=80',
    time: '20 min',
    servings: '4 personen',
    tags: ['Kindvriendelijk', 'Budget'],
    description: 'Luchtige pannenkoeken met appel en kaneel — altijd een succes.',
  },
  {
    id: 5,
    title: 'Thaise groene curry',
    image: 'https://images.unsplash.com/photo-1455619452474-d2be8b1e70cd?auto=format&fit=crop&w=900&q=80',
    time: '35 min',
    servings: '4 personen',
    tags: ['Pittig', 'Oosters'],
    description: 'Aromatische curry met kokosmelk, kip en seizoensgroenten.',
  },
  {
    id: 6,
    title: 'Geroosterde tomatensoep',
    image: 'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=900&q=80',
    time: '40 min',
    servings: '4 personen',
    tags: ['Vegetarisch', 'Comfort food'],
    description: 'Romige soep van langzaam geroosterde tomaten met verse basilicum.',
  },
]

/* -------------------------------------------------------------------------- */
/*  Budget                                                                    */
/* -------------------------------------------------------------------------- */

export const budgetCategories: BudgetCategory[] = [
  { name: 'Boodschappen', icon: ShoppingCart, spent: 387, limit: 500, color: 'emerald' },
  { name: 'Verzorging', icon: Sparkles, spent: 64, limit: 100, color: 'violet' },
  { name: 'Vrije tijd', icon: Calendar, spent: 142, limit: 150, color: 'amber' },
  { name: 'Vervoer', icon: Home, spent: 78, limit: 200, color: 'sky' },
]

export const transactions: Transaction[] = [
  { id: 1, label: 'Albert Heijn', category: 'Boodschappen', amount: 42.18, date: 'Vandaag' },
  { id: 2, label: 'Kruidvat', category: 'Verzorging', amount: 18.95, date: 'Gisteren' },
  { id: 3, label: 'Bioscoop', category: 'Vrije tijd', amount: 31.0, date: '19 mei' },
  { id: 4, label: 'NS dagkaart', category: 'Vervoer', amount: 16.4, date: '18 mei' },
  { id: 5, label: 'Bakkerij', category: 'Boodschappen', amount: 7.85, date: '18 mei' },
  { id: 6, label: 'Speelgoedwinkel', category: 'Vrije tijd', amount: 24.99, date: '17 mei' },
]

/* -------------------------------------------------------------------------- */
/*  AI Assistent                                                              */
/* -------------------------------------------------------------------------- */

export const aiMessages: ChatMessage[] = [
  { id: 1, role: 'assistant', text: 'Goedemorgen Sanne! Ik heb je week alvast bekeken. Waar kan ik mee helpen?' },
  { id: 2, role: 'user', text: 'Wat eten we vanavond? Het moet snel kunnen.' },
  { id: 3, role: 'assistant', text: 'Je hebt nog kip en broccoli in voorraad. Wat dacht je van de romige kip-pasta? Klaar in 30 minuten en Tom is er dol op.' },
]

export const aiPrompts: string[] = [
  'Plan de avondmaaltijden voor deze week',
  'Maak een boodschappenlijst voor de lasagne',
  'Wat staat er morgen in de agenda?',
  'Bespaartips voor de boodschappen',
]

/* -------------------------------------------------------------------------- */
/*  Instellingen                                                              */
/* -------------------------------------------------------------------------- */

export const notificationSettings: SettingItem[] = [
  { key: 'stock', label: 'Voorraadmeldingen', description: 'Krijg een seintje als iets bijna op is.', enabled: true },
  { key: 'agenda', label: 'Agenda-herinneringen', description: 'Herinnering 30 minuten voor een afspraak.', enabled: true },
  { key: 'budget', label: 'Budgetwaarschuwingen', description: 'Melding bij 90% van een maandlimiet.', enabled: false },
  { key: 'ai', label: 'AI-suggesties', description: 'Dagelijkse tips van je assistent.', enabled: true },
]

export const monthlyBudgetTarget = 500

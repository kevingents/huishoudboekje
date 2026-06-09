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
  Package,
  Camera,
  Gift,
  CreditCard,
  FileText,
  Phone,
  ListTodo,
  Mail,
  type LucideIcon,
} from 'lucide-react'
import type { ChatMessage } from './types'

/* -------------------------------------------------------------------------- */
/*  Navigatie                                                                 */
/* -------------------------------------------------------------------------- */

export interface NavItem {
  label: string
  icon: LucideIcon
  href: string
}

export const sidebarNav: NavItem[] = [
  { label: 'Vandaag', icon: Home, href: '/vandaag' },
  { label: 'Agenda', icon: Calendar, href: '/agenda' },
  { label: 'Boodschappen', icon: ShoppingCart, href: '/boodschappen' },
  { label: 'Recepten', icon: ChefHat, href: '/recepten' },
  { label: 'Koelkast', icon: Camera, href: '/koelkast' },
  { label: 'Budget', icon: BarChart3, href: '/budget' },
  { label: 'Modules', icon: Package, href: '/modules' },
  { label: 'Gezin', icon: Users, href: '/gezin' },
  { label: 'Taken', icon: ListTodo, href: '/taken' },
  { label: 'Pasjes', icon: CreditCard, href: '/pasjes' },
  { label: 'Documenten', icon: FileText, href: '/documenten' },
  { label: 'Contacten', icon: Phone, href: '/contacten' },
  { label: 'Gezinsmail', icon: Mail, href: '/gezinsmail' },
  { label: 'Beloningen', icon: Gift, href: '/beloningen' },
  { label: 'AI Assistent', icon: Sparkles, href: '/ai-assistent' },
  { label: 'Instellingen', icon: Settings, href: '/instellingen' },
]

/** Gegroepeerd menu (het "Meer"-overzicht op mobiel) zodat het overzichtelijk
   blijft. Verwijst naar hrefs uit sidebarNav. */
export const mobileMenuGroups: { title: string; hrefs: string[] }[] = [
  { title: 'Vandaag', hrefs: ['/vandaag'] },
  { title: 'Dagelijks', hrefs: ['/agenda', '/boodschappen', '/gezin'] },
  { title: 'Koken', hrefs: ['/recepten', '/koelkast'] },
  { title: 'Geldzaken', hrefs: ['/budget', '/modules'] },
  { title: 'Bewaren', hrefs: ['/pasjes', '/documenten', '/contacten', '/gezinsmail'] },
  { title: 'Gezinsspel', hrefs: ['/taken', '/beloningen'] },
  { title: 'Extra', hrefs: ['/ai-assistent'] },
  { title: 'Account', hrefs: ['/instellingen'] },
]

/** Bottom navigation items shown on mobile (de centrale "+" staat apart). */
export const mobileNav: NavItem[] = [
  { label: 'Vandaag', icon: LayoutGrid, href: '/vandaag' },
  { label: 'Agenda', icon: Calendar, href: '/agenda' },
  { label: 'Boodschappen', icon: ShoppingCart, href: '/boodschappen' },
  { label: 'Budget', icon: Wallet, href: '/budget' },
]

/* -------------------------------------------------------------------------- */
/*  Statische dashboard-flavor (nog niet DB-backed)                           */
/* -------------------------------------------------------------------------- */

export const family = {
  greetingName: 'Sanne',
  familyName: 'Het Jansen Gezin',
  photo:
    'https://images.unsplash.com/photo-1511895426328-dc8714191300?auto=format&fit=crop&w=240&q=80',
}

export const today = {
  weekday: 'Woensdag',
  date: '21 mei',
}

export const notificationCount = 3

export const stockAlert = {
  title: 'Melk is bijna op',
  subtitle: 'Zet op je boodschappenlijstje',
}

export const weather = {
  day: 'Donderdag',
  condition: 'Regen',
  low: 12,
  high: 17,
  question: 'Voetbaltraining afgelast?',
}

export const diaperStock = {
  title: 'Luiervoorraad',
  daysLeft: 5,
  percent: 35,
}

export const aiSuggestion = {
  text: 'Maak zondag een dubbele portie lasagne, ingrediënten zijn in de aanbieding.',
  image:
    'https://images.unsplash.com/photo-1574894709920-11b28e7367e3?auto=format&fit=crop&w=600&q=80',
}

/* -------------------------------------------------------------------------- */
/*  AI Assistent — seed (wordt in fase B vervangen door echte Claude-chat)    */
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

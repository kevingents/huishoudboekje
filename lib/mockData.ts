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
  MessageCircle,
  ListChecks,
  StickyNote,
  type LucideIcon,
} from 'lucide-react'

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */

export interface NavItem {
  label: string
  icon: LucideIcon
  active?: boolean
}

export interface FamilyMember {
  name: string
  initials: string
  /** Tailwind gradient classes used for the avatar background. */
  color: string
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
}

/* -------------------------------------------------------------------------- */
/*  Navigation                                                                */
/* -------------------------------------------------------------------------- */

export const sidebarNav: NavItem[] = [
  { label: 'Vandaag', icon: Home, active: true },
  { label: 'Agenda', icon: Calendar },
  { label: 'Boodschappen', icon: ShoppingCart },
  { label: 'Recepten', icon: ChefHat },
  { label: 'Budget', icon: BarChart3 },
  { label: 'Gezin', icon: Users },
  { label: 'AI Assistent', icon: Sparkles },
  { label: 'Instellingen', icon: Settings },
]

/** Bottom navigation items shown on mobile (the central "+" is rendered apart). */
export const mobileNav: NavItem[] = [
  { label: 'Overzicht', icon: LayoutGrid, active: true },
  { label: 'Berichten', icon: MessageCircle },
  { label: 'Taken', icon: ListChecks },
  { label: 'Notities', icon: StickyNote },
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
    { name: 'Mark', initials: 'M', color: 'from-sky-400 to-blue-500' },
    { name: 'Tom', initials: 'T', color: 'from-amber-400 to-orange-500' },
    { name: 'Opa Jan', initials: 'OJ', color: 'from-emerald-400 to-green-500' },
    { name: 'Sanne', initials: 'S', color: 'from-violet-400 to-purple-500' },
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

export const shoppingList: ShoppingItem[] = [
  { id: 1, label: 'Melk', checked: true },
  { id: 2, label: 'Bananen', checked: false },
  { id: 3, label: 'Broccoli', checked: false },
  { id: 4, label: 'Luiers maat 5', checked: false },
  { id: 5, label: 'Raspkaas', checked: false },
]

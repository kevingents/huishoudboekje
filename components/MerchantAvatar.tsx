'use client'

import { ShoppingCart, Fuel, TrainFront, UtensilsCrossed, HeartPulse, Home, Repeat, ShoppingBag } from 'lucide-react'
import { merchantIcon, merchantInitials, merchantColorIndex, type MerchantIcon } from '@/lib/merchantLogo'

const ICONS: Record<Exclude<MerchantIcon, null>, typeof ShoppingCart> = {
  cart: ShoppingCart,
  fuel: Fuel,
  transit: TrainFront,
  food: UtensilsCrossed,
  health: HeartPulse,
  home: Home,
  subscription: Repeat,
  shopping: ShoppingBag,
}

// Zachte merk-achtige kleur per soort winkel (lichte tint + sterke tekst/icoon).
const ICON_COLOR: Record<Exclude<MerchantIcon, null>, string> = {
  cart: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300',
  fuel: 'bg-amber-100 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300',
  transit: 'bg-sky-100 text-sky-600 dark:bg-sky-500/15 dark:text-sky-300',
  food: 'bg-rose-100 text-rose-600 dark:bg-rose-500/15 dark:text-rose-300',
  health: 'bg-teal-100 text-teal-600 dark:bg-teal-500/15 dark:text-teal-300',
  home: 'bg-violet-100 text-violet-600 dark:bg-violet-500/15 dark:text-violet-300',
  subscription: 'bg-indigo-100 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-300',
  shopping: 'bg-orange-100 text-orange-600 dark:bg-orange-500/15 dark:text-orange-300',
}

// Kleurenpalet voor de initialen-badge van onbekende winkels (stabiel per winkel).
const HASH_COLORS = [
  'bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-200',
  'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300',
  'bg-sky-100 text-sky-600 dark:bg-sky-500/15 dark:text-sky-300',
  'bg-violet-100 text-violet-600 dark:bg-violet-500/15 dark:text-violet-300',
  'bg-amber-100 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300',
  'bg-rose-100 text-rose-600 dark:bg-rose-500/15 dark:text-rose-300',
  'bg-teal-100 text-teal-600 dark:bg-teal-500/15 dark:text-teal-300',
  'bg-indigo-100 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-300',
]

/** "Logo" van een uitgave: herkend winkel-icoon of een gekleurde initialen-badge.
 *  Volledig lokaal afgeleid uit de omschrijving — geen externe logo-dienst. */
export default function MerchantAvatar({ label, size = 'md' }: { label: string; size?: 'sm' | 'md' }) {
  const box = size === 'sm' ? 'h-7 w-7 text-[10px]' : 'h-10 w-10 text-sm'
  const icon = merchantIcon(label)
  if (icon) {
    const Ico = ICONS[icon]
    return (
      <span className={`grid shrink-0 place-items-center rounded-xl ${ICON_COLOR[icon]} ${box}`}>
        <Ico className={size === 'sm' ? 'h-3.5 w-3.5' : 'h-5 w-5'} strokeWidth={2.2} />
      </span>
    )
  }
  const color = HASH_COLORS[merchantColorIndex(label, HASH_COLORS.length)]
  return (
    <span className={`grid shrink-0 place-items-center rounded-xl font-bold ${color} ${box}`}>
      {merchantInitials(label)}
    </span>
  )
}

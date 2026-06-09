import {
  ShoppingCart,
  Sparkles,
  Calendar,
  Car,
  Home,
  Utensils,
  Wallet,
  Gift,
  HeartPulse,
  GraduationCap,
  type LucideIcon,
} from 'lucide-react'

/**
 * Iconen worden als naam (string) in de database bewaard en hier teruggemapt
 * naar het lucide-component. Voeg nieuwe iconen toe wanneer een categorie ze
 * nodig heeft. `ShoppingCart` is de fallback.
 */
export const iconByName: Record<string, LucideIcon> = {
  ShoppingCart,
  Sparkles,
  Calendar,
  Car,
  Home,
  Utensils,
  Wallet,
  Gift,
  HeartPulse,
  GraduationCap,
}

export function resolveIcon(name: string): LucideIcon {
  return iconByName[name] ?? ShoppingCart
}

/** Iconen die als keuze worden aangeboden bij het maken van een categorie. */
export const categoryIconNames = Object.keys(iconByName)

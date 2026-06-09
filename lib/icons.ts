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
  Sun,
  CloudSun,
  Cloud,
  Cloudy,
  CloudFog,
  CloudDrizzle,
  CloudRain,
  CloudSnow,
  CloudLightning,
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

/** Weericonen (los gehouden zodat de fallback een wolk is i.p.v. een kar). */
export const weatherIconByName: Record<string, LucideIcon> = {
  Sun,
  CloudSun,
  Cloud,
  Cloudy,
  CloudFog,
  CloudDrizzle,
  CloudRain,
  CloudSnow,
  CloudLightning,
}

export function resolveWeatherIcon(name: string): LucideIcon {
  return weatherIconByName[name] ?? Cloud
}

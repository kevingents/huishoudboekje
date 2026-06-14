/**
 * "Logo" voor een uitgave — privacyvriendelijk en zónder externe call.
 * We sturen winkelnamen NIET naar een logo-dienst (dat zou je uitgaven lekken),
 * maar leiden lokaal een herkenbaar icoon + kleur af uit de omschrijving. Bekende
 * soorten winkels krijgen een passend lucide-icoon (supermarkt → winkelwagen,
 * tankstation → brandstof, …); de rest een gekleurde initialen-badge.
 */
import { cleanLabel, merchantKey } from './budget'

export type MerchantIcon =
  | 'cart'
  | 'fuel'
  | 'transit'
  | 'food'
  | 'health'
  | 'home'
  | 'subscription'
  | 'shopping'
  | null

// Trefwoorden → icoonsoort. Eerste match wint, dus zet specifiekere regels eerst.
const ICON_RULES: [RegExp, Exclude<MerchantIcon, null>][] = [
  [/albert heijn|\bah\b|jumbo|lidl|aldi|\bplus\b|dirk|coop|spar|picnic|vomar|hoogvliet|deen|nettorama|boni|poiesz|supermarkt|boodschap/i, 'cart'],
  [/shell|\bbp\b|esso|tango|tinq|tamoil|texaco|gulf|\bq8\b|firezone|benzine|diesel|tankstation|tankstop|fastned|allego|laadpaal/i, 'fuel'],
  [/\bns\b|ns-?groep|ov-?chip|ovpay|\bgvb\b|\bret\b|\bhtm\b|connexxion|arriva|qbuzz|9292|\bns\b|parkeer|q-?park|greenwheels|\bovpay\b/i, 'transit'],
  [/mcdonald|burger king|\bkfc\b|domino|new york pizza|thuisbezorg|deliveroo|uber eats|febo|kebab|sushi|restaurant|cafe|bakker|snackbar|eetcaf/i, 'food'],
  [/apotheek|tandarts|huisarts|fysio|drogist|kruidvat|\betos\b|\bda\b drogist|optiek|hans anders|specsavers|zorg/i, 'health'],
  [/ikea|gamma|praxis|karwei|hornbach|\baction\b|blokker|\bhema\b|xenos|leen bakker|kwantum|woon|interieur|bouwmarkt/i, 'home'],
  [/netflix|spotify|disney|videoland|\bhbo\b|prime video|youtube premium|icloud|google one|patreon|audible|abonnement/i, 'subscription'],
  [/bol\.?com|coolblue|amazon|zalando|wehkamp|mediamarkt|aliexpress|\bh&m\b|\bzara\b|primark|decathlon|webshop|\.com\b/i, 'shopping'],
]

/** Soort icoon voor een omschrijving, of null als we niets herkennen. */
export function merchantIcon(label: string): MerchantIcon {
  const key = merchantKey(label)
  const raw = (label || '').toLowerCase()
  for (const [re, icon] of ICON_RULES) {
    if (re.test(key) || re.test(raw)) return icon
  }
  return null
}

/** 1–2 letters voor de initialen-badge, uit het schone merk-/winkellabel. */
export function merchantInitials(label: string): string {
  const name = cleanLabel(label)
  const parts = name.split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[1][0]).toUpperCase()
}

/** Stabiele kleur-index (zelfde winkel → altijd dezelfde kleur), 0..n-1. */
export function merchantColorIndex(label: string, n: number): number {
  const key = merchantKey(label) || (label || '').toLowerCase()
  let h = 0
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0
  return n > 0 ? h % n : 0
}

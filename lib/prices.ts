/* Ruwe gemiddelde prijzen (NL, euro's) per veelvoorkomend product, op trefwoord.
   Een indicatie — geen exacte data. Genoeg om te laten zien wat je ~kwijt bent. */

const PRICES: { match: RegExp; price: number }[] = [
  { match: /melk/i, price: 1.2 },
  { match: /brood|bolletjes|stok/i, price: 1.6 },
  { match: /ei(eren)?/i, price: 2.2 },
  { match: /kaas/i, price: 3.5 },
  { match: /boter|margarine|halvarine/i, price: 2.0 },
  { match: /yoghurt|kwark|vla|toetje/i, price: 1.6 },
  { match: /koffie/i, price: 4.5 },
  { match: /thee/i, price: 2.5 },
  { match: /appel|peer|banaan|sinaasappel|druif|fruit/i, price: 2.0 },
  { match: /sla|tomaat|komkommer|wortel|\bui\b|paprika|courgette|broccoli|spinazie|groente/i, price: 1.5 },
  { match: /aardappel|patat|friet/i, price: 2.0 },
  { match: /pasta|spaghetti|macaroni|penne/i, price: 1.2 },
  { match: /rijst|noedels|mie/i, price: 1.8 },
  { match: /kip|gehakt|vlees|biefstuk|worst|spek|ham/i, price: 4.5 },
  { match: /vis|zalm|tonijn|garnaal/i, price: 5.0 },
  { match: /chips|snack|koek|chocola|snoep/i, price: 2.0 },
  { match: /frisdrank|cola|\bsap\b|limonade|ice tea/i, price: 1.8 },
  { match: /bier/i, price: 6.0 },
  { match: /wijn/i, price: 6.0 },
  { match: /water/i, price: 0.8 },
  { match: /wc.?papier|toiletpapier/i, price: 4.0 },
  { match: /shampoo|zeep|tandpasta|deodorant|douchegel/i, price: 2.5 },
  { match: /luier/i, price: 8.0 },
  { match: /wasmiddel|afwas|schoonmaak|allesreiniger/i, price: 4.0 },
  { match: /pizza|maaltijd|diepvries/i, price: 3.0 },
  { match: /saus|ketchup|mayo|pesto/i, price: 1.8 },
  { match: /suiker|bloem|meel|zout/i, price: 1.2 },
  { match: /boon|linze|kikkererwt|blik/i, price: 1.2 },
]

const DEFAULT_PRICE = 2.0

export function estimatePrice(label: string): number {
  const found = PRICES.find((p) => p.match.test(label))
  return found ? found.price : DEFAULT_PRICE
}

export function euro(value: number): string {
  return value.toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

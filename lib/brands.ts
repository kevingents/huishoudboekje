/* Herkent bekende winkels in een pas-naam en geeft een logo-URL (het favicon
   van het merk-domein via Google's favicon-service — gratis en betrouwbaar). */

const BRANDS: { match: RegExp; domain: string }[] = [
  { match: /kruidvat/i, domain: 'kruidvat.nl' },
  { match: /albert\s*heijn|\bah\b|bonuskaart|bonus/i, domain: 'ah.nl' },
  { match: /jumbo/i, domain: 'jumbo.com' },
  { match: /lidl/i, domain: 'lidl.nl' },
  { match: /aldi/i, domain: 'aldi.nl' },
  { match: /plus\s*supermarkt|\bplus\b/i, domain: 'plus.nl' },
  { match: /etos/i, domain: 'etos.nl' },
  { match: /hema/i, domain: 'hema.nl' },
  { match: /ikea/i, domain: 'ikea.com' },
  { match: /praxis/i, domain: 'praxis.nl' },
  { match: /gamma/i, domain: 'gamma.nl' },
  { match: /karwei/i, domain: 'karwei.nl' },
  { match: /action/i, domain: 'action.com' },
  { match: /biblio(t)?h?eek|obib/i, domain: 'bibliotheek.nl' },
  { match: /decathlon/i, domain: 'decathlon.nl' },
  { match: /mediamarkt/i, domain: 'mediamarkt.nl' },
  { match: /bol\.?\s*com/i, domain: 'bol.com' },
  { match: /douglas/i, domain: 'douglas.nl' },
  { match: /intratuin/i, domain: 'intratuin.nl' },
  { match: /blokker/i, domain: 'blokker.nl' },
  { match: /xenos/i, domain: 'xenos.nl' },
  { match: /kwantum/i, domain: 'kwantum.nl' },
  { match: /sportcity|basic\s*fit|fitness/i, domain: 'basic-fit.com' },
]

export function brandLogo(name: string): string | null {
  const b = BRANDS.find((x) => x.match.test(name))
  if (!b) return null
  return `https://www.google.com/s2/favicons?sz=128&domain=${b.domain}`
}

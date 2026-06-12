'use client'

import { useEffect, useMemo, useState } from 'react'
import useSWR, { mutate as globalMutate } from 'swr'
import { Radar, Repeat, X, Check } from 'lucide-react'
import DashboardCard from '../DashboardCard'
import { fetcher, apiPost } from '@/lib/api'
import { useBudget } from '@/lib/hooks'
import { isSpendingCategory, merchantKey, matchRule, periodKeyOf, type MerchantRuleLike } from '@/lib/budget'

function euro(v: number) {
  return v.toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
function titleCase(s: string) {
  return s.split(' ').filter(Boolean).map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
}

const DISMISS_KEY = 'fam-recurring-dismissed'

type Candidate = {
  key: string
  example: string
  avg: number
  months: number
  count: number
}

/** Detecteert terugkerende afschrijvingen (zelfde winkel, stabiel bedrag, in
 *  meerdere maanden) die nog geen vaste last/abonnement zijn, en laat ze met één
 *  klik markeren — de regel wordt onthouden en alles wordt opnieuw ingedeeld. */
export default function RecurringSuggestions() {
  const { transactions } = useBudget()
  const { data: rules } = useSWR<MerchantRuleLike[]>('/api/budget/rules', fetcher)
  const [dismissed, setDismissed] = useState<string[]>([])
  const [busy, setBusy] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)

  useEffect(() => {
    try {
      setDismissed(JSON.parse(localStorage.getItem(DISMISS_KEY) || '[]'))
    } catch {
      setDismissed([])
    }
  }, [])

  const candidates = useMemo<Candidate[]>(() => {
    if (!rules) return []
    // Categorieën die per definitie variabel zijn — daar zit vrijwel nooit een incasso.
    const VARIABLE_CATS = new Set(['Boodschappen', 'Horeca', 'Contant geld', 'Onderling'])
    const groups = new Map<string, { example: string; amounts: number[]; months: Set<string> }>()
    for (const t of transactions) {
      const amount = Number(t.amount) || 0
      if (amount <= 0 || !isSpendingCategory(t.category) || t.category === 'Vaste lasten') continue
      if (VARIABLE_CATS.has(t.category)) continue
      const key = merchantKey(t.label)
      if (!key || key.length < 4) continue // te korte sleutels geven te brede regels
      const g = groups.get(key) ?? { example: t.label, amounts: [], months: new Set<string>() }
      g.amounts.push(amount)
      const pk = periodKeyOf(t.date)
      if (pk) g.months.add(pk)
      groups.set(key, g)
    }
    const out: Candidate[] = []
    for (const [key, g] of groups) {
      if (g.months.size < 2) continue
      const min = Math.min(...g.amounts)
      const max = Math.max(...g.amounts)
      const avg = g.amounts.reduce((s, v) => s + v, 0) / g.amounts.length
      // Gestaffelde stabiliteit: bij maar 2 maanden moet het bedrag vrijwel exact
      // gelijk zijn (echte incasso's zijn dat); vanaf 3 maanden mag ~8% variatie
      // (termijnbedrag-wijzigingen). Voorkomt valse hits op variabele uitgaven.
      const tolerance = g.months.size >= 3 ? Math.max(2, avg * 0.08) : Math.max(0.5, avg * 0.01)
      if (max - min > tolerance) continue
      if (matchRule(g.example, rules)) continue // al ingedeeld via een geleerde regel
      if (dismissed.includes(key)) continue
      out.push({ key, example: g.example, avg, months: g.months.size, count: g.amounts.length })
    }
    return out.sort((a, b) => b.avg - a.avg).slice(0, 8)
  }, [transactions, rules, dismissed])

  const dismiss = (key: string) => {
    const next = [...dismissed, key]
    setDismissed(next)
    try {
      localStorage.setItem(DISMISS_KEY, JSON.stringify(next))
    } catch {
      // localStorage niet beschikbaar — suggestie komt dan later terug, geen ramp
    }
  }

  const mark = async (c: Candidate, kind: 'fixed' | 'subscription') => {
    setBusy(c.key)
    setMsg(null)
    try {
      await apiPost('/api/budget/rules', { rules: [{ pattern: c.key, kind, category: '' }] })
      await apiPost('/api/budget/recategorize', {})
      await Promise.all([
        globalMutate('/api/budget/transactions'),
        globalMutate('/api/budget/categories'),
        globalMutate('/api/budget/rules'),
        globalMutate('/api/budget/uncategorized'),
        globalMutate('/api/fixed-costs'),
      ])
      dismiss(c.key) // defensief: suggestie meteen weg, ook als de regel-match nog ververst
      setMsg(`${titleCase(c.key)} staat nu bij je vaste lasten${kind === 'subscription' ? ' als abonnement' : ''}.`)
    } catch {
      setMsg('Markeren mislukt — probeer het opnieuw.')
    } finally {
      setBusy(null)
    }
  }

  if (candidates.length === 0 && !msg) return null

  return (
    <DashboardCard title="Terugkerende afschrijvingen gevonden" icon={Radar} iconClassName="text-amber-500" className="lg:col-span-2">
      <p className="text-sm text-slate-500">
        Deze posten komen elke maand met (vrijwel) hetzelfde bedrag terug — waarschijnlijk een vaste last of
        abonnement. Markeer ze met één klik; Fam onthoudt het ook voor volgende imports.
      </p>
      {msg && (
        <p className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-emerald-600 dark:text-emerald-400">
          <Check className="h-4 w-4" />
          {msg}
        </p>
      )}
      {candidates.length > 0 && (
        <ul className="mt-3 flex flex-col divide-y divide-cardborder">
          {candidates.map((c) => (
            <li key={c.key} className="flex flex-wrap items-center gap-2 py-2.5 sm:flex-nowrap">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100" title={c.example}>
                  {titleCase(c.key)}
                </p>
                <p className="text-[11px] text-slate-400">
                  ±€{euro(c.avg)} · {c.count}× in {c.months} maanden
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                <button
                  type="button"
                  disabled={busy === c.key}
                  onClick={() => mark(c, 'fixed')}
                  className="pill bg-sky-50 px-3 py-1.5 text-xs font-semibold text-sky-600 hover:bg-sky-100 disabled:opacity-50 dark:text-sky-300"
                >
                  Vaste last
                </button>
                <button
                  type="button"
                  disabled={busy === c.key}
                  onClick={() => mark(c, 'subscription')}
                  className="pill bg-violet-50 px-3 py-1.5 text-xs font-semibold text-violet-700 hover:bg-violet-100 disabled:opacity-50 dark:text-violet-300"
                >
                  <Repeat className="h-3 w-3" />
                  Abonnement
                </button>
                <button
                  type="button"
                  onClick={() => dismiss(c.key)}
                  aria-label={`Suggestie ${titleCase(c.key)} verbergen`}
                  className="grid h-7 w-7 place-items-center rounded-full text-slate-300 hover:bg-slate-100 hover:text-slate-500"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </DashboardCard>
  )
}

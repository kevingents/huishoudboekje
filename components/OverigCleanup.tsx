'use client'

import { useMemo, useState } from 'react'
import useSWR, { mutate as globalMutate } from 'swr'
import { Wand2, Sparkles, Check } from 'lucide-react'
import DashboardCard from './DashboardCard'
import Modal from './Modal'
import { fetcher, apiPost } from '@/lib/api'
import { useBudget } from '@/lib/hooks'
import { isSpendingCategory, INCOME_TYPES } from '@/lib/budget'

interface Group {
  key: string
  example: string
  total: number
  count: number
  currentCategory?: string
  hasRule?: boolean
}
interface Bucket {
  total: number
  count: number
  groups: Group[]
}
interface UncatResp {
  expenses: Bucket
  income: Bucket
}

const COMMON_CATS = [
  'Boodschappen', 'Horeca', 'Vervoer', 'Gas/Elektra/Water', 'Verzekeringen', 'Internet/TV/Telefoon',
  'Winkels', 'Apotheek/Medisch', 'Aflossingen', 'Belastingen', 'Sport', 'Kinderen', 'Reizen/Vakantie',
  'Leuke dingen/Uitjes', 'Persoonlijke verzorging', 'Goede doelen', 'Contant geld', 'Overig',
]
const INCOME_LABELS: Record<string, string> = {
  loon: 'Loon / salaris',
  kinderbijslag: 'Kinderbijslag',
  toeslag: 'Toeslag',
  uitkering: 'Uitkering',
  alimentatie: 'Alimentatie',
  overig: 'Overige inkomst',
}

function titleCase(s: string) {
  return s.split(' ').filter(Boolean).map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
}
function euro(v: number) {
  return v.toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

/** Vertaalt een keuze-waarde naar een regel (kind + category). */
function decode(value: string): { kind: string; category: string } | null {
  if (!value) return null
  const i = value.indexOf(':')
  const tag = value.slice(0, i)
  const rest = value.slice(i + 1)
  if (tag === 'cat') return { kind: 'expense', category: rest }
  if (tag === 'fixed') return { kind: 'fixed', category: rest }
  if (tag === 'income') return { kind: 'income', category: rest || 'overig' }
  if (tag === 'once') return { kind: 'income_once', category: '' }
  if (tag === 'ignore') return { kind: 'ignore', category: '' }
  return null
}

export default function OverigCleanup() {
  const { categories } = useBudget()
  const { data, isLoading, mutate } = useSWR<UncatResp>('/api/budget/uncategorized', fetcher)

  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState<'expenses' | 'income'>('expenses')
  const [choices, setChoices] = useState<Record<string, string>>({})
  const [showAll, setShowAll] = useState(false)
  const [search, setSearch] = useState('')
  const [aiBusy, setAiBusy] = useState(false)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  const catNames = useMemo(() => {
    const set = new Set<string>(COMMON_CATS)
    for (const c of categories) if (isSpendingCategory(c.name)) set.add(c.name)
    return [...set]
  }, [categories])

  const bucket = data?.[tab]
  const groups = bucket?.groups ?? []
  const q = search.trim().toLowerCase()
  const filtered = q
    ? groups.filter((g) => g.key.toLowerCase().includes(q) || g.example.toLowerCase().includes(q))
    : groups
  const shown = showAll ? filtered : filtered.slice(0, 20)

  const expCount = data?.expenses.count ?? 0
  const incCount = data?.income.count ?? 0
  const expTotal = data?.expenses.total ?? 0

  const setChoice = (key: string, value: string) => setChoices((c) => ({ ...c, [`${tab}|${key}`]: value }))
  const choiceOf = (key: string) => choices[`${tab}|${key}`] ?? ''

  const runAi = async () => {
    if (!groups.length) return
    setAiBusy(true)
    setMsg(null)
    try {
      const res = (await apiPost('/api/budget/categorize-ai', {
        groups: groups.map((g) => ({ key: g.key, example: g.example })),
      })) as { items?: { key: string; category: string; kind: string }[]; error?: string }
      if (res.error) {
        setMsg(res.error)
        return
      }
      const next: Record<string, string> = {}
      for (const it of res.items ?? []) {
        let value = ''
        if (it.kind === 'fixed') value = 'fixed:'
        else if (it.kind === 'ignore') value = 'ignore:'
        else if (it.kind === 'income') value = `income:${tab === 'income' ? 'overig' : 'overig'}`
        else {
          const match = catNames.find((c) => c.toLowerCase() === (it.category || '').toLowerCase())
          value = `cat:${match ?? 'Overig'}`
        }
        next[`${tab}|${it.key}`] = value
      }
      setChoices((c) => ({ ...c, ...next }))
      setMsg('AI heeft een voorstel ingevuld — controleer en pas aan waar nodig.')
    } catch {
      setMsg('AI-indeling mislukt. Probeer het later opnieuw.')
    } finally {
      setAiBusy(false)
    }
  }

  const apply = async () => {
    const rules: { pattern: string; kind: string; category: string }[] = []
    for (const [k, value] of Object.entries(choices)) {
      const dec = decode(value)
      if (!dec) continue
      const pattern = k.slice(k.indexOf('|') + 1)
      rules.push({ pattern, kind: dec.kind, category: dec.category })
    }
    if (!rules.length) {
      setMsg('Kies eerst bij een paar posten wat het is.')
      return
    }
    setSaving(true)
    setMsg(null)
    try {
      await apiPost('/api/budget/rules', { rules })
      const res = (await apiPost('/api/budget/recategorize', {})) as {
        updated: number
        overigAfter: number
        incomeCreated?: number
        fixedCreated?: number
      }
      await Promise.all([
        globalMutate('/api/budget/transactions'),
        globalMutate('/api/budget/categories'),
        globalMutate('/api/income'),
        globalMutate('/api/fixed-costs'),
        globalMutate('/api/loans'),
        mutate(),
      ])
      setChoices({})
      const parts = [`${rules.length} onthouden`]
      if (res.updated) parts.push(`${res.updated} uitgaven ingedeeld`)
      if (res.incomeCreated) parts.push(`${res.incomeCreated} inkomsten bijgewerkt`)
      if (res.fixedCreated) parts.push(`${res.fixedCreated} vaste lasten`)
      setMsg(`Klaar — ${parts.join(', ')}. Nog ${res.overigAfter} in Overig.`)
    } catch {
      setMsg('Toepassen mislukt. Probeer het opnieuw.')
    } finally {
      setSaving(false)
    }
  }

  const nothingToDo = !isLoading && expCount === 0 && incCount === 0

  return (
    <DashboardCard title="Budget opschonen" icon={Wand2} iconClassName="text-violet-500" className="lg:col-span-2">
      {nothingToDo ? (
        <p className="text-sm text-slate-500">
          Niets meer op te schonen — al je transacties zijn ingedeeld. Nieuwe imports worden automatisch
          herkend dankzij wat je eerder hebt onthouden.
        </p>
      ) : (
        <>
          <p className="text-sm text-slate-500">
            Loop al je uitgaven per winkel langs (ook hypotheek, vaste lasten en wat in Overig staat),
            vertel één keer wat het is, en Fam <span className="font-semibold">onthoudt</span> het — ook voor
            volgende imports. Of laat de <span className="font-semibold">AI</span> een voorstel doen.
          </p>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="pill mt-3 bg-brand px-4 py-2.5 text-white shadow-sm shadow-brand/20 hover:bg-brand-dark"
          >
            <Wand2 className="h-4 w-4" />
            Opschonen — {expCount} posten
          </button>
        </>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="Budget opschonen">
        <div className="flex flex-col gap-3">
          {/* Tabs (bijschrijvingen alleen als die er zijn) */}
          {incCount > 0 && (
            <div className="flex gap-1 rounded-xl bg-slate-100 p-1">
              <button
                type="button"
                onClick={() => setTab('expenses')}
                className={`flex-1 rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors ${
                  tab === 'expenses' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'
                }`}
              >
                Uitgaven ({expCount})
              </button>
              <button
                type="button"
                onClick={() => setTab('income')}
                className={`flex-1 rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors ${
                  tab === 'income' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'
                }`}
              >
                Bijschrijvingen ({incCount})
              </button>
            </div>
          )}

          {/* Zoeken */}
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Zoek een winkel…"
            className="w-full rounded-lg border border-cardborder bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-brand/40 focus:ring-2 focus:ring-brand/20"
          />

          <button
            type="button"
            onClick={runAi}
            disabled={aiBusy || !groups.length}
            className="pill justify-center bg-violet-50 px-3 py-2 text-sm font-semibold text-violet-700 ring-1 ring-violet-200 hover:bg-violet-100 disabled:opacity-50"
          >
            <Sparkles className={`h-4 w-4 ${aiBusy ? 'animate-pulse' : ''}`} />
            {aiBusy ? 'AI denkt na…' : 'Laat AI een voorstel doen'}
          </button>

          {isLoading ? (
            <p className="text-sm text-slate-400">Laden…</p>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-slate-500">{q ? 'Geen winkel gevonden.' : 'Niets in te delen hier.'}</p>
          ) : (
            <ul className="flex flex-col divide-y divide-cardborder">
              {shown.map((g) => (
                <li key={g.key} className="py-2.5">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-800">
                      {titleCase(g.key)}
                    </span>
                    <span className="shrink-0 text-sm font-bold text-slate-800">€{euro(g.total)}</span>
                    <span className="shrink-0 text-xs text-slate-400">{g.count}×</span>
                  </div>
                  <p className="truncate text-[11px] text-slate-400" title={g.example}>{g.example}</p>
                  {g.currentCategory && (
                    <p className="mb-1.5 text-[11px] text-slate-400">
                      Nu in: <span className="font-semibold text-slate-500">{g.currentCategory}</span>
                    </p>
                  )}
                  <select
                    value={choiceOf(g.key)}
                    onChange={(e) => setChoice(g.key, e.target.value)}
                    className="w-full rounded-lg border border-cardborder bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-brand/40 focus:ring-2 focus:ring-brand/20"
                  >
                    <option value="">— kies wat dit is —</option>
                    {tab === 'expenses' ? (
                      <>
                        <optgroup label="Uitgave-categorie">
                          {catNames.map((c) => (
                            <option key={c} value={`cat:${c}`}>{c}</option>
                          ))}
                        </optgroup>
                        <optgroup label="Vaste lasten">
                          <option value="fixed:">Vaste last (huur, energie…)</option>
                          <option value="fixed:Abonnement">Abonnement (Netflix, krant…)</option>
                          <option value="fixed:Aflossingen">Aflossing / schuld (hypotheek, lening…)</option>
                        </optgroup>
                        <optgroup label="Anders">
                          <option value="once:">Eenmalige inkomst / teruggave</option>
                          <option value="ignore:">Negeren (sparen / eigen overboeking)</option>
                        </optgroup>
                      </>
                    ) : (
                      <>
                        <optgroup label="Vaste inkomst">
                          {INCOME_TYPES.map((t) => (
                            <option key={t} value={`income:${t}`}>{INCOME_LABELS[t]}</option>
                          ))}
                        </optgroup>
                        <optgroup label="Anders">
                          <option value="once:">Eenmalig / teruggave</option>
                          <option value="ignore:">Negeren (eigen overboeking / sparen)</option>
                          <option value="cat:Overig">Toch een uitgave</option>
                        </optgroup>
                      </>
                    )}
                  </select>
                </li>
              ))}
            </ul>
          )}

          {filtered.length > 20 && (
            <button
              type="button"
              onClick={() => setShowAll((s) => !s)}
              className="text-sm font-semibold text-brand hover:underline"
            >
              {showAll ? 'Toon minder' : `Toon alle ${filtered.length}`}
            </button>
          )}

          {msg && <p className="text-sm font-medium text-slate-600">{msg}</p>}

          <button
            type="button"
            onClick={apply}
            disabled={saving}
            className="pill justify-center bg-brand px-4 py-2.5 text-white shadow-sm shadow-brand/20 hover:bg-brand-dark disabled:opacity-50"
          >
            <Check className="h-4 w-4" />
            {saving ? 'Toepassen…' : 'Onthoud & pas toe'}
          </button>
        </div>
      </Modal>
    </DashboardCard>
  )
}

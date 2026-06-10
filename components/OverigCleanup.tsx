'use client'

import { useEffect, useMemo, useState } from 'react'
import useSWR, { mutate as globalMutate } from 'swr'
import { Wand2, Sparkles, Check, Plus } from 'lucide-react'
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
  'Leuke dingen/Uitjes', 'Persoonlijke verzorging', 'Goede doelen', 'Contant geld', 'Onderling', 'Overig',
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
  const { categories, addCategory } = useBudget()
  const { data, isLoading, mutate } = useSWR<UncatResp>('/api/budget/uncategorized', fetcher)

  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState<'expenses' | 'income'>('expenses')
  const [choices, setChoices] = useState<Record<string, string>>({})
  const [flags, setFlags] = useState<Record<string, { vast: boolean; abo: boolean }>>({})
  const [showAll, setShowAll] = useState(false)
  const [showAssigned, setShowAssigned] = useState(false)
  const [search, setSearch] = useState('')
  const [aiBusy, setAiBusy] = useState(false)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [newCatFor, setNewCatFor] = useState<string | null>(null)
  const [newCatName, setNewCatName] = useState('')

  const flagsOf = (key: string) => flags[`${tab}|${key}`] ?? { vast: false, abo: false }
  const setFlag = (key: string, patch: Partial<{ vast: boolean; abo: boolean }>) =>
    setFlags((f) => ({ ...f, [`${tab}|${key}`]: { ...flagsOf(key), ...patch } }))

  // Inline een nieuwe uitgave-categorie ("post") aanmaken en meteen kiezen.
  // Bestaat de naam al (case-insensitief)? Dan die kiezen i.p.v. een duplicaat maken.
  const createCategory = async (key: string) => {
    const name = newCatName.trim()
    if (!name) return
    const existing = catNames.find((c) => c.toLowerCase() === name.toLowerCase())
    if (!existing) await addCategory({ name })
    setChoices((c) => ({ ...c, [`${tab}|${key}`]: `cat:${existing ?? name}` }))
    setNewCatFor(null)
    setNewCatName('')
  }

  // Inline-formulier resetten bij tabwissel (state is niet tab-gescoped).
  useEffect(() => {
    setNewCatFor(null)
    setNewCatName('')
  }, [tab])

  const catNames = useMemo(() => {
    const set = new Set<string>(COMMON_CATS)
    for (const c of categories) if (isSpendingCategory(c.name)) set.add(c.name)
    return [...set]
  }, [categories])

  const bucket = data?.[tab]
  const groups = bucket?.groups ?? []
  const q = search.trim().toLowerCase()
  const filtered = groups
    .filter((g) => showAssigned || !g.hasRule) // standaard alleen niet-ingedeelde
    .filter((g) => !q || g.key.toLowerCase().includes(q) || g.example.toLowerCase().includes(q))
  const shown = showAll ? filtered : filtered.slice(0, 20)

  // Tellingen op de nog niet-ingedeelde posten (dat is wat er "op te schonen" is).
  const expGroups = data?.expenses.groups ?? []
  const incGroups = data?.income.groups ?? []
  const expCount = expGroups.filter((g) => !g.hasRule).length
  const incCount = incGroups.filter((g) => !g.hasRule).length
  const assignedCount = [...expGroups, ...incGroups].filter((g) => g.hasRule).length
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
      const nextFlags: Record<string, { vast: boolean; abo: boolean }> = {}
      for (const it of res.items ?? []) {
        const fkey = `${tab}|${it.key}`
        if (choices[fkey]) continue // bestaande handmatige keuze niet overschrijven
        let value = ''
        if (it.kind === 'ignore') value = 'ignore:'
        else if (it.kind === 'income') value = 'income:overig'
        else {
          // expense/fixed/subscription → een categorie kiezen; vaste last/abonnement
          // worden vinkjes.
          const match = catNames.find((c) => c.toLowerCase() === (it.category || '').toLowerCase())
          value = `cat:${match ?? 'Overig'}`
          if (it.kind === 'fixed' || it.kind === 'subscription') {
            nextFlags[fkey] = { vast: true, abo: it.kind === 'subscription' }
          }
        }
        next[fkey] = value
      }
      setChoices((c) => ({ ...c, ...next }))
      setFlags((f) => ({ ...f, ...nextFlags }))
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
      let kind = dec.kind
      // Vinkjes "vaste last"/"abonnement" gelden alleen bovenop een echte categorie:
      // abonnement => subscription (vaste last die ook abonnement is), anders fixed.
      if (dec.kind === 'expense') {
        const fl = flags[k]
        if (fl?.abo) kind = 'subscription'
        else if (fl?.vast) kind = 'fixed'
      }
      rules.push({ pattern, kind, category: dec.category })
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
      setFlags({})
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
        <>
          <p className="text-sm text-slate-500">
            Niets meer op te schonen — al je transacties zijn ingedeeld. Nieuwe imports worden automatisch
            herkend dankzij wat je eerder hebt onthouden.
          </p>
          {assignedCount > 0 && (
            <button
              type="button"
              onClick={() => {
                setShowAssigned(true)
                setOpen(true)
              }}
              className="pill mt-3 bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-200"
            >
              <Wand2 className="h-4 w-4" />
              Ingedeelde posten wijzigen ({assignedCount})
            </button>
          )}
        </>
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
                Uitgaven ({showAssigned ? expGroups.length : expCount})
              </button>
              <button
                type="button"
                onClick={() => setTab('income')}
                className={`flex-1 rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors ${
                  tab === 'income' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'
                }`}
              >
                Bijschrijvingen ({showAssigned ? incGroups.length : incCount})
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
            className="pill justify-center bg-violet-50 px-3 py-2 text-sm font-semibold text-violet-700 ring-1 ring-violet-200 hover:bg-violet-100 disabled:opacity-50 dark:text-violet-300 dark:ring-violet-800/50"
          >
            <Sparkles className={`h-4 w-4 ${aiBusy ? 'animate-pulse' : ''}`} />
            {aiBusy ? 'AI denkt na…' : 'Laat AI een voorstel doen'}
          </button>

          {assignedCount > 0 && (
            <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-600">
              <input
                type="checkbox"
                checked={showAssigned}
                onChange={(e) => setShowAssigned(e.target.checked)}
                className="h-3.5 w-3.5 rounded accent-brand"
              />
              Toon ook al ingedeelde posten ({assignedCount})
            </label>
          )}

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
                    {g.hasRule && (
                      <span className="shrink-0 rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-300">
                        ingedeeld
                      </span>
                    )}
                    <span className="shrink-0 text-sm font-bold text-slate-800">€{euro(g.total)}</span>
                    <span className="shrink-0 text-xs text-slate-400">{g.count}×</span>
                  </div>
                  <p className="truncate text-[11px] text-slate-400" title={g.example}>{g.example}</p>
                  {g.currentCategory && (
                    <p className="mb-1.5 text-[11px] text-slate-400">
                      Nu in: <span className="font-semibold text-slate-500">{g.currentCategory}</span>
                    </p>
                  )}

                  {newCatFor === g.key ? (
                    <div className="flex gap-2">
                      <input
                        autoFocus
                        value={newCatName}
                        onChange={(e) => setNewCatName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault()
                            createCategory(g.key)
                          }
                        }}
                        placeholder="Naam nieuwe categorie"
                        className="min-w-0 flex-1 rounded-lg border border-cardborder bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-brand/40 focus:ring-2 focus:ring-brand/20"
                      />
                      <button
                        type="button"
                        onClick={() => createCategory(g.key)}
                        className="pill shrink-0 bg-brand px-3 py-2 text-xs font-semibold text-white hover:bg-brand-dark"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Maak
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setNewCatFor(null)
                          setNewCatName('')
                        }}
                        className="pill shrink-0 bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200"
                      >
                        Annuleer
                      </button>
                    </div>
                  ) : (
                    <select
                      value={choiceOf(g.key)}
                      onChange={(e) => {
                        if (e.target.value === '__new__') {
                          setNewCatFor(g.key)
                          setNewCatName('')
                        } else {
                          setChoice(g.key, e.target.value)
                          // Vinkjes horen alleen bij een echte categorie; reset ze anders.
                          if (!e.target.value.startsWith('cat:')) setFlag(g.key, { vast: false, abo: false })
                        }
                      }}
                      className="w-full rounded-lg border border-cardborder bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-brand/40 focus:ring-2 focus:ring-brand/20"
                    >
                      <option value="">— kies wat dit is —</option>
                      {tab === 'expenses' ? (
                        <>
                          <optgroup label="Categorie (post)">
                            {catNames.map((c) => (
                              <option key={c} value={`cat:${c}`}>{c}</option>
                            ))}
                            <option value="__new__">+ Nieuwe categorie…</option>
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
                  )}

                  {tab === 'expenses' && choiceOf(g.key).startsWith('cat:') && newCatFor !== g.key && (
                    <div className="mt-1.5 flex flex-wrap gap-4 pl-0.5">
                      <label className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600">
                        <input
                          type="checkbox"
                          checked={flagsOf(g.key).vast}
                          onChange={(e) =>
                            setFlag(g.key, { vast: e.target.checked, abo: e.target.checked ? flagsOf(g.key).abo : false })
                          }
                          className="h-3.5 w-3.5 rounded accent-brand"
                        />
                        Vaste last
                      </label>
                      <label className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600">
                        <input
                          type="checkbox"
                          checked={flagsOf(g.key).abo}
                          onChange={(e) =>
                            setFlag(g.key, { abo: e.target.checked, vast: e.target.checked ? true : flagsOf(g.key).vast })
                          }
                          className="h-3.5 w-3.5 rounded accent-brand"
                        />
                        Abonnement
                      </label>
                    </div>
                  )}
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

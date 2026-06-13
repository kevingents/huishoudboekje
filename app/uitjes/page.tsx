'use client'

import { useState } from 'react'
import {
  Compass,
  Sparkles,
  Plus,
  Calendar,
  Check,
  Trash2,
  Trees,
  Waves,
  Landmark,
  PawPrint,
  Palette,
  UtensilsCrossed,
  Bike,
  Blocks,
  MapPin,
} from 'lucide-react'
import PageHeader from '@/components/PageHeader'
import DashboardCard from '@/components/DashboardCard'
import Modal from '@/components/Modal'
import NearbyExplorer from '@/components/uitjes/NearbyExplorer'
import { useOutings, type Outing } from '@/lib/hooks'

const inputClass =
  'w-full rounded-xl border border-cardborder bg-white px-3.5 py-2.5 text-sm text-slate-700 outline-none transition-colors placeholder:text-slate-400 focus:border-brand/40 focus:ring-2 focus:ring-brand/20'

const CAT: Record<string, { label: string; icon: typeof Compass; cls: string }> = {
  natuur: { label: 'Natuur', icon: Trees, cls: 'bg-emerald-100 text-emerald-600' },
  speeltuin: { label: 'Speeltuin', icon: Blocks, cls: 'bg-amber-100 text-amber-600' },
  water: { label: 'Water', icon: Waves, cls: 'bg-sky-100 text-sky-600' },
  cultuur: { label: 'Cultuur', icon: Landmark, cls: 'bg-violet-100 text-violet-600' },
  dieren: { label: 'Dieren', icon: PawPrint, cls: 'bg-orange-100 text-orange-600' },
  sport: { label: 'Sport', icon: Bike, cls: 'bg-rose-100 text-rose-600' },
  creatief: { label: 'Creatief', icon: Palette, cls: 'bg-pink-100 text-pink-600' },
  eten: { label: 'Eten', icon: UtensilsCrossed, cls: 'bg-teal-100 text-teal-600' },
  uitstapje: { label: 'Uitstapje', icon: Compass, cls: 'bg-slate-100 text-slate-600' },
}
const catMeta = (c: string | null) => CAT[c ?? 'uitstapje'] ?? CAT.uitstapje

const COST: Record<string, { label: string; cls: string }> = {
  gratis: { label: 'Gratis', cls: 'bg-emerald-100 text-emerald-700' },
  laag: { label: '€', cls: 'bg-slate-100 text-slate-600' },
  gemiddeld: { label: '€€', cls: 'bg-slate-100 text-slate-600' },
  hoog: { label: '€€€', cls: 'bg-slate-100 text-slate-600' },
}

const AGE_BANDS = ['alle', '0-4', '4-8', '8-12', '12+'] as const
const TABS = [
  { key: 'idee', label: 'Ideeën' },
  { key: 'gepland', label: 'Gepland' },
  { key: 'gedaan', label: 'Gedaan' },
  { key: 'buurt', label: 'In de buurt' },
] as const

export default function UitjesPage() {
  const { outings, isLoading, addOuting, updateOuting, removeOuting, generate } = useOutings()
  const [tab, setTab] = useState<'idee' | 'gepland' | 'gedaan' | 'buurt'>('idee')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [ageFilter, setAgeFilter] = useState('alle')
  const [costFilter, setCostFilter] = useState('alle')

  const [addOpen, setAddOpen] = useState(false)
  const [form, setForm] = useState({ title: '', description: '', category: 'uitstapje', cost: 'gratis', ageBand: 'alle' })

  const [planFor, setPlanFor] = useState<Outing | null>(null)
  const [planDate, setPlanDate] = useState('')

  const counts: Record<string, number> = {
    idee: outings.filter((o) => o.status === 'idee').length,
    gepland: outings.filter((o) => o.status === 'gepland').length,
    gedaan: outings.filter((o) => o.status === 'gedaan').length,
  }
  const shown = outings.filter(
    (o) =>
      o.status === tab &&
      (ageFilter === 'alle' || !o.ageBand || o.ageBand === 'alle' || o.ageBand === ageFilter) &&
      (costFilter === 'alle' || o.cost === costFilter),
  )

  const onGenerate = async () => {
    setBusy(true)
    setMsg(null)
    try {
      const { created } = await generate(10)
      setMsg(created > 0 ? `${created} nieuwe uitjes verzonnen.` : 'Geen nieuwe ideeën — probeer het later nog eens.')
      setTab('idee')
    } catch (e) {
      setMsg(e instanceof Error && e.message.includes('503') ? 'AI is nog niet gekoppeld (ANTHROPIC_API_KEY).' : 'Verzinnen mislukt — probeer het zo nog eens.')
    } finally {
      setBusy(false)
    }
  }

  const submitAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title.trim()) return
    await addOuting({
      title: form.title.trim(),
      description: form.description.trim() || undefined,
      category: form.category,
      cost: form.cost,
      ageBand: form.ageBand,
    })
    setForm({ title: '', description: '', category: 'uitstapje', cost: 'gratis', ageBand: 'alle' })
    setAddOpen(false)
  }

  const savePlan = async () => {
    if (!planFor || !planDate) return
    await updateOuting(planFor.id, { date: planDate })
    setPlanFor(null)
    setPlanDate('')
  }

  return (
    <>
      <PageHeader
        title="Uitjes"
        subtitle="Dingen om met het gezin te doen"
        icon={Compass}
        iconClassName="bg-brand-light text-brand"
        actions={
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setAddOpen(true)}
              className="pill border border-cardborder bg-white px-3.5 py-2.5 text-slate-700 hover:bg-slate-50"
            >
              <Plus className="h-4 w-4" />
              Zelf
            </button>
            <button
              type="button"
              onClick={onGenerate}
              disabled={busy}
              className="pill bg-brand px-4 py-2.5 text-white shadow-sm shadow-brand/20 hover:bg-brand-dark disabled:opacity-50"
            >
              <Sparkles className={`h-4 w-4 ${busy ? 'animate-pulse' : ''}`} />
              {busy ? 'Verzinnen…' : 'Verzin 10 nieuwe'}
            </button>
          </div>
        }
      />

      {msg && <p className="mb-4 text-sm font-medium text-brand">{msg}</p>}

      <div className="mb-5 flex gap-1 rounded-2xl bg-slate-100 p-1">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`flex-1 rounded-xl px-2 py-2 text-sm font-semibold transition-colors ${
              tab === t.key ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {t.label}
            {t.key in counts && <span className="text-slate-400"> ({counts[t.key]})</span>}
          </button>
        ))}
      </div>

      {tab === 'buurt' ? (
        <NearbyExplorer />
      ) : (
        <>
          <div className="mb-4 flex flex-wrap gap-2">
            <select value={ageFilter} onChange={(e) => setAgeFilter(e.target.value)} className="rounded-xl border border-cardborder bg-white px-3 py-2 text-xs font-semibold text-slate-600 outline-none">
              <option value="alle">Alle leeftijden</option>
              {AGE_BANDS.filter((a) => a !== 'alle').map((a) => (
                <option key={a} value={a}>
                  {a} jaar
                </option>
              ))}
            </select>
            <select value={costFilter} onChange={(e) => setCostFilter(e.target.value)} className="rounded-xl border border-cardborder bg-white px-3 py-2 text-xs font-semibold text-slate-600 outline-none">
              <option value="alle">Alle prijzen</option>
              <option value="gratis">Gratis</option>
              <option value="laag">€ laag</option>
              <option value="gemiddeld">€€ gemiddeld</option>
              <option value="hoog">€€€ hoog</option>
            </select>
          </div>

          {isLoading && outings.length === 0 ? (
        <DashboardCard>
          <p className="text-sm text-slate-400">Laden…</p>
        </DashboardCard>
      ) : shown.length === 0 ? (
        <DashboardCard>
          <div className="flex flex-col items-start gap-2 py-2">
            <p className="text-sm text-slate-500">
              {tab === 'idee'
                ? 'Nog geen ideeën. Tik op “Verzin 10 nieuwe” en Fam bedenkt leuke (vaak gratis) uitjes in jouw omgeving.'
                : tab === 'gepland'
                  ? 'Nog niets gepland. Plan een idee in — het komt dan ook in je agenda.'
                  : 'Nog niets afgevinkt. Wat je hebt gedaan komt hier te staan.'}
            </p>
          </div>
        </DashboardCard>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {shown.map((o) => {
            const meta = catMeta(o.category)
            const Icon = meta.icon
            const cost = o.cost ? COST[o.cost] : null
            return (
              <DashboardCard key={o.id} className={o.status === 'gedaan' ? 'opacity-70' : ''}>
                <div className="flex items-start gap-3">
                  <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${meta.cls}`}>
                    <Icon className="h-5 w-5" strokeWidth={2.1} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-slate-900 dark:text-slate-100">{o.title}</p>
                    {o.description && <p className="mt-0.5 text-xs text-slate-500">{o.description}</p>}
                    <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px]">
                      <span className={`rounded-full px-2 py-0.5 font-semibold ${meta.cls}`}>{meta.label}</span>
                      {cost && <span className={`rounded-full px-2 py-0.5 font-semibold ${cost.cls}`}>{cost.label}</span>}
                      {o.ageBand && o.ageBand !== 'alle' && (
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 font-semibold text-slate-600">{o.ageBand} jr</span>
                      )}
                      {o.area && (
                        <span className="inline-flex items-center gap-1 text-slate-400">
                          <MapPin className="h-3 w-3" />
                          {o.area}
                        </span>
                      )}
                      {o.date && (
                        <span className="inline-flex items-center gap-1 font-semibold text-brand">
                          <Calendar className="h-3 w-3" />
                          {o.date}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-2 border-t border-cardborder pt-3">
                  {o.status !== 'gedaan' && (
                    <button
                      type="button"
                      onClick={() => {
                        setPlanFor(o)
                        setPlanDate(o.date ?? '')
                      }}
                      className="pill bg-brand-light px-3 py-1.5 text-xs font-semibold text-brand hover:bg-brand/15"
                    >
                      <Calendar className="h-3.5 w-3.5" />
                      {o.status === 'gepland' ? 'Datum wijzigen' : 'Plannen'}
                    </button>
                  )}
                  {o.status !== 'gedaan' && (
                    <button
                      type="button"
                      onClick={() => updateOuting(o.id, { status: 'gedaan' })}
                      className="pill bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"
                    >
                      <Check className="h-3.5 w-3.5" />
                      Gedaan
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => removeOuting(o.id)}
                    aria-label={`${o.title} verwijderen`}
                    className="pill ml-auto px-2.5 py-1.5 text-xs text-slate-400 hover:bg-rose-50 hover:text-rose-500"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </DashboardCard>
            )
          })}
        </div>
      )}
        </>
      )}

      {/* Plannen → agenda */}
      <Modal open={!!planFor} onClose={() => setPlanFor(null)} title={`Plannen: ${planFor?.title ?? ''}`}>
        <div className="flex flex-col gap-3">
          <label className="text-xs font-semibold text-slate-500">
            Wanneer?
            <input type="date" value={planDate} onChange={(e) => setPlanDate(e.target.value)} className={`mt-1 ${inputClass}`} />
          </label>
          <p className="text-[11px] text-slate-400">
            Het uitje komt op die dag ook in je agenda, met een herinnering een dag van tevoren.
          </p>
          <button
            type="button"
            onClick={savePlan}
            disabled={!planDate}
            className="pill bg-brand px-4 py-2.5 text-white shadow-sm shadow-brand/20 hover:bg-brand-dark disabled:opacity-50"
          >
            In agenda zetten
          </button>
        </div>
      </Modal>

      {/* Zelf toevoegen */}
      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Uitje toevoegen">
        <form onSubmit={submitAdd} className="flex flex-col gap-3">
          <label className="text-xs font-semibold text-slate-500">
            Wat gaan jullie doen?
            <input
              autoFocus
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Bijv. Speeltuinen-tour door de stad"
              className={`mt-1 ${inputClass}`}
            />
          </label>
          <label className="text-xs font-semibold text-slate-500">
            Omschrijving (optioneel)
            <input
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Korte toelichting"
              className={`mt-1 ${inputClass}`}
            />
          </label>
          <div className="flex gap-3">
            <label className="flex-1 text-xs font-semibold text-slate-500">
              Soort
              <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className={`mt-1 ${inputClass}`}>
                {Object.entries(CAT).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex-1 text-xs font-semibold text-slate-500">
              Kosten
              <select value={form.cost} onChange={(e) => setForm({ ...form, cost: e.target.value })} className={`mt-1 ${inputClass}`}>
                <option value="gratis">Gratis</option>
                <option value="laag">€ laag</option>
                <option value="gemiddeld">€€ gemiddeld</option>
                <option value="hoog">€€€ hoog</option>
              </select>
            </label>
            <label className="flex-1 text-xs font-semibold text-slate-500">
              Leeftijd
              <select value={form.ageBand} onChange={(e) => setForm({ ...form, ageBand: e.target.value })} className={`mt-1 ${inputClass}`}>
                <option value="alle">Alle</option>
                <option value="0-4">0-4 jr</option>
                <option value="4-8">4-8 jr</option>
                <option value="8-12">8-12 jr</option>
                <option value="12+">12+ jr</option>
              </select>
            </label>
          </div>
          <button type="submit" className="pill mt-1 bg-brand px-4 py-2.5 text-white shadow-sm shadow-brand/20 hover:bg-brand-dark">
            Toevoegen
          </button>
        </form>
      </Modal>
    </>
  )
}

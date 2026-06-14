'use client'

import { useState } from 'react'
import { PiggyBank, Plus, Trash2, Plane, Car, Home, Gift, ShieldCheck, type LucideIcon } from 'lucide-react'
import DashboardCard from './DashboardCard'
import Modal from './Modal'
import { useSavings, useFamily } from '@/lib/hooks'

const inputClass =
  'w-full rounded-xl border border-cardborder bg-white px-3.5 py-2.5 text-sm text-slate-700 outline-none transition-colors placeholder:text-slate-400 focus:border-brand/40 focus:ring-2 focus:ring-brand/20'

const THEMES: Record<string, { label: string; icon: LucideIcon; bg: string; text: string }> = {
  algemeen: { label: 'Algemeen', icon: PiggyBank, bg: 'bg-emerald-100', text: 'text-emerald-600 dark:text-emerald-300' },
  vakantie: { label: 'Vakantie', icon: Plane, bg: 'bg-sky-100', text: 'text-sky-600 dark:text-sky-300' },
  auto: { label: 'Auto', icon: Car, bg: 'bg-violet-100', text: 'text-violet-600 dark:text-violet-300' },
  huis: { label: 'Huis', icon: Home, bg: 'bg-amber-100', text: 'text-amber-600 dark:text-amber-300' },
  feest: { label: 'Feest', icon: Gift, bg: 'bg-pink-100', text: 'text-pink-600 dark:text-pink-300' },
  noodfonds: { label: 'Noodfonds', icon: ShieldCheck, bg: 'bg-slate-100', text: 'text-slate-600 dark:text-slate-300' },
}
const themeOf = (t?: string | null) => THEMES[t || 'algemeen'] ?? THEMES.algemeen
const THEME_KEYS = Object.keys(THEMES)

/** Aantal hele maanden tot een einddatum (yyyy-mm-dd), minimaal 1; null als verleden/leeg. */
function monthsUntil(dateStr?: string | null): number | null {
  const m = /^(\d{4})-(\d{2})/.exec(dateStr || '')
  if (!m) return null
  const now = new Date()
  const months = (Number(m[1]) - now.getFullYear()) * 12 + (Number(m[2]) - 1 - now.getMonth())
  return months >= 1 ? months : null
}

const emptyForm = { name: '', target: '', targetDate: '', monthly: '', forMember: '', theme: 'algemeen' }

export default function SavingsGoalsCard({ className = '' }: { className?: string }) {
  const { goals, addGoal, deposit, removeGoal } = useSavings()
  const { members } = useFamily()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [drafts, setDrafts] = useState<Record<number, string>>({})

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    const target = Number(form.target.replace(',', '.'))
    if (!form.name.trim() || !target) return
    await addGoal({
      name: form.name.trim(),
      target,
      targetDate: form.targetDate || null,
      monthly: form.monthly ? Number(form.monthly.replace(',', '.')) || null : null,
      forMember: form.forMember || null,
      theme: form.theme,
    })
    setForm(emptyForm)
    setOpen(false)
  }

  const doDeposit = (id: number, goal: { id: number; saved: number; target: number; name: string }) => {
    const v = Number((drafts[id] ?? '').replace(',', '.'))
    if (!v) return
    deposit(goal, v)
    setDrafts((d) => ({ ...d, [id]: '' }))
  }

  return (
    <DashboardCard
      title="Spaardoelen"
      icon={PiggyBank}
      iconClassName="text-emerald-500"
      className={className}
      headerRight={
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="pill min-h-[44px] bg-brand-light px-3 py-1.5 text-xs text-brand hover:bg-emerald-100"
        >
          <Plus className="h-3.5 w-3.5" />
          Doel
        </button>
      }
    >
      {goals.length === 0 ? (
        <p className="text-sm text-slate-500">Nog geen spaardoelen. Voeg er een toe.</p>
      ) : (
        <ul className="flex flex-col gap-4">
          {goals.map((g) => {
            const pct = g.target ? Math.min(Math.round((g.saved / g.target) * 100), 100) : 0
            const remaining = Math.max(0, g.target - g.saved)
            const months = monthsUntil(g.targetDate)
            const perMonth =
              g.monthly && g.monthly > 0 ? Math.round(g.monthly) : months ? Math.ceil(remaining / months) : null
            const th = themeOf(g.theme)
            const Icon = th.icon
            return (
              <li key={g.id}>
                <div className="mb-1.5 flex items-center gap-2.5">
                  <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${th.bg} ${th.text}`}>
                    <Icon className="h-4 w-4" strokeWidth={2.2} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-slate-800 dark:text-slate-100">
                      {g.name}
                    </span>
                    {(g.forMember || g.targetDate) && (
                      <span className="block truncate text-[11px] text-slate-400">
                        {[g.forMember ? `voor ${g.forMember}` : null, g.targetDate ? `streefdatum ${g.targetDate}` : null]
                          .filter(Boolean)
                          .join(' · ')}
                      </span>
                    )}
                  </div>
                  <span className="shrink-0 text-sm text-slate-500">
                    €{Math.round(g.saved)} <span className="text-slate-400">/ €{Math.round(g.target)}</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => removeGoal(g.id)}
                    aria-label={`${g.name} verwijderen`}
                    className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-slate-300 transition-colors hover:bg-rose-50 hover:text-rose-500"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <div className="mt-1 flex justify-between text-[11px] text-slate-400">
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">{pct}% gehaald</span>
                  <span>
                    nog €{Math.round(remaining)}
                    {perMonth ? ` · €${perMonth}/mnd${g.monthly ? ' inleg' : ' nodig'}` : ''}
                  </span>
                </div>
                <form
                  onSubmit={(e) => {
                    e.preventDefault()
                    doDeposit(g.id, g)
                  }}
                  className="mt-2 flex gap-2"
                >
                  <input
                    inputMode="decimal"
                    value={drafts[g.id] ?? ''}
                    onChange={(e) => setDrafts((d) => ({ ...d, [g.id]: e.target.value }))}
                    placeholder="Inleg €"
                    className="min-w-0 flex-1 rounded-full border border-cardborder bg-white px-3 py-2.5 text-sm text-slate-700 outline-none placeholder:text-slate-400 focus:border-brand/40 focus:ring-2 focus:ring-brand/20"
                  />
                  <button
                    type="submit"
                    className="pill shrink-0 bg-white px-3 py-2.5 text-sm text-slate-700 ring-1 ring-cardborder hover:bg-slate-50"
                  >
                    Inleggen
                  </button>
                </form>
              </li>
            )
          })}
        </ul>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="Nieuw spaardoel">
        <form onSubmit={submit} className="flex flex-col gap-3">
          <label className="text-xs font-semibold text-slate-500">
            Naam
            <input
              autoFocus
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Bijv. Zomervakantie"
              className={`mt-1 ${inputClass}`}
            />
          </label>
          <div className="flex gap-3">
            <label className="min-w-0 flex-1 text-xs font-semibold text-slate-500">
              Doelbedrag (€)
              <input
                inputMode="decimal"
                value={form.target}
                onChange={(e) => setForm({ ...form, target: e.target.value })}
                placeholder="1500"
                className={`mt-1 ${inputClass}`}
              />
            </label>
            <label className="min-w-0 flex-1 text-xs font-semibold text-slate-500">
              Streefdatum (optioneel)
              <input
                type="date"
                value={form.targetDate}
                onChange={(e) => setForm({ ...form, targetDate: e.target.value })}
                className={`mt-1 ${inputClass}`}
              />
            </label>
          </div>
          <div className="flex gap-3">
            <label className="min-w-0 flex-1 text-xs font-semibold text-slate-500">
              Maandinleg (optioneel)
              <input
                inputMode="decimal"
                value={form.monthly}
                onChange={(e) => setForm({ ...form, monthly: e.target.value })}
                placeholder="bv. 100"
                className={`mt-1 ${inputClass}`}
              />
            </label>
            <label className="min-w-0 flex-1 text-xs font-semibold text-slate-500">
              Voor wie (optioneel)
              <select
                value={form.forMember}
                onChange={(e) => setForm({ ...form, forMember: e.target.value })}
                className={`mt-1 ${inputClass}`}
              >
                <option value="">Hele gezin</option>
                {members.map((m) => (
                  <option key={m.id} value={m.name}>
                    {m.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <p className="-mt-1 text-[11px] text-slate-400">
            Vul een maandinleg in om zelf te bepalen wat er per maand opzij gaat — anders rekent Fam het uit op basis van
            de streefdatum. Dit bedrag wordt van &ldquo;wat je per maand overhoudt&rdquo; afgehaald.
          </p>

          <div>
            <p className="mb-1 text-xs font-semibold text-slate-500">Thema</p>
            <div className="flex flex-wrap gap-1.5">
              {THEME_KEYS.map((k) => {
                const t = THEMES[k]
                const TIcon = t.icon
                const active = form.theme === k
                return (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setForm({ ...form, theme: k })}
                    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                      active ? 'bg-brand text-white' : `${t.bg} ${t.text}`
                    }`}
                  >
                    <TIcon className="h-3.5 w-3.5" />
                    {t.label}
                  </button>
                )
              })}
            </div>
          </div>
          <button
            type="submit"
            className="pill mt-2 bg-brand px-4 py-2.5 text-white shadow-sm shadow-brand/20 hover:bg-brand-dark"
          >
            Doel opslaan
          </button>
        </form>
      </Modal>
    </DashboardCard>
  )
}

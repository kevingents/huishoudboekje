'use client'

import { useState } from 'react'
import { Gift, Plus, Pencil, Trash2 } from 'lucide-react'
import DashboardCard from './DashboardCard'
import Modal from './Modal'
import { useAdminRewards, type Reward } from '@/lib/hooks'

const inputClass =
  'w-full rounded-xl border border-cardborder bg-white px-3.5 py-2.5 text-sm text-slate-700 outline-none transition-colors placeholder:text-slate-400 focus:border-brand/40 focus:ring-2 focus:ring-brand/20'

const CATEGORIES = [
  { value: 'uitje', label: 'Uitje' },
  { value: 'product', label: 'Product' },
  { value: 'tegoed', label: 'Tegoed' },
  { value: 'ervaring', label: 'Ervaring' },
]

const empty = {
  partner: '',
  title: '',
  description: '',
  conditions: '',
  imageUrl: '',
  category: 'uitje',
  active: true,
  sortOrder: '0',
}

/** Beheer-sectie: adverteerder-gesponsorde beloningen (globale catalogus). */
export default function RewardsManager() {
  const { rewards, isLoading, addReward, updateReward, removeReward } = useAdminRewards()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Reward | null>(null)
  const [form, setForm] = useState(empty)

  const startAdd = () => {
    setEditing(null)
    setForm(empty)
    setOpen(true)
  }

  const startEdit = (r: Reward) => {
    setEditing(r)
    setForm({
      partner: r.partner,
      title: r.title,
      description: r.description,
      conditions: r.conditions ?? '',
      imageUrl: r.imageUrl ?? '',
      category: r.category,
      active: r.active,
      sortOrder: String(r.sortOrder),
    })
    setOpen(true)
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.partner.trim() || !form.title.trim()) return
    const payload = {
      partner: form.partner.trim(),
      title: form.title.trim(),
      description: form.description.trim(),
      conditions: form.conditions.trim() || null,
      imageUrl: form.imageUrl.trim() || null,
      category: form.category,
      active: form.active,
      sortOrder: Number(form.sortOrder) || 0,
    }
    if (editing) await updateReward(editing.id, payload)
    else await addReward(payload)
    setOpen(false)
  }

  return (
    <DashboardCard
      title="Gesponsorde beloningen"
      icon={Gift}
      iconClassName="text-violet-500"
      headerRight={
        <button
          type="button"
          onClick={startAdd}
          className="pill bg-brand px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-dark"
        >
          <Plus className="h-3.5 w-3.5" />
          Beloning
        </button>
      }
    >
      {isLoading && rewards.length === 0 ? (
        <p className="text-sm text-slate-400">Laden…</p>
      ) : rewards.length === 0 ? (
        <p className="text-sm text-slate-500">
          Nog geen beloningen. Voeg een gesponsorde beloning toe (bijv. partner Efteling → “Dagje Efteling”).
        </p>
      ) : (
        <ul className="flex flex-col">
          {rewards.map((r, i) => (
            <li key={r.id}>
              <div className="group flex items-center gap-3 py-3">
                {r.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={r.imageUrl} alt="" className="h-11 w-11 shrink-0 rounded-xl object-cover" />
                ) : (
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-violet-100 text-violet-500">
                    <Gift className="h-5 w-5" />
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-slate-800">{r.title}</p>
                  <p className="truncate text-xs text-slate-500">
                    {r.partner} · {r.category}
                    {r.conditions ? ` · ${r.conditions}` : ''}
                  </p>
                </div>
                {!r.active && (
                  <span className="pill shrink-0 bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500">
                    Uit
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => startEdit(r)}
                  aria-label={`${r.title} bewerken`}
                  className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 sm:h-8 sm:w-8"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => removeReward(r.id)}
                  aria-label={`${r.title} verwijderen`}
                  className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-500 sm:h-8 sm:w-8"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              {i < rewards.length - 1 && <hr className="border-cardborder" />}
            </li>
          ))}
        </ul>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? 'Beloning bewerken' : 'Beloning toevoegen'}>
        <form onSubmit={submit} className="flex flex-col gap-3">
          <div className="flex gap-3">
            <label className="flex-1 text-xs font-semibold text-slate-500">
              Partner
              <input
                autoFocus
                value={form.partner}
                onChange={(e) => setForm({ ...form, partner: e.target.value })}
                placeholder="Bijv. Efteling"
                className={`mt-1 ${inputClass}`}
              />
            </label>
            <label className="w-28 text-xs font-semibold text-slate-500">
              Categorie
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className={`mt-1 ${inputClass}`}
              >
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label className="text-xs font-semibold text-slate-500">
            Titel
            <input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Bijv. Dagje Efteling"
              className={`mt-1 ${inputClass}`}
            />
          </label>
          <label className="text-xs font-semibold text-slate-500">
            Omschrijving
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={2}
              placeholder="Korte omschrijving voor het gezin"
              className={`mt-1 ${inputClass}`}
            />
          </label>
          <label className="text-xs font-semibold text-slate-500">
            Voorwaarden
            <input
              value={form.conditions}
              onChange={(e) => setForm({ ...form, conditions: e.target.value })}
              placeholder="Bijv. presentje bij bezoek, mits 20 taken volbracht"
              className={`mt-1 ${inputClass}`}
            />
          </label>
          <label className="text-xs font-semibold text-slate-500">
            Afbeelding-URL
            <input
              value={form.imageUrl}
              onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
              placeholder="https://…"
              className={`mt-1 ${inputClass}`}
            />
          </label>
          <div className="flex items-center gap-4">
            <label className="w-28 text-xs font-semibold text-slate-500">
              Volgorde
              <input
                inputMode="numeric"
                value={form.sortOrder}
                onChange={(e) => setForm({ ...form, sortOrder: e.target.value })}
                className={`mt-1 ${inputClass}`}
              />
            </label>
            <label className="mt-4 flex items-center gap-2 text-sm font-semibold text-slate-700">
              <input
                type="checkbox"
                checked={form.active}
                onChange={(e) => setForm({ ...form, active: e.target.checked })}
                className="h-4 w-4 accent-brand"
              />
              Actief (zichtbaar voor gezinnen)
            </label>
          </div>
          <button
            type="submit"
            className="pill mt-2 bg-brand px-4 py-2.5 text-white shadow-sm shadow-brand/20 hover:bg-brand-dark"
          >
            {editing ? 'Wijzigingen opslaan' : 'Beloning opslaan'}
          </button>
        </form>
      </Modal>
    </DashboardCard>
  )
}

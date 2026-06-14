'use client'

import { useState } from 'react'
import { Megaphone, Plus, Pencil, Trash2 } from 'lucide-react'
import DashboardCard from './DashboardCard'
import Modal from './Modal'
import { useAdminAds, type Ad } from '@/lib/hooks'

const inputClass =
  'w-full rounded-xl border border-cardborder bg-white px-3.5 py-2.5 text-sm text-slate-700 outline-none transition-colors placeholder:text-slate-400 focus:border-brand/40 focus:ring-2 focus:ring-brand/20'

const empty = { sponsor: '', title: '', body: '', imageUrl: '', linkUrl: '', active: true, sortOrder: '0' }

/** Beheer-sectie: advertenties/aanbiedingen (AH-bonus-stijl). */
export default function AdsManager() {
  const { ads, isLoading, addAd, updateAd, removeAd } = useAdminAds()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Ad | null>(null)
  const [form, setForm] = useState(empty)

  const startAdd = () => {
    setEditing(null)
    setForm(empty)
    setOpen(true)
  }
  const startEdit = (a: Ad) => {
    setEditing(a)
    setForm({
      sponsor: a.sponsor,
      title: a.title,
      body: a.body ?? '',
      imageUrl: a.imageUrl ?? '',
      linkUrl: a.linkUrl ?? '',
      active: a.active,
      sortOrder: String(a.sortOrder),
    })
    setOpen(true)
  }
  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.sponsor.trim() || !form.title.trim()) return
    const payload = {
      sponsor: form.sponsor.trim(),
      title: form.title.trim(),
      body: form.body.trim() || null,
      imageUrl: form.imageUrl.trim() || null,
      linkUrl: form.linkUrl.trim() || null,
      active: form.active,
      sortOrder: Number(form.sortOrder) || 0,
    }
    if (editing) await updateAd(editing.id, payload)
    else await addAd(payload)
    setOpen(false)
  }

  return (
    <DashboardCard
      title="Advertenties / aanbiedingen"
      icon={Megaphone}
      iconClassName="text-amber-500"
      headerRight={
        <button
          type="button"
          onClick={startAdd}
          className="pill bg-brand px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-dark"
        >
          <Plus className="h-3.5 w-3.5" />
          Advertentie
        </button>
      }
    >
      {isLoading && ads.length === 0 ? (
        <p className="text-sm text-slate-400">Laden…</p>
      ) : ads.length === 0 ? (
        <p className="text-sm text-slate-500">
          Nog geen advertenties. Voeg een aanbieding toe (bijv. sponsor “Albert Heijn” → “Bonus: 2e
          gratis”).
        </p>
      ) : (
        <ul className="flex flex-col">
          {ads.map((a, i) => (
            <li key={a.id}>
              <div className="flex items-center gap-3 py-3">
                {a.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={a.imageUrl} alt="" className="h-10 w-10 shrink-0 rounded-xl object-cover" />
                ) : (
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-amber-100 text-amber-500">
                    <Megaphone className="h-5 w-5" />
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-slate-800">{a.title}</p>
                  <p className="truncate text-xs text-slate-500">{a.sponsor}</p>
                </div>
                {!a.active && (
                  <span className="pill shrink-0 bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500">
                    Uit
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => startEdit(a)}
                  aria-label={`${a.title} bewerken`}
                  className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600 sm:h-9 sm:w-9"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => removeAd(a.id)}
                  aria-label={`${a.title} verwijderen`}
                  className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-slate-400 hover:bg-rose-50 hover:text-rose-500 sm:h-9 sm:w-9"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              {i < ads.length - 1 && <hr className="border-cardborder" />}
            </li>
          ))}
        </ul>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? 'Advertentie bewerken' : 'Advertentie toevoegen'}>
        <form onSubmit={submit} className="flex flex-col gap-3">
          <div className="flex gap-3">
            <label className="min-w-0 flex-1 text-xs font-semibold text-slate-500">
              Sponsor
              <input
                autoFocus
                value={form.sponsor}
                onChange={(e) => setForm({ ...form, sponsor: e.target.value })}
                placeholder="Bijv. Albert Heijn"
                className={`mt-1 ${inputClass}`}
              />
            </label>
            <label className="w-24 text-xs font-semibold text-slate-500">
              Volgorde
              <input
                inputMode="numeric"
                value={form.sortOrder}
                onChange={(e) => setForm({ ...form, sortOrder: e.target.value })}
                className={`mt-1 ${inputClass}`}
              />
            </label>
          </div>
          <label className="text-xs font-semibold text-slate-500">
            Titel
            <input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Bijv. Bonus: 2e gratis"
              className={`mt-1 ${inputClass}`}
            />
          </label>
          <label className="text-xs font-semibold text-slate-500">
            Tekst
            <input
              value={form.body}
              onChange={(e) => setForm({ ...form, body: e.target.value })}
              placeholder="Korte omschrijving"
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
          <label className="text-xs font-semibold text-slate-500">
            Link-URL
            <input
              value={form.linkUrl}
              onChange={(e) => setForm({ ...form, linkUrl: e.target.value })}
              placeholder="https://…"
              className={`mt-1 ${inputClass}`}
            />
          </label>
          <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
            <input
              type="checkbox"
              checked={form.active}
              onChange={(e) => setForm({ ...form, active: e.target.checked })}
              className="h-4 w-4 accent-brand"
            />
            Actief (zichtbaar voor gezinnen)
          </label>
          <button
            type="submit"
            className="pill mt-1 bg-brand px-4 py-2.5 text-white shadow-sm shadow-brand/20 hover:bg-brand-dark"
          >
            {editing ? 'Wijzigingen opslaan' : 'Advertentie opslaan'}
          </button>
        </form>
      </Modal>
    </DashboardCard>
  )
}

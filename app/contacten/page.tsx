'use client'

import { useState } from 'react'
import {
  Contact as ContactIcon,
  GraduationCap,
  Baby,
  Stethoscope,
  Users,
  Phone,
  MapPin,
  Plus,
  Trash2,
} from 'lucide-react'
import PageHeader from '@/components/PageHeader'
import DashboardCard from '@/components/DashboardCard'
import Modal from '@/components/Modal'
import { useContacts } from '@/lib/hooks'

const inputClass =
  'w-full rounded-xl border border-cardborder bg-white px-3.5 py-2.5 text-sm text-slate-700 outline-none transition-colors placeholder:text-slate-400 focus:border-brand/40 focus:ring-2 focus:ring-brand/20'

const CATEGORIES = [
  { value: 'school', label: 'School', icon: GraduationCap, accent: 'bg-violet-100 text-violet-600' },
  { value: 'opvang', label: 'Opvang', icon: Baby, accent: 'bg-amber-100 text-amber-600' },
  { value: 'zorg', label: 'Zorg', icon: Stethoscope, accent: 'bg-rose-100 text-rose-600' },
  { value: 'familie', label: 'Familie', icon: Users, accent: 'bg-emerald-100 text-emerald-600' },
  { value: 'overig', label: 'Overig', icon: ContactIcon, accent: 'bg-slate-100 text-slate-500' },
]
const catMeta = (c: string) => CATEGORIES.find((x) => x.value === c) ?? CATEGORIES[4]

const empty = { name: '', category: 'school', phone: '', address: '', notes: '' }

export default function ContactenPage() {
  const { contacts, isLoading, addContact, removeContact } = useContacts()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(empty)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) return
    await addContact({
      name: form.name.trim(),
      category: form.category,
      phone: form.phone.trim() || null,
      address: form.address.trim() || null,
      notes: form.notes.trim() || null,
    })
    setForm(empty)
    setOpen(false)
  }

  return (
    <>
      <PageHeader
        title="Contacten"
        subtitle="Belangrijke nummers en adressen"
        icon={ContactIcon}
        iconClassName="bg-sky-100 text-sky-500"
        actions={
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="pill bg-brand px-4 py-2.5 text-white shadow-sm shadow-brand/20 hover:bg-brand-dark"
          >
            <Plus className="h-4 w-4" />
            Contact toevoegen
          </button>
        }
      />

      {isLoading && contacts.length === 0 ? (
        <p className="text-sm text-slate-400">Laden…</p>
      ) : contacts.length === 0 ? (
        <DashboardCard>
          <p className="text-sm text-slate-600">
            Bewaar hier belangrijke contacten — school, kinderopvang, huisarts, tandarts, oma. Eén
            tik om te bellen, altijd bij de hand voor het hele gezin.
          </p>
        </DashboardCard>
      ) : (
        <div className="flex flex-col gap-3">
          {contacts.map((c) => {
            const meta = catMeta(c.category)
            const Icon = meta.icon
            return (
              <DashboardCard key={c.id}>
                <div className="flex items-center gap-4">
                  <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl ${meta.accent}`}>
                    <Icon className="h-6 w-6" strokeWidth={2.1} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-slate-800">{c.name}</p>
                    {c.address && (
                      <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-slate-500">
                        <MapPin className="h-3 w-3 shrink-0" /> {c.address}
                      </p>
                    )}
                    {c.notes && <p className="truncate text-xs text-slate-400">{c.notes}</p>}
                  </div>
                  {c.phone && (
                    <a
                      href={`tel:${c.phone.replace(/\s/g, '')}`}
                      aria-label={`Bel ${c.name}`}
                      className="pill shrink-0 bg-brand-light px-3 py-3 text-xs font-semibold text-brand hover:bg-emerald-100"
                    >
                      <Phone className="h-4 w-4" />
                      Bel
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={() => removeContact(c.id)}
                    aria-label={`${c.name} verwijderen`}
                    className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-slate-300 transition-colors hover:bg-rose-50 hover:text-rose-500"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </DashboardCard>
            )
          })}
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="Contact toevoegen">
        <form onSubmit={submit} className="flex flex-col gap-3">
          <div className="flex gap-3">
            <label className="flex-1 text-xs font-semibold text-slate-500">
              Naam
              <input
                autoFocus
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Bijv. Huisarts of Oma"
                className={`mt-1 ${inputClass}`}
              />
            </label>
            <label className="w-32 text-xs font-semibold text-slate-500">
              Soort
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
            Telefoonnummer
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="Bijv. 06 12345678"
              className={`mt-1 ${inputClass}`}
            />
          </label>
          <label className="text-xs font-semibold text-slate-500">
            Adres
            <input
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              placeholder="Straat, plaats"
              className={`mt-1 ${inputClass}`}
            />
          </label>
          <label className="text-xs font-semibold text-slate-500">
            Notitie
            <input
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Bijv. juf Anne, groep 5"
              className={`mt-1 ${inputClass}`}
            />
          </label>
          <button
            type="submit"
            className="pill mt-1 bg-brand px-4 py-2.5 text-white shadow-sm shadow-brand/20 hover:bg-brand-dark"
          >
            Contact opslaan
          </button>
        </form>
      </Modal>
    </>
  )
}

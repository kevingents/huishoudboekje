'use client'

import { useRef, useState } from 'react'
import { FileText, ShieldCheck, Plus, Trash2, Camera, CalendarClock } from 'lucide-react'
import PageHeader from '@/components/PageHeader'
import DashboardCard from '@/components/DashboardCard'
import Modal from '@/components/Modal'
import { useDocuments, type FamilyDocument } from '@/lib/hooks'

const inputClass =
  'w-full rounded-xl border border-cardborder bg-white px-3.5 py-2.5 text-sm text-slate-700 outline-none transition-colors placeholder:text-slate-400 focus:border-brand/40 focus:ring-2 focus:ring-brand/20'

const TYPES = [
  { value: 'garantie', label: 'Garantiebewijs', icon: FileText, accent: 'bg-sky-100 text-sky-600' },
  { value: 'officieel', label: 'Officieel document', icon: ShieldCheck, accent: 'bg-violet-100 text-violet-600' },
]
// Alles wat geen garantie is, valt onder "officieel" (incl. oude 'legitimatie').
const typeMeta = (t: string) => (t === 'garantie' ? TYPES[0] : TYPES[1])

function downscale(file: File, max = 900): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const img = new Image()
      img.onload = () => {
        const scale = Math.min(1, max / Math.max(img.width, img.height))
        const canvas = document.createElement('canvas')
        canvas.width = Math.round(img.width * scale)
        canvas.height = Math.round(img.height * scale)
        const ctx = canvas.getContext('2d')
        if (!ctx) return reject(new Error('Canvas niet beschikbaar'))
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
        resolve(canvas.toDataURL('image/jpeg', 0.7))
      }
      img.onerror = () => reject(new Error('Afbeelding kon niet worden geladen'))
      img.src = reader.result as string
    }
    reader.onerror = () => reject(new Error('Bestand kon niet worden gelezen'))
    reader.readAsDataURL(file)
  })
}

function expiryInfo(iso: string | null): { label: string; tone: string } | null {
  if (!iso) return null
  const [y, m, d] = iso.split('-').map(Number)
  if (!y || !m || !d) return null
  const target = new Date(y, m - 1, d)
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const days = Math.round((target.getTime() - now.getTime()) / 86_400_000)
  if (days < 0) return { label: 'Verlopen', tone: 'bg-rose-100 text-rose-600' }
  if (days === 0) return { label: 'Verloopt vandaag', tone: 'bg-rose-100 text-rose-600' }
  if (days <= 30) return { label: `Nog ${days} ${days === 1 ? 'dag' : 'dagen'}`, tone: 'bg-amber-100 text-amber-600' }
  return { label: `Geldig t/m ${d}-${m}-${y}`, tone: 'bg-emerald-100 text-emerald-600' }
}

export default function DocumentenPage() {
  const { documents, isLoading, addDocument, removeDocument } = useDocuments()
  const fileRef = useRef<HTMLInputElement>(null)

  const [active, setActive] = useState<FamilyDocument | null>(null)
  const [addOpen, setAddOpen] = useState(false)
  const [form, setForm] = useState({ title: '', type: 'garantie', owner: '', expiresAt: '', notes: '' })
  const [photo, setPhoto] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState<'garantie' | 'officieel'>('garantie')

  const shown = documents.filter((d) => (tab === 'garantie' ? d.type === 'garantie' : d.type !== 'garantie'))

  const openAdd = () => {
    setForm({ title: '', type: tab, owner: '', expiresAt: '', notes: '' })
    setPhoto(null)
    setError(null)
    setAddOpen(true)
  }

  const onPickPhoto = async (file: File | undefined) => {
    if (!file) return
    try {
      setPhoto(await downscale(file))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Kon de foto niet verwerken.')
    }
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title.trim()) return
    setBusy(true)
    setError(null)
    try {
      await addDocument({
        title: form.title.trim(),
        type: form.type,
        owner: form.owner.trim() || null,
        imageUrl: photo,
        expiresAt: form.expiresAt || null,
        notes: form.notes.trim() || null,
      })
      setAddOpen(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Opslaan mislukt.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <PageHeader
        title="Documenten"
        subtitle="Garantiebewijzen en legitimatie — met verloop-reminders"
        icon={FileText}
        iconClassName="bg-sky-100 text-sky-500"
        actions={
          <button
            type="button"
            onClick={openAdd}
            className="pill bg-brand px-4 py-2.5 text-white shadow-sm shadow-brand/20 hover:bg-brand-dark"
          >
            <Plus className="h-4 w-4" />
            Document toevoegen
          </button>
        }
      />

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => onPickPhoto(e.target.files?.[0])}
      />

      {/* Twee secties */}
      <div className="mb-5 flex rounded-full border border-cardborder bg-white p-1 text-sm font-semibold">
        <button
          type="button"
          onClick={() => setTab('garantie')}
          className={`flex-1 rounded-full px-4 py-2 transition-colors ${
            tab === 'garantie' ? 'bg-brand text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          Garantiebewijzen
        </button>
        <button
          type="button"
          onClick={() => setTab('officieel')}
          className={`flex-1 rounded-full px-4 py-2 transition-colors ${
            tab === 'officieel' ? 'bg-brand text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          Officiële documenten
        </button>
      </div>

      {isLoading && documents.length === 0 ? (
        <p className="text-sm text-slate-400">Laden…</p>
      ) : shown.length === 0 ? (
        <DashboardCard>
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <span className="grid h-14 w-14 place-items-center rounded-2xl bg-sky-100 text-sky-500">
              <FileText className="h-7 w-7" strokeWidth={2} />
            </span>
            <p className="max-w-md text-sm text-slate-600">
              {tab === 'garantie'
                ? 'Nog geen garantiebewijzen. Voeg bonnetjes/garanties toe met een foto en eventueel een verloopdatum.'
                : 'Nog geen officiële documenten. Voeg paspoort, ID of rijbewijs toe met een verloopdatum, dan stuurt Fam op tijd een reminder.'}
            </p>
          </div>
        </DashboardCard>
      ) : (
        <div className="flex flex-col gap-3">
          {shown.map((doc) => {
            const meta = typeMeta(doc.type)
            const Icon = meta.icon
            const exp = expiryInfo(doc.expiresAt)
            return (
              <DashboardCard key={doc.id} className="cursor-pointer" >
                <button type="button" onClick={() => setActive(doc)} className="flex w-full items-center gap-4 text-left">
                  <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl ${meta.accent}`}>
                    <Icon className="h-6 w-6" strokeWidth={2.1} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-slate-800">{doc.title}</p>
                    <p className="truncate text-xs text-slate-500">
                      {meta.label}
                      {doc.owner ? ` · ${doc.owner}` : ''}
                    </p>
                  </div>
                  {exp && (
                    <span className={`pill shrink-0 px-2.5 py-1 text-xs font-semibold ${exp.tone}`}>
                      <CalendarClock className="h-3.5 w-3.5" />
                      {exp.label}
                    </span>
                  )}
                </button>
              </DashboardCard>
            )
          })}
        </div>
      )}

      {/* Bekijken */}
      <Modal open={!!active} onClose={() => setActive(null)} title={active?.title ?? ''}>
        {active && (
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className={`pill px-2.5 py-1 font-semibold ${typeMeta(active.type).accent}`}>
                {typeMeta(active.type).label}
              </span>
              {active.owner && <span className="text-slate-500">{active.owner}</span>}
              {expiryInfo(active.expiresAt) && (
                <span className={`pill px-2.5 py-1 font-semibold ${expiryInfo(active.expiresAt)!.tone}`}>
                  {expiryInfo(active.expiresAt)!.label}
                </span>
              )}
            </div>
            {active.imageUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={active.imageUrl} alt={active.title} className="w-full rounded-2xl object-contain" />
            )}
            {active.notes && <p className="text-sm text-slate-600">{active.notes}</p>}
            <button
              type="button"
              onClick={() => {
                removeDocument(active.id)
                setActive(null)
              }}
              className="pill justify-center border border-cardborder bg-white px-4 py-2.5 text-rose-500 hover:bg-rose-50"
            >
              <Trash2 className="h-4 w-4" />
              Verwijderen
            </button>
          </div>
        )}
      </Modal>

      {/* Toevoegen */}
      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Document toevoegen">
        <form onSubmit={submit} className="flex flex-col gap-3">
          <div className="flex gap-3">
            <label className="flex-1 text-xs font-semibold text-slate-500">
              Titel
              <input
                autoFocus
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Bijv. Wasmachine garantie"
                className={`mt-1 ${inputClass}`}
              />
            </label>
            <label className="w-36 text-xs font-semibold text-slate-500">
              Soort
              <select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
                className={`mt-1 ${inputClass}`}
              >
                {TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="flex gap-3">
            <label className="flex-1 text-xs font-semibold text-slate-500">
              Van wie (optioneel)
              <input
                value={form.owner}
                onChange={(e) => setForm({ ...form, owner: e.target.value })}
                placeholder="Bijv. Sanne"
                className={`mt-1 ${inputClass}`}
              />
            </label>
            <label className="flex-1 text-xs font-semibold text-slate-500">
              Verloopdatum
              <input
                type="date"
                value={form.expiresAt}
                onChange={(e) => setForm({ ...form, expiresAt: e.target.value })}
                className={`mt-1 ${inputClass}`}
              />
            </label>
          </div>

          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="pill justify-center border border-cardborder bg-white px-4 py-2.5 text-slate-700 hover:bg-slate-50"
          >
            <Camera className={`h-4 w-4 ${photo ? 'text-brand' : ''}`} />
            {photo ? 'Foto gekozen' : 'Foto maken / kiezen'}
          </button>
          {photo && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photo} alt="Voorbeeld" className="max-h-32 w-full rounded-xl object-contain" />
          )}

          <label className="text-xs font-semibold text-slate-500">
            Notitie (optioneel)
            <input
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Bijv. kassabon erbij, 2 jaar garantie"
              className={`mt-1 ${inputClass}`}
            />
          </label>

          {error && <p className="text-sm font-medium text-rose-600">{error}</p>}

          <button
            type="submit"
            disabled={busy}
            className="pill mt-1 bg-brand px-4 py-2.5 text-white shadow-sm shadow-brand/20 hover:bg-brand-dark disabled:opacity-50"
          >
            {busy ? 'Bezig…' : 'Document opslaan'}
          </button>
        </form>
      </Modal>
    </>
  )
}

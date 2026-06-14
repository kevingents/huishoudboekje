'use client'

import { useRef, useState } from 'react'
import { CreditCard, Plus, Camera, Trash2, ScanLine } from 'lucide-react'
import PageHeader from '@/components/PageHeader'
import DashboardCard from '@/components/DashboardCard'
import ModuleGate from '@/components/ModuleGate'
import Modal from '@/components/Modal'
import Barcode from '@/components/Barcode'
import { useCards, type Card } from '@/lib/hooks'
import { brandLogo } from '@/lib/brands'

const inputClass =
  'w-full rounded-xl border border-cardborder bg-white px-3.5 py-2.5 text-sm text-slate-700 outline-none transition-colors placeholder:text-slate-400 focus:border-brand/40 focus:ring-2 focus:ring-brand/20'

const COLORS = [
  'from-sky-400 to-blue-500',
  'from-emerald-400 to-green-500',
  'from-violet-400 to-purple-500',
  'from-rose-400 to-pink-500',
  'from-amber-400 to-orange-500',
  'from-slate-500 to-slate-700',
]

/** Schaal een afbeelding terug en geef een JPEG data-URL (compact opslaan). */
function downscale(file: File, max = 800): Promise<string> {
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

interface DetectedBarcode {
  rawValue: string
}
interface BarcodeDetectorLike {
  detect(src: ImageBitmapSource): Promise<DetectedBarcode[]>
}
type BarcodeDetectorCtor = new (opts?: unknown) => BarcodeDetectorLike

/** Probeert een barcode uit een foto te lezen (alleen waar BarcodeDetector bestaat). */
async function detectBarcode(file: File): Promise<string | null> {
  const w = window as unknown as { BarcodeDetector?: BarcodeDetectorCtor }
  if (!w.BarcodeDetector) return null
  try {
    const bitmap = await createImageBitmap(file)
    const detector = new w.BarcodeDetector()
    const codes = await detector.detect(bitmap)
    return codes[0]?.rawValue ?? null
  } catch {
    return null
  }
}

function PasjesContent() {
  const { cards, isLoading, addCard, removeCard } = useCards()
  const fileRef = useRef<HTMLInputElement>(null)

  const [active, setActive] = useState<Card | null>(null)
  const [addOpen, setAddOpen] = useState(false)
  const [form, setForm] = useState({ name: '', code: '', color: COLORS[0] })
  const [photo, setPhoto] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const openAdd = () => {
    setForm({ name: '', code: '', color: COLORS[0] })
    setPhoto(null)
    setError(null)
    setAddOpen(true)
  }

  const onPickPhoto = async (file: File | undefined) => {
    if (!file) return
    setError(null)
    try {
      const [dataUrl, detected] = await Promise.all([downscale(file), detectBarcode(file)])
      setPhoto(dataUrl)
      if (detected) setForm((f) => ({ ...f, code: detected }))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Kon de foto niet verwerken.')
    }
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!form.name.trim()) return
    if (!form.code.trim() && !photo) {
      setError('Voeg een barcode-nummer of een foto toe.')
      return
    }
    setBusy(true)
    try {
      await addCard({ name: form.name.trim(), code: form.code.trim() || null, imageUrl: photo, color: form.color })
      setAddOpen(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Opslaan mislukt.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => onPickPhoto(e.target.files?.[0])}
      />

      {isLoading && cards.length === 0 ? (
        <p className="text-sm text-slate-400">Laden…</p>
      ) : cards.length === 0 ? (
        <DashboardCard>
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <span className="grid h-14 w-14 place-items-center rounded-2xl bg-sky-100 text-sky-500">
              <CreditCard className="h-7 w-7" strokeWidth={2} />
            </span>
            <p className="max-w-md text-sm text-slate-600">
              Bewaar hier jullie klantenkaarten — bibliotheekpas, Kruidvat-spaarpas en meer. Voeg ze
              toe met een foto of barcode, en het hele gezin heeft ze altijd bij de hand.
            </p>
            <button
              type="button"
              onClick={openAdd}
              className="pill bg-brand px-4 py-2.5 text-white shadow-sm shadow-brand/20 hover:bg-brand-dark"
            >
              <Plus className="h-4 w-4" />
              Pasje toevoegen
            </button>
          </div>
        </DashboardCard>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {cards.map((card) => {
            const logo = brandLogo(card.name)
            return (
              <button
                key={card.id}
                type="button"
                onClick={() => setActive(card)}
                className={`flex h-28 flex-col justify-between rounded-card bg-gradient-to-br ${card.color} p-4 text-left text-white shadow-card transition-transform hover:scale-[1.02]`}
              >
                {logo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={logo} alt="" className="h-8 w-8 rounded-lg bg-white object-contain p-1 shadow-sm" />
                ) : (
                  <CreditCard className="h-6 w-6 opacity-90" strokeWidth={2} />
                )}
                <span className="line-clamp-2 text-sm font-bold leading-tight">{card.name}</span>
              </button>
            )
          })}

          {/* Toevoeg-tegel */}
          <button
            type="button"
            onClick={openAdd}
            className="flex h-28 flex-col items-center justify-center gap-2 rounded-card border-2 border-dashed border-cardborder bg-white text-slate-400 transition-colors hover:border-brand/40 hover:text-brand"
          >
            <Plus className="h-6 w-6" />
            <span className="text-xs font-semibold">Pasje toevoegen</span>
          </button>
        </div>
      )}

      {/* Pasje bekijken (barcode groot, voor de kassa) */}
      <Modal open={!!active} onClose={() => setActive(null)} title={active?.name ?? ''}>
        {active && (
          <div className="flex flex-col gap-4">
            {active.code && (
              <div className="rounded-2xl bg-white p-4 ring-1 ring-cardborder">
                <Barcode value={active.code} format={active.format} className="h-24 w-full" />
                <p className="mt-2 text-center font-mono text-sm tracking-wider text-slate-700">{active.code}</p>
              </div>
            )}
            {active.imageUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={active.imageUrl} alt={active.name} className="w-full rounded-2xl object-contain" />
            )}
            <p className="text-center text-xs text-slate-400">Houd het scherm voor de scanner bij de kassa.</p>
            <button
              type="button"
              onClick={() => {
                removeCard(active.id)
                setActive(null)
              }}
              className="pill justify-center border border-cardborder bg-white px-4 py-2.5 text-rose-500 hover:bg-rose-50"
            >
              <Trash2 className="h-4 w-4" />
              Pasje verwijderen
            </button>
          </div>
        )}
      </Modal>

      {/* Pasje toevoegen */}
      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Pasje toevoegen">
        <form onSubmit={submit} className="flex flex-col gap-3">
          <label className="text-xs font-semibold text-slate-500">
            Naam
            <input
              autoFocus
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Bijv. Bibliotheek of Kruidvat"
              className={`mt-1 ${inputClass}`}
            />
          </label>

          <div>
            <span className="text-xs font-semibold text-slate-500">Foto of barcode</span>
            <div className="mt-1 flex items-center gap-2">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="pill flex-1 justify-center border border-cardborder bg-white px-4 py-2.5 text-slate-700 hover:bg-slate-50"
              >
                {photo ? <Camera className="h-4 w-4 text-brand" /> : <ScanLine className="h-4 w-4" />}
                {photo ? 'Foto gekozen' : 'Foto maken / scannen'}
              </button>
            </div>
            {photo && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={photo} alt="Voorbeeld" className="mt-2 max-h-32 w-full rounded-xl object-contain" />
            )}
          </div>

          <label className="text-xs font-semibold text-slate-500">
            Barcode-/pasnummer
            <input
              inputMode="numeric"
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value })}
              placeholder="Wordt automatisch gevuld na scannen"
              className={`mt-1 ${inputClass}`}
            />
          </label>

          <div className="text-xs font-semibold text-slate-500">
            Kleur
            <div className="mt-1.5 flex flex-wrap gap-2">
              {COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setForm({ ...form, color: c })}
                  aria-label={c}
                  className={`h-8 w-8 rounded-full bg-gradient-to-br ${c} ${
                    form.color === c ? 'ring-2 ring-slate-400 ring-offset-2 dark:ring-offset-slate-800' : ''
                  }`}
                />
              ))}
            </div>
          </div>

          {error && <p className="text-sm font-medium text-rose-600">{error}</p>}

          <button
            type="submit"
            disabled={busy}
            className="pill mt-1 bg-brand px-4 py-2.5 text-white shadow-sm shadow-brand/20 hover:bg-brand-dark disabled:opacity-50"
          >
            {busy ? 'Bezig…' : 'Pasje opslaan'}
          </button>
        </form>
      </Modal>
    </>
  )
}

export default function PasjesPage() {
  return (
    <>
      <PageHeader
        title="Pasjes"
        subtitle="Klantenkaarten, gedeeld met het gezin"
        icon={CreditCard}
        iconClassName="bg-sky-100 text-sky-500"
      />
      <ModuleGate module="pasjes">
        <PasjesContent />
      </ModuleGate>
    </>
  )
}

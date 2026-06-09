'use client'

import { useRef, useState } from 'react'
import { Camera, Upload, Sparkles, Plus, UtensilsCrossed, Check } from 'lucide-react'
import PageHeader from '@/components/PageHeader'
import DashboardCard from '@/components/DashboardCard'
import ModuleGate from '@/components/ModuleGate'
import { apiPost } from '@/lib/api'
import { useShopping } from '@/lib/hooks'

interface Suggestion {
  title: string
  description: string
}

/** Schaal een afbeelding terug naar max 1024px en geef een JPEG data-URL. */
function downscale(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const img = new Image()
      img.onload = () => {
        const max = 1024
        const scale = Math.min(1, max / Math.max(img.width, img.height))
        const canvas = document.createElement('canvas')
        canvas.width = Math.round(img.width * scale)
        canvas.height = Math.round(img.height * scale)
        const ctx = canvas.getContext('2d')
        if (!ctx) return reject(new Error('Canvas niet beschikbaar'))
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
        resolve(canvas.toDataURL('image/jpeg', 0.8))
      }
      img.onerror = () => reject(new Error('Afbeelding kon niet worden geladen'))
      img.src = reader.result as string
    }
    reader.onerror = () => reject(new Error('Bestand kon niet worden gelezen'))
    reader.readAsDataURL(file)
  })
}

export default function KoelkastPage() {
  const { addItem } = useShopping()
  const fileRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [ingredients, setIngredients] = useState<string[]>([])
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [added, setAdded] = useState<Set<string>>(new Set())

  const onPick = async (file: File | undefined) => {
    if (!file) return
    setError(null)
    setIngredients([])
    setSuggestions([])
    setAdded(new Set())
    try {
      setPreview(await downscale(file))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Kon de foto niet verwerken.')
    }
  }

  const analyse = async () => {
    if (!preview) return
    setBusy(true)
    setError(null)
    try {
      const res = (await apiPost('/api/fridge/scan', { image: preview })) as {
        ingredients: string[]
        suggestions: Suggestion[]
      }
      setIngredients(res.ingredients ?? [])
      setSuggestions(res.suggestions ?? [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Analyse mislukt.')
    } finally {
      setBusy(false)
    }
  }

  const addToShopping = (label: string) => {
    addItem(label)
    setAdded((prev) => new Set(prev).add(label))
  }

  return (
    <>
      <PageHeader
        title="Koelkast-scan"
        subtitle="Maak een foto, wij checken wat je kunt koken"
        icon={Camera}
        iconClassName="bg-sky-100 text-sky-500"
      />

      <ModuleGate module="koelkast">
      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-2">
        {/* Upload + preview */}
        <DashboardCard>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => onPick(e.target.files?.[0])}
          />

          {preview ? (
            <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-slate-100">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={preview} alt="Voorbeeld" className="h-full w-full object-cover" />
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="flex aspect-[4/3] w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-cardborder bg-slate-50 text-slate-400 transition-colors hover:border-brand/40 hover:text-brand"
            >
              <Camera className="h-8 w-8" />
              <span className="text-sm font-semibold">Foto maken of kiezen</span>
            </button>
          )}

          <div className="mt-4 flex flex-wrap gap-2.5">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="pill border border-cardborder bg-white px-4 py-2.5 text-slate-700 hover:bg-slate-50"
            >
              <Upload className="h-4 w-4" />
              {preview ? 'Andere foto' : 'Foto kiezen'}
            </button>
            <button
              type="button"
              onClick={analyse}
              disabled={!preview || busy}
              className="pill bg-violet-500 px-4 py-2.5 text-white shadow-sm shadow-violet-500/30 hover:bg-violet-600 disabled:opacity-50"
            >
              <Sparkles className="h-4 w-4" />
              {busy ? 'Bezig met kijken…' : 'Analyseer'}
            </button>
          </div>

          {error && <p className="mt-3 text-sm font-medium text-rose-600">{error}</p>}
        </DashboardCard>

        {/* Results */}
        <div className="flex flex-col gap-5">
          {ingredients.length > 0 && (
            <DashboardCard title="Wat we zien">
              <div className="flex flex-wrap gap-2">
                {ingredients.map((ing) => (
                  <button
                    key={ing}
                    type="button"
                    onClick={() => addToShopping(ing)}
                    disabled={added.has(ing)}
                    className={[
                      'pill border px-3 py-1.5 text-sm',
                      added.has(ing)
                        ? 'border-brand/30 bg-brand-light text-brand'
                        : 'border-cardborder bg-white text-slate-600 hover:border-brand/40 hover:text-brand',
                    ].join(' ')}
                  >
                    {added.has(ing) ? <Check className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
                    {ing}
                  </button>
                ))}
              </div>
              <p className="mt-3 text-xs text-slate-400">Tik een product om het op je boodschappenlijst te zetten.</p>
            </DashboardCard>
          )}

          {suggestions.length > 0 && (
            <DashboardCard title="Wat je kunt koken" icon={UtensilsCrossed}>
              <ul className="flex flex-col">
                {suggestions.map((s, i) => (
                  <li key={s.title}>
                    <div className="py-3">
                      <p className="text-sm font-semibold text-slate-800">{s.title}</p>
                      <p className="text-sm text-slate-500">{s.description}</p>
                    </div>
                    {i < suggestions.length - 1 && <hr className="border-cardborder" />}
                  </li>
                ))}
              </ul>
            </DashboardCard>
          )}

          {ingredients.length === 0 && suggestions.length === 0 && !busy && (
            <DashboardCard bg="bg-ai/60" bordered={false}>
              <p className="text-sm text-slate-600">
                Maak een foto van je koelkast of voorraadkast en tik op <strong>Analyseer</strong>.
                De AI herkent je ingrediënten en stelt voor wat je ermee kunt koken.
              </p>
            </DashboardCard>
          )}
        </div>
      </div>
      </ModuleGate>
    </>
  )
}

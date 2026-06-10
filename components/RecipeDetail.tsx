'use client'

import { useState } from 'react'
import { Clock, Users, ShoppingCart, Check, Heart } from 'lucide-react'
import Modal from './Modal'
import { useShopping } from '@/lib/hooks'
import type { Recipe } from '@/lib/types'

/** Staat dit ingrediënt al op de boodschappenlijst? (losse, slimme match) */
function matchOnList(name: string, labels: string[]): boolean {
  const n = name.toLowerCase().trim()
  if (!n) return false
  return labels.some((l) => {
    const x = l.toLowerCase().trim()
    return x === n || x.includes(n) || n.includes(x)
  })
}

export default function RecipeDetail({ recipe, onClose }: { recipe: Recipe | null; onClose: () => void }) {
  const { items, addItem } = useShopping()
  // Welke ingrediënten heb je al in huis (index-set).
  const [have, setHave] = useState<Set<number>>(new Set())
  const [added, setAdded] = useState(false)

  if (!recipe) return null

  const labels = items.map((i) => i.label)
  const ingredients = recipe.ingredients ?? []
  const steps = recipe.steps ?? []

  const toggle = (i: number) =>
    setHave((prev) => {
      const next = new Set(prev)
      if (next.has(i)) next.delete(i)
      else next.add(i)
      return next
    })

  // Ontbrekend = niet "in huis" én nog niet op de lijst.
  const missing = ingredients.filter((ing, i) => !have.has(i) && !matchOnList(ing.name, labels))

  const addMissing = async () => {
    for (const ing of missing) {
      await addItem(ing.name, 'Overig', ing.amount || undefined)
    }
    setAdded(true)
    setTimeout(() => setAdded(false), 1800)
  }

  return (
    <Modal open={!!recipe} onClose={onClose} title={recipe.title}>
      <div className="flex flex-col gap-4">
        {recipe.image && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={recipe.image} alt={recipe.title} className="h-40 w-full rounded-2xl object-cover" />
        )}

        <div className="flex flex-wrap items-center gap-3 text-sm text-slate-500">
          {recipe.time && (
            <span className="inline-flex items-center gap-1.5">
              <Clock className="h-4 w-4" /> {recipe.time}
            </span>
          )}
          {recipe.servings && (
            <span className="inline-flex items-center gap-1.5">
              <Users className="h-4 w-4" /> {recipe.servings}
            </span>
          )}
          {recipe.favorite && (
            <span className="inline-flex items-center gap-1 text-rose-500">
              <Heart className="h-4 w-4 fill-rose-500" /> Favoriet
            </span>
          )}
        </div>

        {recipe.description && <p className="text-sm text-slate-600">{recipe.description}</p>}

        {/* Ingrediënten + "heb ik dit in huis?" */}
        {ingredients.length > 0 && (
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-800">Ingrediënten</h3>
              <span className="text-[11px] text-slate-400">vink aan wat je in huis hebt</span>
            </div>
            <ul className="flex flex-col rounded-2xl bg-slate-50 p-1.5">
              {ingredients.map((ing, i) => {
                const onList = matchOnList(ing.name, labels)
                const checked = have.has(i)
                return (
                  <li key={i}>
                    <button
                      type="button"
                      onClick={() => toggle(i)}
                      className="flex w-full items-center gap-2.5 rounded-xl px-2 py-2 text-left hover:bg-white"
                    >
                      <span
                        className={`grid h-5 w-5 shrink-0 place-items-center rounded-md border transition-colors ${
                          checked ? 'border-brand bg-brand text-white' : 'border-slate-300 bg-white'
                        }`}
                      >
                        {checked && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
                      </span>
                      <span className={`min-w-0 flex-1 text-sm ${checked ? 'text-slate-400 line-through' : 'text-slate-700'}`}>
                        <span className="font-medium">{ing.name}</span>
                        {ing.amount && <span className="text-slate-400"> · {ing.amount}</span>}
                      </span>
                      {onList && !checked && (
                        <span className="shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-600">
                          op lijst
                        </span>
                      )}
                    </button>
                  </li>
                )
              })}
            </ul>

            <button
              type="button"
              onClick={addMissing}
              disabled={missing.length === 0}
              className="pill mt-2.5 w-full justify-center bg-brand px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-brand/20 hover:bg-brand-dark disabled:opacity-50"
            >
              {added ? (
                <>
                  <Check className="h-4 w-4" /> Toegevoegd aan boodschappen
                </>
              ) : missing.length === 0 ? (
                'Je hebt alles in huis'
              ) : (
                <>
                  <ShoppingCart className="h-4 w-4" />
                  {missing.length} ontbrekende naar boodschappenlijst
                </>
              )}
            </button>
          </div>
        )}

        {/* Bereiding */}
        {steps.length > 0 && (
          <div>
            <h3 className="mb-1.5 text-sm font-bold text-slate-800">Bereiding</h3>
            <ol className="flex flex-col gap-2.5">
              {steps.map((step, i) => (
                <li key={i} className="flex gap-3 text-sm text-slate-700">
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-brand-light text-xs font-bold text-brand">
                    {i + 1}
                  </span>
                  <span className="pt-0.5">{step}</span>
                </li>
              ))}
            </ol>
          </div>
        )}

        {ingredients.length === 0 && steps.length === 0 && (
          <p className="text-sm text-slate-400">
            Voor dit recept zijn nog geen ingrediënten of stappen ingevuld. Laat een nieuw recept met AI
            genereren voor een volledige uitwerking.
          </p>
        )}
      </div>
    </Modal>
  )
}

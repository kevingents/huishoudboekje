'use client'

import { useMemo, useState } from 'react'
import { ChefHat, Clock, Users, Heart, Plus } from 'lucide-react'
import PageHeader from '@/components/PageHeader'
import { recipes } from '@/lib/mockData'

export default function ReceptenPage() {
  const [favorites, setFavorites] = useState<Set<number>>(
    () => new Set(recipes.filter((recipe) => recipe.favorite).map((recipe) => recipe.id)),
  )
  const [activeTag, setActiveTag] = useState<string>('Alles')

  const tags = useMemo(() => {
    const all = new Set<string>()
    recipes.forEach((recipe) => recipe.tags.forEach((tag) => all.add(tag)))
    return ['Alles', ...all]
  }, [])

  const visible = useMemo(
    () => (activeTag === 'Alles' ? recipes : recipes.filter((recipe) => recipe.tags.includes(activeTag))),
    [activeTag],
  )

  const toggleFavorite = (id: number) =>
    setFavorites((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })

  return (
    <>
      <PageHeader
        title="Recepten"
        subtitle="Inspiratie voor elke dag"
        icon={ChefHat}
        iconClassName="bg-amber-100 text-amber-500"
        actions={
          <button
            type="button"
            className="pill bg-brand px-4 py-2.5 text-white shadow-sm shadow-brand/20 hover:bg-brand-dark"
          >
            <Plus className="h-4 w-4" />
            Nieuw recept
          </button>
        }
      />

      {/* Tag filter */}
      <div className="mb-6 flex flex-wrap gap-2.5">
        {tags.map((tag) => (
          <button
            key={tag}
            type="button"
            onClick={() => setActiveTag(tag)}
            className={[
              'pill px-4 py-2 text-sm',
              activeTag === tag
                ? 'bg-brand text-white shadow-sm shadow-brand/20'
                : 'border border-cardborder bg-white text-slate-600 hover:bg-slate-50',
            ].join(' ')}
          >
            {tag}
          </button>
        ))}
      </div>

      {/* Recipe grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {visible.map((recipe) => {
          const isFavorite = favorites.has(recipe.id)
          return (
            <article
              key={recipe.id}
              className="group flex flex-col overflow-hidden rounded-card border border-cardborder bg-white shadow-card transition-all duration-200 hover:shadow-soft"
            >
              <div className="relative aspect-[16/10] overflow-hidden bg-gradient-to-br from-emerald-100 to-amber-100">
                <img
                  src={recipe.image}
                  alt={recipe.title}
                  loading="lazy"
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
                <button
                  type="button"
                  onClick={() => toggleFavorite(recipe.id)}
                  aria-label={isFavorite ? 'Verwijder uit favorieten' : 'Voeg toe aan favorieten'}
                  aria-pressed={isFavorite}
                  className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-white/90 backdrop-blur transition-transform hover:scale-105"
                >
                  <Heart
                    className={isFavorite ? 'h-5 w-5 fill-rose-500 text-rose-500' : 'h-5 w-5 text-slate-400'}
                    strokeWidth={2.2}
                  />
                </button>
              </div>

              <div className="flex flex-1 flex-col p-5">
                <h3 className="text-base font-bold text-slate-800">{recipe.title}</h3>
                <p className="mt-1 flex-1 text-sm text-slate-500">{recipe.description}</p>

                <div className="mt-3 flex items-center gap-4 text-sm text-slate-500">
                  <span className="inline-flex items-center gap-1.5">
                    <Clock className="h-4 w-4" /> {recipe.time}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Users className="h-4 w-4" /> {recipe.servings}
                  </span>
                </div>

                <div className="mt-3 flex flex-wrap gap-1.5">
                  {recipe.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </article>
          )
        })}
      </div>
    </>
  )
}

'use client'

import { useMemo, useState } from 'react'
import { ChefHat, Clock, Users, Heart, Plus, Trash2 } from 'lucide-react'
import PageHeader from '@/components/PageHeader'
import Modal from '@/components/Modal'
import { useRecipes } from '@/lib/hooks'

const inputClass =
  'w-full rounded-xl border border-cardborder bg-white px-3.5 py-2.5 text-sm text-slate-700 outline-none transition-colors placeholder:text-slate-400 focus:border-brand/40 focus:ring-2 focus:ring-brand/20'

export default function ReceptenPage() {
  const { recipes, isLoading, addRecipe, toggleFavorite, removeRecipe } = useRecipes()
  const [activeTag, setActiveTag] = useState('Alles')
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ title: '', description: '', time: '', servings: '', tags: '', image: '' })

  const tags = useMemo(() => {
    const all = new Set<string>()
    recipes.forEach((recipe) => recipe.tags.forEach((tag) => all.add(tag)))
    return ['Alles', ...all]
  }, [recipes])

  const visible = useMemo(
    () => (activeTag === 'Alles' ? recipes : recipes.filter((r) => r.tags.includes(activeTag))),
    [activeTag, recipes],
  )

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title.trim()) return
    await addRecipe({
      title: form.title,
      description: form.description,
      time: form.time,
      servings: form.servings,
      tags: form.tags.split(',').map((t) => t.trim()).filter(Boolean),
      image: form.image || undefined,
    })
    setForm({ title: '', description: '', time: '', servings: '', tags: '', image: '' })
    setOpen(false)
  }

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
            onClick={() => setOpen(true)}
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

      {isLoading && recipes.length === 0 ? (
        <p className="text-sm text-slate-400">Laden…</p>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((recipe) => (
            <article
              key={recipe.id}
              className="group flex flex-col overflow-hidden rounded-card border border-cardborder bg-white shadow-card transition-all duration-200 hover:shadow-soft"
            >
              <div className="relative aspect-[16/10] overflow-hidden bg-gradient-to-br from-emerald-100 to-amber-100">
                {recipe.image && (
                  <img
                    src={recipe.image}
                    alt={recipe.title}
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                )}
                <button
                  type="button"
                  onClick={() => toggleFavorite(recipe)}
                  aria-label={recipe.favorite ? 'Verwijder uit favorieten' : 'Voeg toe aan favorieten'}
                  aria-pressed={recipe.favorite}
                  className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-white/90 backdrop-blur transition-transform hover:scale-105"
                >
                  <Heart
                    className={recipe.favorite ? 'h-5 w-5 fill-rose-500 text-rose-500' : 'h-5 w-5 text-slate-400'}
                    strokeWidth={2.2}
                  />
                </button>
                <button
                  type="button"
                  onClick={() => removeRecipe(recipe.id)}
                  aria-label={`${recipe.title} verwijderen`}
                  className="absolute left-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-white/90 text-slate-400 opacity-0 backdrop-blur transition-all hover:text-rose-500 group-hover:opacity-100"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              <div className="flex flex-1 flex-col p-5">
                <h3 className="text-base font-bold text-slate-800">{recipe.title}</h3>
                <p className="mt-1 flex-1 text-sm text-slate-500">{recipe.description}</p>

                <div className="mt-3 flex items-center gap-4 text-sm text-slate-500">
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
                </div>

                {recipe.tags.length > 0 && (
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
                )}
              </div>
            </article>
          ))}
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="Nieuw recept">
        <form onSubmit={submit} className="flex flex-col gap-3">
          <label className="text-xs font-semibold text-slate-500">
            Titel
            <input
              autoFocus
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Bijv. Romige tomatensoep"
              className={`mt-1 ${inputClass}`}
            />
          </label>
          <label className="text-xs font-semibold text-slate-500">
            Omschrijving
            <input
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className={`mt-1 ${inputClass}`}
            />
          </label>
          <div className="flex gap-3">
            <label className="flex-1 text-xs font-semibold text-slate-500">
              Bereidingstijd
              <input
                value={form.time}
                onChange={(e) => setForm({ ...form, time: e.target.value })}
                placeholder="30 min"
                className={`mt-1 ${inputClass}`}
              />
            </label>
            <label className="flex-1 text-xs font-semibold text-slate-500">
              Porties
              <input
                value={form.servings}
                onChange={(e) => setForm({ ...form, servings: e.target.value })}
                placeholder="4 personen"
                className={`mt-1 ${inputClass}`}
              />
            </label>
          </div>
          <label className="text-xs font-semibold text-slate-500">
            Tags (komma-gescheiden)
            <input
              value={form.tags}
              onChange={(e) => setForm({ ...form, tags: e.target.value })}
              placeholder="Snel, Vegetarisch"
              className={`mt-1 ${inputClass}`}
            />
          </label>
          <label className="text-xs font-semibold text-slate-500">
            Afbeelding-URL (optioneel)
            <input
              value={form.image}
              onChange={(e) => setForm({ ...form, image: e.target.value })}
              placeholder="https://…"
              className={`mt-1 ${inputClass}`}
            />
          </label>
          <button
            type="submit"
            className="pill mt-2 bg-brand px-4 py-2.5 text-white shadow-sm shadow-brand/20 hover:bg-brand-dark"
          >
            Recept opslaan
          </button>
        </form>
      </Modal>
    </>
  )
}

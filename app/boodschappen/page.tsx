'use client'

import { useMemo, useState } from 'react'
import { ShoppingCart, Plus, Check, Trash2 } from 'lucide-react'
import PageHeader from '@/components/PageHeader'
import DashboardCard from '@/components/DashboardCard'
import { useShopping } from '@/lib/hooks'
import type { ShoppingItem } from '@/lib/types'

export default function BoodschappenPage() {
  const { items, isLoading, addItem, toggleItem, removeItem, clearChecked } = useShopping()
  const [draft, setDraft] = useState('')

  const checkedCount = items.filter((item) => item.checked).length
  const progress = items.length ? Math.round((checkedCount / items.length) * 100) : 0

  const grouped = useMemo(() => {
    const groups = new Map<string, ShoppingItem[]>()
    for (const item of items) {
      const list = groups.get(item.category) ?? []
      list.push(item)
      groups.set(item.category, list)
    }
    return [...groups.entries()]
  }, [items])

  const add = () => {
    const label = draft.trim()
    if (!label) return
    addItem(label)
    setDraft('')
  }

  return (
    <>
      <PageHeader
        title="Boodschappen"
        subtitle={`${checkedCount} van ${items.length} afgevinkt`}
        icon={ShoppingCart}
        actions={
          checkedCount > 0 ? (
            <button
              type="button"
              onClick={clearChecked}
              className="pill border border-cardborder bg-white px-4 py-2.5 text-slate-600 hover:bg-slate-50"
            >
              <Trash2 className="h-4 w-4" />
              Afgevinkte wissen
            </button>
          ) : undefined
        }
      />

      {/* Progress + add */}
      <DashboardCard className="mb-5">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-slate-700">Voortgang</p>
          <p className="text-sm font-bold text-brand">{progress}%</p>
        </div>
        <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-brand transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>

        <form
          onSubmit={(event) => {
            event.preventDefault()
            add()
          }}
          className="mt-5 flex gap-2"
        >
          <input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Voeg een product toe…"
            className="flex-1 rounded-full border border-cardborder bg-white px-4 py-2.5 text-sm text-slate-700 outline-none transition-colors placeholder:text-slate-400 focus:border-brand/40 focus:ring-2 focus:ring-brand/20"
          />
          <button
            type="submit"
            className="pill bg-brand px-4 py-2.5 text-white shadow-sm shadow-brand/20 hover:bg-brand-dark"
          >
            <Plus className="h-4 w-4" />
            Toevoegen
          </button>
        </form>
      </DashboardCard>

      {/* Grouped list */}
      {isLoading && items.length === 0 ? (
        <p className="text-sm text-slate-400">Laden…</p>
      ) : (
        <div className="flex flex-col gap-5">
          {grouped.map(([category, categoryItems]) => (
            <DashboardCard key={category} title={category}>
              <ul className="flex flex-col gap-1">
                {categoryItems.map((item) => (
                  <li
                    key={item.id}
                    className="group flex items-center gap-3 rounded-2xl px-2 py-2.5 transition-colors hover:bg-slate-50"
                  >
                    <button
                      type="button"
                      onClick={() => toggleItem(item)}
                      aria-pressed={item.checked}
                      className={[
                        'grid h-6 w-6 shrink-0 place-items-center rounded-md border transition-colors',
                        item.checked
                          ? 'border-brand bg-brand text-white'
                          : 'border-slate-300 bg-white hover:border-brand/50',
                      ].join(' ')}
                    >
                      {item.checked && <Check className="h-4 w-4" strokeWidth={3} />}
                    </button>

                    <span className="min-w-0 flex-1">
                      <span
                        className={[
                          'block text-sm font-medium',
                          item.checked ? 'text-slate-400 line-through' : 'text-slate-800',
                        ].join(' ')}
                      >
                        {item.label}
                      </span>
                      {item.qty && <span className="block text-xs text-slate-400">{item.qty}</span>}
                    </span>

                    <button
                      type="button"
                      onClick={() => removeItem(item.id)}
                      aria-label={`${item.label} verwijderen`}
                      className="grid h-8 w-8 place-items-center rounded-full text-slate-300 opacity-0 transition-all hover:bg-rose-50 hover:text-rose-500 group-hover:opacity-100"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ul>
            </DashboardCard>
          ))}
        </div>
      )}
    </>
  )
}

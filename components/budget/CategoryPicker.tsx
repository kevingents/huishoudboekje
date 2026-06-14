'use client'

import { useEffect, useRef, useState } from 'react'
import { ChevronDown, Plus, Check, Tag } from 'lucide-react'

/** Nette categorie-kiezer: typ om te zoeken/filteren, kies een bestaande categorie,
 *  of maak er expliciet een nieuwe aan. Eigen dropdown (geen lelijke <datalist>),
 *  werkt op mobiel én desktop en is dark-mode-safe. */
export default function CategoryPicker({
  value,
  onChange,
  categories,
  placeholder = 'Kies of typ een categorie',
}: {
  value: string
  onChange: (value: string) => void
  categories: string[]
  placeholder?: string
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  const q = value.trim().toLowerCase()
  const filtered = q ? categories.filter((c) => c.toLowerCase().includes(q)) : categories
  const exactExists = categories.some((c) => c.toLowerCase() === q)
  const canCreate = q.length > 0 && !exactExists

  const pick = (name: string) => {
    onChange(name)
    setOpen(false)
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && open) {
      // Voorkom dat Enter het hele formulier verstuurt; kies de eerste match of maak nieuw.
      e.preventDefault()
      if (filtered.length) pick(filtered[0])
      else if (canCreate) pick(value.trim())
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  return (
    <div className="relative" ref={ref}>
      <div className="relative">
        <input
          value={value}
          onChange={(e) => {
            onChange(e.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          className="w-full rounded-xl border border-cardborder bg-white px-3.5 py-2.5 pr-10 text-sm text-slate-700 outline-none transition-colors placeholder:text-slate-400 focus:border-brand/40 focus:ring-2 focus:ring-brand/20 dark:bg-slate-900 dark:text-slate-100"
        />
        <button
          type="button"
          tabIndex={-1}
          aria-label="Categorieën tonen"
          onClick={() => setOpen((o) => !o)}
          className="absolute inset-y-0 right-0 grid w-10 place-items-center text-slate-400 hover:text-slate-600"
        >
          <ChevronDown className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {open && (filtered.length > 0 || canCreate) && (
        <div className="absolute z-30 mt-1 max-h-60 w-full overflow-y-auto rounded-xl border border-cardborder bg-white p-1.5 shadow-lg dark:bg-slate-800">
          {filtered.map((c) => {
            const selected = c.toLowerCase() === q
            return (
              <button
                key={c}
                type="button"
                onClick={() => pick(c)}
                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-white/5"
              >
                <Tag className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                <span className="min-w-0 flex-1 truncate">{c}</span>
                {selected && <Check className="h-3.5 w-3.5 shrink-0 text-brand" />}
              </button>
            )
          })}
          {canCreate && (
            <button
              type="button"
              onClick={() => pick(value.trim())}
              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm font-semibold text-brand hover:bg-brand-light"
            >
              <Plus className="h-3.5 w-3.5 shrink-0" />
              <span className="min-w-0 flex-1 truncate">Nieuwe categorie: “{value.trim()}”</span>
            </button>
          )}
        </div>
      )}
    </div>
  )
}

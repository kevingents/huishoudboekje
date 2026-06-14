'use client'

import { useEffect, useRef, useState } from 'react'
import { PiggyBank, Check } from 'lucide-react'
import type { FamilyBudget } from '@/lib/types'

/** Knop bij een uitgave om hem op een gezinspotje te boeken (bijv. na importeren
 *  of een gescande factuur). Je typt erbij WAT je gekocht hebt (voorgevuld met de
 *  winkelnaam, maar pas het aan naar bijv. "Gezichtscreme" voor persoonlijk
 *  inzicht), en kiest een potje. */
export default function BookToPotje({
  budgets,
  amount,
  defaultLabel,
  onBook,
}: {
  budgets: FamilyBudget[]
  amount: number
  /** Voorgevulde omschrijving (meestal de winkelnaam) — gebruiker kan het aanpassen. */
  defaultLabel: string
  onBook: (budget: FamilyBudget, label: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [booked, setBooked] = useState<string | null>(null)
  const [desc, setDesc] = useState(defaultLabel)
  const ref = useRef<HTMLDivElement>(null)

  // Reset de omschrijving als dit een andere transactie betreft.
  useEffect(() => setDesc(defaultLabel), [defaultLabel])

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  if (budgets.length === 0) return null

  if (booked) {
    return (
      <span className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
        <Check className="h-3.5 w-3.5" />
        Op {booked}
      </span>
    )
  }

  return (
    <div className="relative shrink-0" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        title="Boek op een potje"
        aria-label="Boek op een potje"
        className="grid h-11 w-11 place-items-center rounded-full text-slate-300 transition-colors hover:bg-brand-light hover:text-brand sm:h-8 sm:w-8"
      >
        <PiggyBank className="h-4 w-4" />
      </button>
      {open && (
        <div className="absolute right-0 z-20 mt-1 w-64 rounded-xl border border-cardborder bg-white p-2 shadow-lg dark:bg-slate-800">
          <p className="px-1 pb-1 text-[11px] font-semibold text-slate-400">Boek €{Math.round(amount)} op een potje</p>
          <input
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            placeholder="Wat heb je gekocht? (bijv. Gezichtscreme)"
            className="mb-1.5 w-full rounded-lg border border-cardborder bg-white px-2.5 py-1.5 text-xs text-slate-700 outline-none placeholder:text-slate-400 focus:border-brand/40 focus:ring-2 focus:ring-brand/20 dark:bg-slate-900 dark:text-slate-100"
          />
          {budgets.map((b) => (
            <button
              key={b.id}
              type="button"
              onClick={() => {
                onBook(b, desc.trim() || defaultLabel)
                setBooked(b.name)
                setOpen(false)
              }}
              className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-white/5"
            >
              <span className="min-w-0 flex-1 truncate">
                {b.name}
                {b.member ? <span className="text-slate-400"> · {b.member}</span> : ''}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

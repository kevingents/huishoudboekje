'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { Calendar, ShoppingCart, ListTodo, Receipt, X, ChevronRight } from 'lucide-react'

const actions = [
  {
    label: 'Uitgave toevoegen',
    desc: 'Boek een uitgave in je budget',
    href: '/budget?nieuw=1',
    icon: Receipt,
    accent: 'bg-amber-100 text-amber-600',
  },
  {
    label: 'Taak toevoegen',
    desc: 'Wijs een klusje toe en verdien punten',
    href: '/taken?nieuw=1',
    icon: ListTodo,
    accent: 'bg-violet-100 text-violet-600',
  },
  {
    label: 'Afspraak toevoegen',
    desc: 'Zet een afspraak in de gezinsagenda',
    href: '/agenda?nieuw=1',
    icon: Calendar,
    accent: 'bg-sky-100 text-sky-600',
  },
  {
    label: 'Boodschap toevoegen',
    desc: 'Voeg iets toe aan de boodschappenlijst',
    href: '/boodschappen?nieuw=1',
    icon: ShoppingCart,
    accent: 'bg-emerald-100 text-emerald-600',
  },
]

/** Snelmenu achter de centrale "+"-knop op mobiel. */
export default function QuickAddMenu({ open, onClose }: { open: boolean; onClose: () => void }) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[60] lg:hidden" role="dialog" aria-modal="true" aria-label="Toevoegen">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className="absolute inset-x-0 bottom-0 rounded-t-3xl bg-white p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-soft">
        <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-slate-200" />
        <p className="mb-3 text-base font-extrabold text-slate-800">Toevoegen</p>

        <div className="flex flex-col gap-2">
          {actions.map((a) => {
            const Icon = a.icon
            return (
              <Link
                key={a.href}
                href={a.href}
                onClick={onClose}
                className="flex items-center gap-3 rounded-2xl border border-cardborder bg-white p-3 transition-colors hover:bg-slate-50"
              >
                <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl ${a.accent}`}>
                  <Icon className="h-5 w-5" strokeWidth={2.1} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-bold text-slate-800">{a.label}</span>
                  <span className="block text-xs text-slate-500">{a.desc}</span>
                </span>
                <ChevronRight className="h-4 w-4 shrink-0 text-slate-300" />
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}

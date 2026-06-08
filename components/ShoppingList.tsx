'use client'

import { useState } from 'react'
import { Check, ShoppingCart, ArrowRight } from 'lucide-react'
import DashboardCard from './DashboardCard'
import { shoppingList } from '@/lib/mockData'

export default function ShoppingList({ className = '' }: { className?: string }) {
  const [items, setItems] = useState(shoppingList)

  const toggle = (id: number) =>
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, checked: !item.checked } : item)),
    )

  return (
    <DashboardCard title="Boodschappenlijstje" icon={ShoppingCart} className={className}>
      <div className="flex flex-wrap items-center gap-2.5">
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => toggle(item.id)}
            className={[
              'pill border px-3.5 py-2',
              item.checked
                ? 'border-brand/30 bg-brand-light text-brand'
                : 'border-cardborder bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50',
            ].join(' ')}
          >
            <span
              className={[
                'grid h-5 w-5 place-items-center rounded-md border transition-colors',
                item.checked ? 'border-brand bg-brand text-white' : 'border-slate-300 bg-white',
              ].join(' ')}
            >
              {item.checked && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
            </span>
            {item.label}
          </button>
        ))}

        <button
          type="button"
          className="pill ml-auto bg-brand px-4 py-2.5 text-white shadow-sm shadow-brand/20 hover:bg-brand-dark"
        >
          Naar boodschappen
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </DashboardCard>
  )
}

'use client'

import { ScanSearch, Sparkles, CheckCircle2, GraduationCap } from 'lucide-react'
import DashboardCard from '../DashboardCard'

const STEPS = [
  { icon: ScanSearch, title: 'Herkennen', text: 'We herkennen de transactie uit je bestand of afschrift.' },
  { icon: Sparkles, title: 'Voorstellen', text: 'We stellen de beste categorie voor.' },
  { icon: CheckCircle2, title: 'Controleren', text: 'Jij bevestigt of past aan waar nodig.' },
  { icon: GraduationCap, title: 'Leren', text: 'Het systeem onthoudt je keuze voor de volgende keer.' },
] as const

/** Uitleg-kaart: hoe Fam transacties automatisch herkent en categoriseert. */
export default function AutoCategorizeSteps() {
  return (
    <DashboardCard
      title="Slimme automatische categorisatie"
      icon={Sparkles}
      iconClassName="text-violet-500"
      className="lg:col-span-2"
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {STEPS.map((s, i) => (
          <div key={s.title} className="flex items-start gap-3 rounded-2xl bg-slate-50 p-3 dark:bg-white/5">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand/15 text-brand">
              <s.icon className="h-4 w-4" strokeWidth={2.2} />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-bold text-slate-800 dark:text-slate-100">
                {i + 1}. {s.title}
              </p>
              <p className="text-xs text-slate-500">{s.text}</p>
            </div>
          </div>
        ))}
      </div>
    </DashboardCard>
  )
}

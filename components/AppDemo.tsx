'use client'

import { useEffect, useState } from 'react'
import { ListTodo, Plus, Check, Star, ShoppingCart, Wallet, Receipt, MousePointer2 } from 'lucide-react'

/**
 * Geanimeerde product-demo: een telefoon-mockup waarin een cursor zichtbaar
 * dingen dóét — een taak toevoegen, boodschappen afvinken en een uitgave invoeren
 * waardoor het dagbudget zakt. De timing loopt via een eenvoudige stappen-teller;
 * de micro-animaties (opkomend item, formulier, tik-rimpel) staan in globals.css.
 * Respecteert prefers-reduced-motion en de in-app "minder beweging"-toggle: dan
 * bevriest de demo op een representatief beeld.
 */

type Frame = {
  scene: 'taken' | 'bood' | 'budget'
  tasks?: number
  form?: boolean
  title?: string
  checked?: number
  spent?: boolean
  cx: number
  cy: number
  tap?: boolean
}

const SCRIPT: Frame[] = [
  // Taken — voeg een klusje toe
  { scene: 'taken', tasks: 2, form: false, title: '', cx: 198, cy: 52, tap: false },
  { scene: 'taken', tasks: 2, form: false, title: '', cx: 198, cy: 52, tap: true },
  { scene: 'taken', tasks: 2, form: true, title: '', cx: 70, cy: 408, tap: false },
  { scene: 'taken', tasks: 2, form: true, title: 'Tafel afruimen', cx: 120, cy: 476, tap: true },
  { scene: 'taken', tasks: 3, form: false, title: '', cx: 120, cy: 126, tap: false },
  // Boodschappen — samen afvinken
  { scene: 'bood', checked: 1, cx: 30, cy: 176, tap: true },
  { scene: 'bood', checked: 2, cx: 30, cy: 222, tap: true },
  { scene: 'bood', checked: 3, cx: 30, cy: 268, tap: false },
  // Budget — uitgave erbij, te besteden zakt
  { scene: 'budget', spent: false, cx: 198, cy: 52, tap: true },
  { scene: 'budget', spent: true, cx: 120, cy: 250, tap: false },
]

const FREEZE_STEP = 4 // taken-scherm met de nieuwe taak erin
const STEP_MS = 1350

const CAPTIONS = [
  { key: 'taken', t: 'Taken toevoegen en verdelen', d: 'Wijs een klusje toe — diegene krijgt meteen een melding.' },
  { key: 'bood', t: 'Samen boodschappen afvinken', d: 'Wat de één toevoegt, vinkt de ander af in de winkel.' },
  { key: 'budget', t: 'Budget moeiteloos bijhouden', d: 'Elke uitgave erbij en je ziet direct wat je nog kunt besteden.' },
] as const

function TaskRow({ name, who, color, points, isNew }: { name: string; who: string; color: string; points?: number; isNew?: boolean }) {
  return (
    <div className={`flex items-center gap-2 rounded-2xl bg-white p-2 shadow-card ${isNew ? 'demo-pop ring-1 ring-brand/50' : ''}`}>
      <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full bg-gradient-to-br text-[10px] font-bold text-white ${color}`}>
        {who.charAt(0)}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-bold text-slate-800">{name}</p>
        <p className="text-[10px] text-slate-500">voor {who}</p>
      </div>
      {points ? (
        <span className="flex shrink-0 items-center gap-0.5 text-[10px] font-bold text-amber-500">
          <Star className="h-3 w-3" /> {points}
        </span>
      ) : null}
    </div>
  )
}

function BoodRow({ label, done }: { label: string; done: boolean }) {
  return (
    <div className="flex items-center gap-2.5 rounded-2xl bg-white p-2.5 shadow-card">
      <span
        className={`grid h-5 w-5 shrink-0 place-items-center rounded-md border transition-colors duration-300 ${
          done ? 'border-brand bg-brand text-white' : 'border-slate-300 bg-white'
        }`}
      >
        {done && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
      </span>
      <p className={`text-xs font-semibold transition-colors duration-300 ${done ? 'text-slate-400 line-through' : 'text-slate-800'}`}>
        {label}
      </p>
    </div>
  )
}

function ScreenHeader({ icon: Icon, tone, title, action }: { icon: typeof ListTodo; tone: string; title: string; action?: string }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-1.5">
        <span className={`grid h-7 w-7 place-items-center rounded-lg ${tone}`}>
          <Icon className="h-4 w-4" strokeWidth={2.2} />
        </span>
        <h4 className="text-sm font-extrabold text-slate-800">{title}</h4>
      </div>
      {action && (
        <span className="pill bg-brand px-2.5 py-1 text-[11px] font-semibold text-white">
          <Plus className="h-3 w-3" />
          {action}
        </span>
      )}
    </div>
  )
}

const BOOD_ITEMS = ['Melk', 'Volkoren brood', 'Appels', 'Yoghurt']

export default function AppDemo() {
  const [step, setStep] = useState(0)
  const [reduced, setReduced] = useState(false)

  useEffect(() => {
    const rm =
      (typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) ||
      document.documentElement.classList.contains('reduce-motion')
    if (rm) {
      setReduced(true)
      setStep(FREEZE_STEP)
      return
    }
    const id = setInterval(() => setStep((s) => (s + 1) % SCRIPT.length), STEP_MS)
    return () => clearInterval(id)
  }, [])

  const f = SCRIPT[step]

  return (
    <div className="grid items-center gap-10 lg:grid-cols-2">
      {/* Bijschriften — lichten mee met het actieve scherm */}
      <ul className="order-2 mx-auto flex max-w-md flex-col gap-3 lg:order-1">
        {CAPTIONS.map((c, i) => {
          const active = c.key === f.scene
          return (
            <li
              key={c.key}
              className={`flex items-start gap-3 transition-opacity duration-500 ${active ? 'opacity-100' : 'opacity-45'}`}
            >
              <span
                className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl text-sm font-extrabold transition-colors ${
                  active ? 'bg-brand text-white' : 'bg-brand-light text-brand'
                }`}
              >
                {i + 1}
              </span>
              <div>
                <p className="text-base font-bold text-slate-800">{c.t}</p>
                <p className="text-sm leading-relaxed text-slate-500">{c.d}</p>
              </div>
            </li>
          )
        })}
      </ul>

      {/* Telefoon */}
      <div className="relative order-1 mx-auto w-[270px] lg:order-2">
        <div className="rounded-[2.6rem] border-[10px] border-slate-900 bg-slate-900 shadow-soft">
          <div className="relative h-[540px] overflow-hidden rounded-[2rem] bg-canvas">
            {/* Notch */}
            <div className="absolute left-1/2 top-0 z-20 h-5 w-24 -translate-x-1/2 rounded-b-2xl bg-slate-900" />

            {/* Actief scherm */}
            <div key={f.scene} className="demo-pop absolute inset-0 flex flex-col gap-2 px-3.5 pb-4 pt-9">
              {f.scene === 'taken' && (
                <>
                  <ScreenHeader icon={ListTodo} tone="bg-violet-100 text-violet-600" title="Taken" action="Toevoegen" />
                  <div className="mt-1 flex flex-col gap-1.5">
                    {f.tasks === 3 && <TaskRow name="Tafel afruimen" who="Tom" color="from-sky-400 to-sky-600" points={2} isNew />}
                    <TaskRow name="Stofzuigen" who="Sanne" color="from-rose-400 to-rose-600" points={3} />
                    <TaskRow name="Afwas" who="Tom" color="from-sky-400 to-sky-600" />
                    <TaskRow name="Planten water" who="Mark" color="from-emerald-400 to-emerald-600" />
                  </div>
                  {f.form && (
                    <div className="demo-sheet absolute inset-x-0 bottom-0 rounded-t-card border-t border-cardborder bg-white p-3.5 shadow-soft">
                      <p className="text-xs font-extrabold text-slate-800">Nieuwe taak</p>
                      <div className="mt-2 rounded-xl border border-cardborder px-3 py-2 text-xs">
                        {f.title ? (
                          <span className="text-slate-700">
                            {f.title}
                            <span className="demo-caret text-brand">|</span>
                          </span>
                        ) : (
                          <span className="text-slate-400">Bijv. Tafel afruimen</span>
                        )}
                      </div>
                      <div className="mt-2 flex gap-2">
                        <span className="rounded-xl bg-slate-50 px-3 py-2 text-[11px] font-semibold text-slate-600">Voor: Tom</span>
                        <span className="pill flex-1 bg-brand px-3 py-2 text-[11px] font-semibold text-white">Toewijzen</span>
                      </div>
                    </div>
                  )}
                </>
              )}

              {f.scene === 'bood' && (
                <>
                  <ScreenHeader icon={ShoppingCart} tone="bg-emerald-100 text-emerald-600" title="Boodschappen" />
                  <div className="mt-1 flex flex-col gap-1.5">
                    {BOOD_ITEMS.map((label, i) => (
                      <BoodRow key={label} label={label} done={i < (f.checked ?? 0)} />
                    ))}
                  </div>
                </>
              )}

              {f.scene === 'budget' && (
                <>
                  <ScreenHeader icon={Wallet} tone="bg-brand-light text-brand" title="Te besteden" action="Uitgave" />
                  <div className="mt-1 rounded-2xl bg-white p-3 shadow-card">
                    <div className="flex items-end justify-between">
                      <p className="text-[11px] font-semibold text-slate-500">Vandaag</p>
                      <p key={f.spent ? 'low' : 'high'} className="demo-pop text-2xl font-extrabold text-brand">
                        €{f.spent ? 23 : 35}
                      </p>
                    </div>
                    <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-brand transition-[width] duration-700 ease-out"
                        style={{ width: f.spent ? '64%' : '92%' }}
                      />
                    </div>
                  </div>
                  <p className="mt-1 text-[11px] font-semibold text-slate-500">Recente uitgaven</p>
                  <div className="flex flex-col gap-1.5">
                    {f.spent && (
                      <div className="demo-pop flex items-center gap-2.5 rounded-2xl bg-white p-2.5 shadow-card">
                        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-xl bg-emerald-100 text-emerald-600">
                          <Receipt className="h-4 w-4" />
                        </span>
                        <p className="min-w-0 flex-1 truncate text-xs font-bold text-slate-800">Albert Heijn</p>
                        <p className="text-xs font-bold text-slate-800">€12</p>
                      </div>
                    )}
                    <div className="flex items-center gap-2.5 rounded-2xl bg-white p-2.5 shadow-card">
                      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-xl bg-sky-100 text-sky-600">
                        <Receipt className="h-4 w-4" />
                      </span>
                      <p className="min-w-0 flex-1 truncate text-xs font-bold text-slate-800">Tankstation</p>
                      <p className="text-xs font-bold text-slate-800">€48</p>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Cursor */}
            <div
              className="pointer-events-none absolute z-30 transition-all duration-700 ease-out"
              style={{ left: f.cx, top: f.cy }}
              aria-hidden
            >
              {f.tap && !reduced && (
                <span className="demo-ping absolute -left-1.5 -top-1.5 block h-8 w-8 rounded-full bg-brand/40" />
              )}
              <MousePointer2 className="h-5 w-5 fill-white text-slate-900 drop-shadow-md" strokeWidth={1.6} />
            </div>
          </div>
        </div>
        {/* Zachte gloed achter de telefoon */}
        <div className="absolute -inset-6 -z-10 rounded-full bg-brand/10 blur-3xl" aria-hidden />
      </div>
    </div>
  )
}

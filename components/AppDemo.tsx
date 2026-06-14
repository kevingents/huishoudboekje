import { Calendar, ShoppingCart, Check, Wallet, PiggyBank, MapPin, Clock, Sun, Stethoscope } from 'lucide-react'

/**
 * Zelf-afspelende product-demo: een telefoon-mockup die met pure CSS-animaties
 * door vier app-schermen loopt (agenda → boodschappen → dagbudget → uitjes).
 * Geen extern videobestand, werkt in light/dark mode, respecteert
 * `prefers-reduced-motion` (dan staat het eerste scherm stil).
 */

const SCREEN_DELAYS = ['0s', '4s', '8s', '12s']

function Screen({ delay, first, children }: { delay: string; first?: boolean; children: React.ReactNode }) {
  return (
    <div
      className="app-demo-screen absolute inset-0 flex flex-col gap-2.5 px-3.5 pb-3.5 pt-9"
      style={{ animationDelay: delay }}
      data-first={first ? '' : undefined}
    >
      {children}
    </div>
  )
}

function Row({ icon: Icon, tone, title, sub }: { icon: typeof Calendar; tone: string; title: string; sub: string }) {
  return (
    <div className="flex items-center gap-2.5 rounded-2xl bg-white p-2.5 shadow-card">
      <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-xl ${tone}`}>
        <Icon className="h-4 w-4" strokeWidth={2.2} />
      </span>
      <div className="min-w-0">
        <p className="truncate text-xs font-bold text-slate-800">{title}</p>
        <p className="truncate text-[11px] text-slate-500">{sub}</p>
      </div>
    </div>
  )
}

export default function AppDemo() {
  return (
    <div className="relative mx-auto w-[270px]">
      {/* Telefoon-frame */}
      <div className="rounded-[2.6rem] border-[10px] border-slate-900 bg-slate-900 shadow-soft">
        <div className="relative h-[540px] overflow-hidden rounded-[2rem] bg-canvas">
          {/* Notch */}
          <div className="absolute left-1/2 top-0 z-20 h-5 w-24 -translate-x-1/2 rounded-b-2xl bg-slate-900" />

          {/* Scherm 1 — Vandaag / agenda */}
          <Screen delay={SCREEN_DELAYS[0]} first>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wide text-brand">Vandaag · di 16 jun</p>
              <h4 className="text-base font-extrabold text-slate-800">Goedemorgen!</h4>
            </div>
            <Row icon={Calendar} tone="bg-violet-100 text-violet-600" title="Zwemles Tom" sub="16:00 · Sportcentrum" />
            <Row icon={Stethoscope} tone="bg-rose-100 text-rose-600" title="Tandarts Sanne" sub="09:30 · Centrum" />
            <div className="flex items-center gap-2 rounded-2xl bg-weather p-2.5">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-amber-100 text-amber-500">
                <Sun className="h-4 w-4" strokeWidth={2.2} />
              </span>
              <p className="text-[11px] font-semibold text-slate-600">19° · droog tot 18:00</p>
            </div>
          </Screen>

          {/* Scherm 2 — Boodschappen */}
          <Screen delay={SCREEN_DELAYS[1]}>
            <div className="flex items-center gap-2">
              <span className="grid h-8 w-8 place-items-center rounded-xl bg-emerald-100 text-emerald-600">
                <ShoppingCart className="h-4 w-4" strokeWidth={2.2} />
              </span>
              <h4 className="text-base font-extrabold text-slate-800">Boodschappen</h4>
            </div>
            <div className="flex flex-col gap-1.5">
              {[
                { t: 'Melk', done: true },
                { t: 'Volkoren brood', done: true },
                { t: 'Appels', done: false },
                { t: 'Pasta & saus', done: false },
                { t: 'Yoghurt', done: false },
              ].map((it) => (
                <div key={it.t} className="flex items-center gap-2.5 rounded-2xl bg-white p-2.5 shadow-card">
                  <span
                    className={`grid h-5 w-5 shrink-0 place-items-center rounded-md border ${
                      it.done ? 'border-brand bg-brand text-white' : 'border-slate-300 bg-white'
                    }`}
                  >
                    {it.done && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
                  </span>
                  <p className={`text-xs font-semibold ${it.done ? 'text-slate-400 line-through' : 'text-slate-800'}`}>
                    {it.t}
                  </p>
                </div>
              ))}
            </div>
          </Screen>

          {/* Scherm 3 — Dagbudget */}
          <Screen delay={SCREEN_DELAYS[2]}>
            <div className="flex items-center gap-2">
              <span className="grid h-8 w-8 place-items-center rounded-xl bg-brand-light text-brand">
                <Wallet className="h-4 w-4" strokeWidth={2.2} />
              </span>
              <h4 className="text-base font-extrabold text-slate-800">Te besteden</h4>
            </div>
            <div className="rounded-2xl bg-white p-3 shadow-card">
              <div className="flex items-end justify-between">
                <p className="text-[11px] font-semibold text-slate-500">Vandaag</p>
                <p className="text-2xl font-extrabold text-brand">€23</p>
              </div>
              <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                <div className="h-full w-[64%] rounded-full bg-brand" />
              </div>
              <div className="mt-3 grid grid-cols-3 gap-1.5 text-center">
                {[
                  { l: 'Eten', v: '€12' },
                  { l: 'Vervoer', v: '€6' },
                  { l: 'Vrij', v: '€5' },
                ].map((p) => (
                  <div key={p.l} className="rounded-xl bg-slate-50 p-1.5">
                    <p className="text-[10px] text-slate-500">{p.l}</p>
                    <p className="text-xs font-extrabold text-slate-800">{p.v}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2.5 rounded-2xl bg-emerald-100 p-2.5">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-emerald-500/15 text-emerald-600">
                <PiggyBank className="h-4 w-4" strokeWidth={2.2} />
              </span>
              <p className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300">€340 over → sparen</p>
            </div>
          </Screen>

          {/* Scherm 4 — Uitjes in de buurt */}
          <Screen delay={SCREEN_DELAYS[3]}>
            <div className="flex items-center gap-2">
              <span className="grid h-8 w-8 place-items-center rounded-xl bg-teal-100 text-teal-600">
                <MapPin className="h-4 w-4" strokeWidth={2.2} />
              </span>
              <h4 className="text-base font-extrabold text-slate-800">Uitjes dichtbij</h4>
            </div>
            <Row icon={MapPin} tone="bg-teal-100 text-teal-600" title="Speeltuin De Vlinder" sub="gratis · 0–8 jr · 600 m" />
            <Row icon={MapPin} tone="bg-emerald-100 text-emerald-600" title="Kinderboerderij" sub="gratis · alle leeftijden · 1,2 km" />
            <div className="flex items-center gap-2 rounded-2xl bg-white p-2.5 shadow-card">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-amber-100 text-amber-500">
                <Clock className="h-4 w-4" strokeWidth={2.2} />
              </span>
              <p className="text-[11px] font-semibold text-slate-600">Tik om in te plannen in de agenda</p>
            </div>
          </Screen>
        </div>
      </div>
      {/* Zachte gloed achter de telefoon */}
      <div className="absolute -inset-6 -z-10 rounded-full bg-brand/10 blur-3xl" aria-hidden />
    </div>
  )
}

'use client'

import { useState } from 'react'
import {
  HelpCircle,
  ChevronLeft,
  ChevronRight,
  Wallet,
  LayoutGrid,
  CalendarClock,
  Users,
  Receipt,
  UploadCloud,
  Tags,
  TrendingUp,
} from 'lucide-react'
import Modal from '../Modal'

const STEPS: { icon: typeof Wallet; title: string; body: string }[] = [
  {
    icon: Wallet,
    title: 'Budget in het kort',
    body: 'Fam laat je per dag zien wat je nog kunt besteden, verdeelt je maandgeld over “potjes”, en houdt je uitgaven bij. Je hoeft geen spreadsheets bij te houden.',
  },
  {
    icon: LayoutGrid,
    title: 'De tabbladen',
    body: 'Overzicht = hoe je ervoor staat. Uitgaven = wat je uitgaf (met persoonlijk inzicht). Plannen = inkomsten, vaste lasten, leningen, spaardoelen en je potjes. Importeren = je bankafschrift inlezen.',
  },
  {
    icon: CalendarClock,
    title: 'Vandaag te besteden',
    body: 'Je maandbedrag verdeeld over de dagen van je periode. Wat je een dag niet opmaakt, schuift door naar morgen. Je kunt kiezen of dit je hele budget is of één specifiek potje.',
  },
  {
    icon: Users,
    title: 'Potjes (Gezinsbudget)',
    body: 'Verdeel je maandgeld over potjes: per onderwerp (Boodschappen) of per gezinslid. Een potje heeft een maandbudget, kan aan een lid hangen, en kan maandelijks sparen — dat sparen verlaagt wat er te besteden is.',
  },
  {
    icon: Receipt,
    title: 'Uitgave toevoegen',
    body: 'Vul omschrijving + bedrag in en kies een categorie (een nieuwe aanmaken kan). Boek ’m op een potje, splits het bedrag over meerdere personen, of splits één bon in regels met elk een eigen categorie.',
  },
  {
    icon: UploadCloud,
    title: 'Bankafschrift importeren',
    body: 'Sleep je afschrift (CSV, MT940 of CAMT) erin. Fam leest het op je eigen apparaat in, slaat dubbele transacties over en herkent betalingen van je vaste lasten zodat die niet dubbel tellen.',
  },
  {
    icon: Tags,
    title: 'Indelen onthoudt jouw keuze',
    body: 'Geïmporteerde uitgaven deel je in onder “Categoriseren”. Fam onthoudt per winkel hoe jíj het indeelt, dus de volgende keer gaat het vanzelf — jouw indeling is altijd leidend.',
  },
  {
    icon: TrendingUp,
    title: 'Inzicht & prognose',
    body: 'Zie per gezinslid wat er gekocht is en hoe vaak, en krijg een prognose per potje: ligt het op koers of dreigt het over te gaan? Bij dreigende overschrijding stelt Fam voor om te schuiven.',
  },
]

/** Korte, stap-voor-stap uitleg van de budgetmodule. Te starten met de "Uitleg"-knop. */
export default function BudgetTutorial() {
  const [open, setOpen] = useState(false)
  const [i, setI] = useState(0)
  const step = STEPS[i]
  const Icon = step.icon
  const last = i === STEPS.length - 1

  const start = () => {
    setI(0)
    setOpen(true)
  }

  return (
    <>
      <button
        type="button"
        onClick={start}
        className="pill border border-cardborder bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:border-brand/40 hover:bg-brand-light hover:text-brand"
      >
        <HelpCircle className="h-3.5 w-3.5" />
        Hoe werkt het budget?
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title="Zo werkt het budget">
        <div className="flex flex-col">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-brand-light text-brand">
              <Icon className="h-6 w-6" strokeWidth={2.1} />
            </span>
            <h3 className="text-base font-extrabold text-slate-800 dark:text-slate-100">{step.title}</h3>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-slate-300">{step.body}</p>

          {/* Voortgang */}
          <div className="mt-5 flex items-center justify-center gap-1.5">
            {STEPS.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setI(idx)}
                aria-label={`Stap ${idx + 1}`}
                className={`h-1.5 rounded-full transition-all ${idx === i ? 'w-5 bg-brand' : 'w-1.5 bg-slate-200 dark:bg-white/15'}`}
              />
            ))}
          </div>

          <div className="mt-5 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setI((n) => Math.max(0, n - 1))}
              disabled={i === 0}
              className="pill border border-cardborder bg-white px-3.5 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4" />
              Vorige
            </button>
            <span className="text-xs text-slate-400">
              {i + 1} / {STEPS.length}
            </span>
            {last ? (
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="pill bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark"
              >
                Klaar
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setI((n) => Math.min(STEPS.length - 1, n + 1))}
                className="pill bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark"
              >
                Volgende
                <ChevronRight className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </Modal>
    </>
  )
}

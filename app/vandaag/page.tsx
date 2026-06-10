'use client'

import { useEffect, useState, type ComponentType } from 'react'
import Link from 'next/link'
import {
  ChevronRight,
  CalendarCheck,
  ChefHat,
  Refrigerator,
  Users,
  BarChart3,
  Boxes,
  CalendarDays,
  ShoppingCart,
  CreditCard,
  FileText,
  Phone,
  Heart,
  type LucideProps,
} from 'lucide-react'
import NotificationBell from '@/components/NotificationBell'
import Crest from '@/components/Crest'
import { useFamily, useAuth, useAgenda, useTasks, useShopping, useSettings } from '@/lib/hooks'
import { readCoParenting, coParentNow } from '@/lib/coparent'

type Icon = ComponentType<LucideProps>

function pad(n: number) {
  return String(n).padStart(2, '0')
}

const TONES: Record<string, string> = {
  amber: 'bg-amber-100 text-amber-500',
  sky: 'bg-sky-100 text-sky-500',
  violet: 'bg-violet-100 text-violet-500',
  emerald: 'bg-emerald-100 text-emerald-600',
}

const QUICK: { label: string; href: string; icon: Icon; tone: string }[] = [
  { label: 'Recepten', href: '/recepten', icon: ChefHat, tone: 'amber' },
  { label: 'Koelkast', href: '/koelkast', icon: Refrigerator, tone: 'sky' },
  { label: 'Gezin', href: '/gezin', icon: Users, tone: 'violet' },
  { label: 'Budget', href: '/budget', icon: BarChart3, tone: 'emerald' },
  { label: 'Modules', href: '/modules', icon: Boxes, tone: 'violet' },
]

export default function Vandaag() {
  const { members } = useFamily()
  const { user } = useAuth()
  const { events } = useAgenda()
  const { tasks } = useTasks()
  const { items } = useShopping()
  const { settings } = useSettings()

  const crest = typeof settings.familyCrest === 'string' ? settings.familyCrest : null
  const coParent = coParentNow(readCoParenting(settings.coParenting), new Date())
  const greetingName = user?.name?.split(' ')[0] ?? ''

  const [greet, setGreet] = useState('Hallo')
  const [today, setToday] = useState('')
  useEffect(() => {
    const d = new Date()
    const h = d.getHours()
    setGreet(h < 6 ? 'Goedenacht' : h < 12 ? 'Goedemorgen' : h < 18 ? 'Goedemiddag' : 'Goedenavond')
    setToday(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`)
  }, [])

  const afspraken = today ? events.filter((e) => e.dateKey === today).length : 0
  const takenOpen = tasks.filter((t) => t.status === 'todo' || t.status === 'open').length
  const boodschappen = items.filter((i) => !i.checked).length

  const shownMembers = members.slice(0, 4)
  const extraMembers = Math.max(0, members.length - shownMembers.length)

  const sections: { title: string; rows: { label: string; sub: string; href: string; icon: Icon; tone: string; badge?: number }[] }[] = [
    {
      title: 'Plannen & organiseren',
      rows: [
        { label: 'Agenda', sub: 'Bekijk alle afspraken', href: '/agenda', icon: CalendarDays, tone: 'sky' },
        {
          label: 'Boodschappen',
          sub: `${boodschappen} ${boodschappen === 1 ? 'product' : 'producten'} op je lijst`,
          href: '/boodschappen',
          icon: ShoppingCart,
          tone: 'emerald',
          badge: boodschappen || undefined,
        },
      ],
    },
    {
      title: 'Thuis & koken',
      rows: [
        { label: 'Recepten', sub: 'Wat eten we?', href: '/recepten', icon: ChefHat, tone: 'amber' },
        { label: 'Koelkast', sub: 'Wat is er thuis?', href: '/koelkast', icon: Refrigerator, tone: 'sky' },
      ],
    },
    {
      title: 'Financiën & overzicht',
      rows: [
        { label: 'Budget', sub: 'Overzicht & planning', href: '/budget', icon: BarChart3, tone: 'emerald' },
        { label: 'Modules', sub: 'Extra tools voor jouw gezin', href: '/modules', icon: Boxes, tone: 'violet' },
      ],
    },
  ]

  const beheer: { label: string; sub: string; href: string; icon: Icon; tone: string }[] = [
    { label: 'Pasjes', sub: 'Loyalty & toegangspasjes', href: '/pasjes', icon: CreditCard, tone: 'amber' },
    { label: 'Documenten', sub: 'Belangrijke papieren', href: '/documenten', icon: FileText, tone: 'sky' },
    { label: 'Contacten', sub: 'Belangrijke nummers', href: '/contacten', icon: Phone, tone: 'emerald' },
  ]

  return (
    <>
      {/* Header */}
      <header className="mb-6 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-extrabold text-slate-800 sm:text-3xl">
            {greet}
            {greetingName ? `, ${greetingName}` : ''}!
          </h1>
          <p className="text-sm text-slate-500">Wat gaan we vandaag doen?</p>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          {crest && (
            <Link href="/gezin" aria-label="Familiewapen" className="hidden sm:block">
              <Crest svg={crest} className="h-10 w-8 object-contain drop-shadow-sm" />
            </Link>
          )}
          <Link href="/gezin" className="flex -space-x-3" aria-label="Naar het gezin">
            {shownMembers.map((m) => (
              <span
                key={m.id}
                title={m.name}
                className={`grid h-10 w-10 place-items-center rounded-full border-2 border-white bg-gradient-to-br text-xs font-bold text-white shadow-sm ${m.color}`}
              >
                {m.initials}
              </span>
            ))}
            {extraMembers > 0 && (
              <span className="grid h-10 w-10 place-items-center rounded-full border-2 border-white bg-slate-100 text-xs font-bold text-slate-500 shadow-sm">
                +{extraMembers}
              </span>
            )}
          </Link>
          <NotificationBell />
        </div>
      </header>

      {coParent && (
        <div className="mb-5 flex items-center gap-3 rounded-card bg-gradient-to-br from-violet-50 to-white px-5 py-3 ring-1 ring-violet-100">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-violet-100 text-violet-500">
            <CalendarDays className="h-5 w-5" strokeWidth={2.1} />
          </span>
          <p className="text-sm text-slate-700">
            Deze week zijn de kinderen bij <span className="font-bold">{coParent.parent}</span>.
          </p>
        </div>
      )}

      {/* Vandaag-hero */}
      <Link
        href="/agenda"
        className="mb-7 flex items-center gap-4 rounded-card bg-gradient-to-br from-brand-light to-white p-5 ring-1 ring-emerald-100 transition-shadow hover:shadow-card"
      >
        <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-white text-brand shadow-sm">
          <CalendarCheck className="h-7 w-7" strokeWidth={2.2} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-bold uppercase tracking-wide text-brand">Vandaag</p>
          <p className="text-xl font-extrabold text-slate-800">
            {afspraken} {afspraken === 1 ? 'afspraak' : 'afspraken'}
          </p>
          <p className="inline-flex items-center gap-1.5 text-sm text-slate-500">
            <span className="h-2 w-2 rounded-full bg-brand" />
            {takenOpen} {takenOpen === 1 ? 'taak' : 'taken'} openstaand
          </p>
        </div>
        <ChevronRight className="h-6 w-6 shrink-0 text-slate-300" />
      </Link>

      {/* Snel naar */}
      <h2 className="mb-3 text-sm font-bold text-slate-500">Snel naar</h2>
      <div className="mb-8 grid grid-cols-3 gap-3 sm:grid-cols-5">
        {QUICK.map((q) => (
          <Link
            key={q.label}
            href={q.href}
            className="flex flex-col items-center gap-2 rounded-card border border-cardborder bg-white p-3 text-center transition-colors hover:border-brand/40 hover:bg-slate-50"
          >
            <span className={`grid h-11 w-11 place-items-center rounded-2xl ${TONES[q.tone]}`}>
              <q.icon className="h-6 w-6" strokeWidth={2.1} />
            </span>
            <span className="text-xs font-semibold text-slate-700">{q.label}</span>
          </Link>
        ))}
      </div>

      {/* Gegroepeerde secties */}
      {sections.map((section) => (
        <section key={section.title} className="mb-7">
          <h2 className="mb-3 text-sm font-bold text-slate-500">{section.title}</h2>
          <div className="overflow-hidden rounded-card border border-cardborder bg-white">
            {section.rows.map((row, i) => (
              <Link
                key={row.label}
                href={row.href}
                className={`flex items-center gap-4 px-4 py-4 transition-colors hover:bg-slate-50 ${
                  i < section.rows.length - 1 ? 'border-b border-cardborder' : ''
                }`}
              >
                <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl ${TONES[row.tone]}`}>
                  <row.icon className="h-6 w-6" strokeWidth={2.1} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-base font-bold text-slate-800">{row.label}</span>
                  <span className="block text-sm text-slate-500">{row.sub}</span>
                </span>
                {row.badge ? (
                  <span className="grid h-7 min-w-7 place-items-center rounded-full bg-brand-light px-2 text-xs font-bold text-brand">
                    {row.badge}
                  </span>
                ) : null}
                <ChevronRight className="h-5 w-5 shrink-0 text-slate-300" />
              </Link>
            ))}
          </div>
        </section>
      ))}

      {/* Bewaren & beheren */}
      <h2 className="mb-3 text-sm font-bold text-slate-500">Bewaren & beheren</h2>
      <div className="mb-8 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {beheer.map((b) => (
          <Link
            key={b.label}
            href={b.href}
            className="flex items-center gap-3 rounded-card border border-cardborder bg-white p-4 transition-colors hover:border-brand/40 hover:bg-slate-50"
          >
            <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl ${TONES[b.tone]}`}>
              <b.icon className="h-6 w-6" strokeWidth={2.1} />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-bold text-slate-800">{b.label}</span>
              <span className="block text-xs text-slate-500">{b.sub}</span>
            </span>
          </Link>
        ))}
      </div>

      {/* Footer-banner */}
      <div className="flex items-center gap-4 rounded-card bg-gradient-to-br from-sky-50 to-violet-50 p-5 ring-1 ring-sky-100">
        <div className="min-w-0 flex-1">
          <p className="text-base font-extrabold text-slate-800">Samen organiseren, meer tijd voor elkaar</p>
          <p className="text-sm text-slate-500">Alle belangrijke zaken van jullie gezin op één plek.</p>
        </div>
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-white text-rose-400 shadow-sm">
          <Heart className="h-6 w-6" strokeWidth={2.1} />
        </span>
      </div>
    </>
  )
}

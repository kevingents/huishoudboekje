'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LogOut,
  X,
  ShieldCheck,
  ChevronRight,
  CalendarCheck,
  ChefHat,
  Refrigerator,
  Users,
  BarChart3,
  Boxes,
} from 'lucide-react'
import { sidebarNav, mobileMenuGroups, type NavItem } from '@/lib/mockData'
import { useAuth, useFamily, useAgenda, useTasks } from '@/lib/hooks'

function pad(n: number) {
  return String(n).padStart(2, '0')
}

const TONES: Record<string, string> = {
  amber: 'bg-amber-100 text-amber-500',
  sky: 'bg-sky-100 text-sky-500',
  violet: 'bg-violet-100 text-violet-500',
  emerald: 'bg-emerald-100 text-emerald-600',
}

const QUICK = [
  { label: 'Recepten', href: '/recepten', icon: ChefHat, tone: 'amber' },
  { label: 'Koelkast', href: '/koelkast', icon: Refrigerator, tone: 'sky' },
  { label: 'Gezin', href: '/gezin', icon: Users, tone: 'violet' },
  { label: 'Budget', href: '/budget', icon: BarChart3, tone: 'emerald' },
  { label: 'Modules', href: '/modules', icon: Boxes, tone: 'violet', childHidden: true },
]

/** Volledig navigatie-overzicht voor mobiel (het zijmenu is daar verborgen). */
export default function MobileMenu({ open, onClose }: { open: boolean; onClose: () => void }) {
  const pathname = usePathname()
  const { user, logout } = useAuth()
  const { members } = useFamily()
  const { events } = useAgenda()
  const { tasks } = useTasks()

  const [greet, setGreet] = useState('Hallo')
  const [today, setToday] = useState('')
  useEffect(() => {
    const d = new Date()
    const h = d.getHours()
    setGreet(h < 6 ? 'Goedenacht' : h < 12 ? 'Goedemorgen' : h < 18 ? 'Goedemiddag' : 'Goedenavond')
    setToday(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`)
  }, [])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  const byHref = new Map(sidebarNav.map((i) => [i.href, i]))
  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/')
  const childHidden = new Set(['/ai-assistent', '/modules'])

  const groups = mobileMenuGroups.map((g) => {
    const items = g.hrefs
      .map((h) => byHref.get(h))
      .filter((x): x is NavItem => Boolean(x))
      .filter((x) => !(user?.isChild && childHidden.has(x.href)))
    if (g.title === 'Account' && user?.isAdmin) {
      items.push({ label: 'Beheer', icon: ShieldCheck, href: '/beheer' })
    }
    return { title: g.title, items }
  })

  const greetingName = user?.name?.split(' ')[0] ?? ''
  const afspraken = today ? events.filter((e) => e.dateKey === today).length : 0
  const takenOpen = tasks.filter((t) => t.status === 'todo' || t.status === 'open').length
  const shownMembers = members.slice(0, 4)
  const extraMembers = Math.max(0, members.length - shownMembers.length)
  const quick = QUICK.filter((q) => !(user?.isChild && q.childHidden))

  return (
    <div className="fixed inset-0 z-[60] lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className="absolute inset-x-0 bottom-0 max-h-[90dvh] overflow-y-auto rounded-t-3xl bg-canvas p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-soft">
        <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-slate-200" />

        {/* Begroeting + avatars */}
        <div className="mb-5 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xl font-extrabold text-slate-800">
              {greet}
              {greetingName ? `, ${greetingName}` : ''}!
            </p>
            <p className="text-sm text-slate-500">Wat gaan we vandaag doen?</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Link href="/gezin" onClick={onClose} className="flex -space-x-3" aria-label="Naar het gezin">
              {shownMembers.map((m) => (
                <span
                  key={m.id}
                  className={`grid h-9 w-9 place-items-center rounded-full border-2 border-white bg-gradient-to-br text-[11px] font-bold text-white shadow-sm ${m.color}`}
                >
                  {m.initials}
                </span>
              ))}
              {extraMembers > 0 && (
                <span className="grid h-9 w-9 place-items-center rounded-full border-2 border-white bg-slate-100 text-[11px] font-bold text-slate-500 shadow-sm">
                  +{extraMembers}
                </span>
              )}
            </Link>
            <button
              type="button"
              onClick={onClose}
              aria-label="Sluiten"
              className="grid h-9 w-9 place-items-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Vandaag-hero */}
        <Link
          href="/agenda"
          onClick={onClose}
          className="mb-5 flex items-center gap-4 rounded-card bg-gradient-to-br from-brand-light to-white p-4 ring-1 ring-emerald-100"
        >
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-white text-brand shadow-sm">
            <CalendarCheck className="h-6 w-6" strokeWidth={2.2} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-bold uppercase tracking-wide text-brand">Vandaag</p>
            <p className="text-lg font-extrabold text-slate-800">
              {afspraken} {afspraken === 1 ? 'afspraak' : 'afspraken'}
            </p>
            <p className="inline-flex items-center gap-1.5 text-sm text-slate-500">
              <span className="h-2 w-2 rounded-full bg-brand" />
              {takenOpen} {takenOpen === 1 ? 'taak' : 'taken'} openstaand
            </p>
          </div>
          <ChevronRight className="h-5 w-5 shrink-0 text-slate-300" />
        </Link>

        {/* Snel naar */}
        <p className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Snel naar</p>
        <div className="mb-6 grid grid-cols-3 gap-3">
          {quick.map((q) => (
            <Link
              key={q.label}
              href={q.href}
              onClick={onClose}
              className="flex flex-col items-center gap-2 rounded-2xl border border-cardborder bg-white p-3 text-center transition-colors hover:bg-slate-50"
            >
              <span className={`grid h-10 w-10 place-items-center rounded-2xl ${TONES[q.tone]}`}>
                <q.icon className="h-5 w-5" strokeWidth={2.1} />
              </span>
              <span className="text-[11px] font-semibold text-slate-700">{q.label}</span>
            </Link>
          ))}
        </div>

        {/* Alle pagina's, gegroepeerd */}
        <div className="flex flex-col gap-5">
          {groups.map((group) =>
            group.items.length === 0 ? null : (
              <div key={group.title}>
                <p className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                  {group.title}
                </p>
                <div className="overflow-hidden rounded-card border border-cardborder bg-white">
                  {group.items.map((item, i) => {
                    const active = isActive(item.href)
                    const Icon = item.icon
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={onClose}
                        aria-current={active ? 'page' : undefined}
                        className={`flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-slate-50 ${
                          i < group.items.length - 1 ? 'border-b border-cardborder' : ''
                        }`}
                      >
                        <span
                          className={`grid h-10 w-10 shrink-0 place-items-center rounded-2xl ${
                            active ? 'bg-brand text-white' : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          <Icon className="h-5 w-5" strokeWidth={2.1} />
                        </span>
                        <span className={`min-w-0 flex-1 text-sm font-semibold ${active ? 'text-brand' : 'text-slate-700'}`}>
                          {item.label}
                        </span>
                        <ChevronRight className="h-5 w-5 shrink-0 text-slate-300" />
                      </Link>
                    )
                  })}
                </div>
              </div>
            ),
          )}
        </div>

        {/* Account */}
        <div className="mt-5 flex items-center gap-3 rounded-2xl border border-cardborder bg-white p-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gradient-to-br from-brand to-emerald-600 text-sm font-bold text-white">
            {(user?.name ?? '·').slice(0, 1).toUpperCase()}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-slate-800">{user?.name ?? '…'}</p>
            <p className="truncate text-xs text-slate-500">{user?.email ?? ''}</p>
          </div>
          <button
            type="button"
            onClick={() => {
              onClose()
              logout()
            }}
            className="pill shrink-0 bg-white px-3 py-2 text-xs font-semibold text-rose-500 ring-1 ring-cardborder transition-colors hover:bg-rose-50"
          >
            <LogOut className="h-4 w-4" />
            Uitloggen
          </button>
        </div>
      </div>
    </div>
  )
}

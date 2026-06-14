'use client'

import Link from 'next/link'
import { CalendarClock, Cake, Gift, BadgeCheck, Car, Umbrella, FileText, SlidersHorizontal } from 'lucide-react'
import DashboardCard from './DashboardCard'
import { useDocuments, useFamily, useSettings } from '@/lib/hooks'
import { daysUntil, headsUpWindow } from '@/lib/documents'
import { parseBirthday, upcomingOccasions, shortDate, type OccasionConfig } from '@/lib/occasions'

type Item = {
  key: string
  icon: typeof CalendarClock
  iconClass: string
  title: string
  days: number
}

/** Mensvriendelijke "over …"-tekst (zonder werkwoord). */
function relative(days: number): string {
  if (days <= 0) return 'vandaag'
  if (days === 1) return 'morgen'
  if (days < 14) return `over ${days} dagen`
  if (days < 60) {
    const w = Math.round(days / 7)
    return `over ${w} ${w === 1 ? 'week' : 'weken'}`
  }
  const m = Math.round(days / 30)
  return `over ${m} ${m === 1 ? 'maand' : 'maanden'}`
}

const docIcon = (type: string) =>
  type === 'legitimatie' ? BadgeCheck : type === 'apk' ? Car : type === 'verzekering' ? Umbrella : FileText

/** Dashboard-kaart die aankomende seintjes bundelt: verlopende documenten,
 *  verjaardagen en feestdagen — zodat de reminders ook ín de app zichtbaar zijn,
 *  niet alleen als push. Toont niets als er de komende tijd niks speelt. */
export default function UpcomingRemindersCard() {
  const { documents } = useDocuments()
  const { members } = useFamily()
  const { settings } = useSettings()
  const occConfig = (settings.occasions ?? {}) as OccasionConfig
  const now = new Date()

  const items: Item[] = []

  // Verlopende documenten (binnen het type-venster)
  for (const doc of documents) {
    if (!doc.expiresAt) continue
    const d = daysUntil(doc.expiresAt)
    if (d === null || d < 0 || d > headsUpWindow(doc.type)) continue
    items.push({
      key: `doc-${doc.id}`,
      icon: docIcon(doc.type),
      iconClass: 'bg-rose-100 text-rose-600',
      title: `${doc.title} verloopt ${relative(d)}`,
      days: d,
    })
  }

  // Verjaardagen (komende 30 dagen)
  for (const m of members) {
    if (!m.birthday) continue
    const p = parseBirthday(m.birthday)
    if (!p) continue
    const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
    let target = Date.UTC(now.getUTCFullYear(), p.month - 1, p.day)
    if (target < today) target = Date.UTC(now.getUTCFullYear() + 1, p.month - 1, p.day)
    const d = Math.round((target - today) / 86_400_000)
    if (d > 30) continue
    items.push({
      key: `bday-${m.id}`,
      icon: Cake,
      iconClass: 'bg-violet-100 text-violet-600',
      title: d === 0 ? `${m.name} is vandaag jarig` : `${m.name} is ${relative(d)} jarig (${shortDate(p.day, p.month)})`,
      days: d,
    })
  }

  // Feestdagen & gelegenheden (komende 21 dagen) — door de gebruiker beheerd.
  for (const o of upcomingOccasions(now, 21, occConfig)) {
    items.push({
      key: `occ-${o.name}-${o.year}`,
      icon: Gift,
      iconClass: 'bg-amber-100 text-amber-600',
      title: o.daysUntil === 0 ? `Vandaag is het ${o.name}` : `${o.name} is ${relative(o.daysUntil)} (${shortDate(o.day, o.month)})`,
      days: o.daysUntil,
    })
  }

  if (items.length === 0) return null
  items.sort((a, b) => a.days - b.days)

  return (
    <DashboardCard
      title="Binnenkort"
      icon={CalendarClock}
      iconClassName="text-brand"
      headerRight={
        <Link
          href="/instellingen"
          aria-label="Gelegenheden beheren"
          title="Gelegenheden beheren"
          className="grid h-8 w-8 place-items-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-white/10"
        >
          <SlidersHorizontal className="h-4 w-4" />
        </Link>
      }
    >
      <ul className="flex flex-col gap-2.5">
        {items.slice(0, 6).map((it) => {
          const Icon = it.icon
          return (
            <li key={it.key} className="flex items-center gap-3">
              <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${it.iconClass}`}>
                <Icon className="h-4 w-4" strokeWidth={2.1} />
              </span>
              <p className="min-w-0 flex-1 truncate text-sm font-medium text-slate-700 dark:text-slate-200">
                {it.title}
              </p>
              <span
                className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                  it.days <= 7 ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'
                }`}
              >
                {relative(it.days)}
              </span>
            </li>
          )
        })}
      </ul>
    </DashboardCard>
  )
}

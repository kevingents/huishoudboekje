'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  Sun,
  UtensilsCrossed,
  Clock,
  Users,
  ChevronRight,
  Plus,
  Sparkles,
  CreditCard,
  SlidersHorizontal,
  ArrowUp,
  ArrowDown,
  EyeOff,
  CalendarRange,
} from 'lucide-react'

import DashboardCard from '@/components/DashboardCard'
import UpcomingRemindersCard from '@/components/UpcomingRemindersCard'
import BudgetCard from '@/components/BudgetCard'
import DayBudgetCard from '@/components/DayBudgetCard'
import AgendaCard from '@/components/AgendaCard'
import ShoppingList from '@/components/ShoppingList'
import NotificationBell from '@/components/NotificationBell'
import Crest from '@/components/Crest'
import SponsoredAds from '@/components/SponsoredAds'
import Modal from '@/components/Modal'
import { useFamily, useRecipes, useWeather, useAuth, useSettings, useGeolocation } from '@/lib/hooks'
import { resolveWeatherIcon } from '@/lib/icons'
import { rankRecipes } from '@/lib/recommend'
import { readCoParenting, coParentNow } from '@/lib/coparent'

import { aiSuggestion } from '@/lib/mockData'

const ALL_WIDGETS: { key: string; label: string; span: 1 | 2 }[] = [
  { key: 'dagbudget', label: 'Vandaag te besteden', span: 2 },
  { key: 'recept', label: 'Recept van vandaag', span: 1 },
  { key: 'weer', label: 'Weer', span: 1 },
  { key: 'agenda', label: 'Komende afspraken', span: 1 },
  { key: 'budget', label: 'Budget', span: 1 },
  { key: 'ai', label: 'AI-suggestie', span: 1 },
  { key: 'pasjes', label: 'Pasjes', span: 1 },
  { key: 'aanbiedingen', label: 'Aanbiedingen', span: 1 },
  { key: 'boodschappen', label: 'Boodschappenlijst', span: 2 },
]
const DEFAULT_WIDGETS = ['dagbudget', 'recept', 'weer', 'agenda', 'budget', 'ai', 'boodschappen']
const labelOf = (key: string) => ALL_WIDGETS.find((w) => w.key === key)?.label ?? key

export default function Vandaag() {
  const { members } = useFamily()
  const { recipes } = useRecipes()
  // Weer voor de telefoon-locatie (GPS); valt terug op de ingestelde woonplaats.
  const geo = useGeolocation(true)
  useEffect(() => {
    geo.request()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  const { weather } = useWeather(geo.coords)
  const { user } = useAuth()
  const { settings, setSetting } = useSettings()

  const crest = typeof settings.familyCrest === 'string' ? settings.familyCrest : null
  const coParent = coParentNow(readCoParenting(settings.coParenting), new Date())
  const WeatherIcon = resolveWeatherIcon(weather?.icon ?? 'Cloud')
  const recipe = rankRecipes(recipes)[0]
  const greetingName = user?.name?.split(' ')[0] ?? ''

  // Tijd-afhankelijke begroeting + echte datum (client-side, geen hydratie-mismatch).
  const [greet, setGreet] = useState('Hallo')
  const [dateStr, setDateStr] = useState('')
  useEffect(() => {
    const d = new Date()
    const h = d.getHours()
    setGreet(h < 6 ? 'Goedenacht' : h < 12 ? 'Goedemorgen' : h < 18 ? 'Goedemiddag' : 'Goedenavond')
    const s = d.toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long' })
    setDateStr(s.charAt(0).toUpperCase() + s.slice(1))
  }, [])

  // Indeling per gebruiker (opgeslagen in de household-settings onder een user-key).
  const dashKey = user ? `dashboard_${user.id}` : 'dashboard_anon'
  const savedRaw = settings[dashKey]
  const baseOrder: string[] = Array.isArray(savedRaw)
    ? (savedRaw as string[]).filter((k) => ALL_WIDGETS.some((w) => w.key === k))
    : DEFAULT_WIDGETS
  // Nieuw dagbudget-widget ook tonen bij bestaande indelingen (bovenaan).
  const order = baseOrder.includes('dagbudget') ? baseOrder : ['dagbudget', ...baseOrder]

  const [editOpen, setEditOpen] = useState(false)
  const [draft, setDraft] = useState<string[]>(order)

  const openEdit = () => {
    setDraft(order)
    setEditOpen(true)
  }
  const move = (i: number, dir: -1 | 1) => {
    const next = [...draft]
    const j = i + dir
    if (j < 0 || j >= next.length) return
    ;[next[i], next[j]] = [next[j], next[i]]
    setDraft(next)
  }
  const removeWidget = (key: string) => setDraft(draft.filter((k) => k !== key))
  const addWidget = (key: string) => setDraft([...draft, key])
  const saveLayout = async () => {
    await setSetting(dashKey, draft)
    setEditOpen(false)
  }
  const hidden = ALL_WIDGETS.filter((w) => !draft.includes(w.key))

  function renderWidget(key: string) {
    switch (key) {
      case 'recept':
        return (
          <DashboardCard key={key} title="Vandaag eten we dit" icon={UtensilsCrossed}>
            <div className="relative mb-4 aspect-[16/10] overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-100 to-amber-100 dark:from-slate-800 dark:to-slate-800">
              {recipe && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={recipe.image} alt={recipe.title} loading="lazy" className="h-full w-full object-cover" />
              )}
            </div>
            <h3 className="text-lg font-bold text-slate-800">{recipe ? recipe.title : 'Nog geen recept gekozen'}</h3>
            {recipe && (
              <div className="mt-2 flex items-center gap-4 text-sm text-slate-500">
                <span className="inline-flex items-center gap-1.5">
                  <Clock className="h-4 w-4" /> {recipe.time}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Users className="h-4 w-4" /> {recipe.servings}
                </span>
              </div>
            )}
            <Link href="/recepten" className="pill mt-4 bg-brand-light px-4 py-2.5 text-brand hover:bg-emerald-100">
              Bekijk recepten
            </Link>
          </DashboardCard>
        )
      case 'dagbudget':
        return <DayBudgetCard key={key} />
      case 'budget':
        return <BudgetCard key={key} />
      case 'weer':
        return (
          <DashboardCard key={key} bg="bg-weather" bordered={false}>
            <div className="flex items-start gap-4">
              <span className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-white/70 text-sky-500">
                <WeatherIcon className="h-9 w-9" strokeWidth={2} />
              </span>
              <div>
                <p className="text-sm font-medium text-slate-500">
                  {weather ? `${weather.day} · ${weather.location}` : 'Weer laden…'}
                </p>
                <p className="text-2xl font-extrabold text-slate-800">
                  {weather ? `${weather.condition}, ${weather.temp}°` : '—'}
                </p>
                <p className="text-sm text-slate-500">{weather ? `${weather.low}° / ${weather.high}°` : ''}</p>
              </div>
            </div>
          </DashboardCard>
        )
      case 'agenda':
        return <AgendaCard key={key} />
      case 'ai':
        return (
          <DashboardCard
            key={key}
            title="Suggestie van je AI-assistent"
            icon={Sparkles}
            iconClassName="text-violet-500"
            bg="bg-ai"
            bordered={false}
          >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <div className="relative aspect-[4/3] w-full shrink-0 overflow-hidden rounded-2xl bg-gradient-to-br from-violet-100 to-amber-100 dark:from-slate-800 dark:to-slate-800 sm:h-24 sm:w-28">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={aiSuggestion.image} alt="Suggestie" loading="lazy" className="h-full w-full object-cover" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-700">{aiSuggestion.text}</p>
                <Link href="/ai-assistent" className="pill mt-3 text-violet-600 hover:text-violet-700">
                  Bekijk recept &amp; aanbiedingen
                  <ChevronRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </DashboardCard>
        )
      case 'pasjes':
        return (
          <DashboardCard key={key}>
            <Link href="/pasjes" className="flex w-full items-center gap-4 text-left">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-sky-100 text-sky-500">
                <CreditCard className="h-6 w-6" strokeWidth={2.1} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-base font-bold text-slate-800">Pasjes</span>
                <span className="block text-sm text-slate-500">Klantenkaarten van het gezin bij de hand</span>
              </span>
              <ChevronRight className="h-5 w-5 shrink-0 text-slate-400" />
            </Link>
          </DashboardCard>
        )
      case 'aanbiedingen':
        return <SponsoredAds key={key} />
      case 'boodschappen':
        return <ShoppingList key={key} className="lg:col-span-2" />
      default:
        return null
    }
  }

  return (
    <>
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-amber-100 text-amber-500">
            <Sun className="h-7 w-7" strokeWidth={2.2} />
          </span>
          <div>
            <h1 className="text-xl font-extrabold text-slate-800 sm:text-2xl">
              {greet}
              {greetingName ? `, ${greetingName}` : ''}!
            </h1>
            <p className="text-sm text-slate-500">{dateStr}</p>
          </div>
        </div>

        <div className="flex items-center gap-3 sm:gap-4">
          {crest && (
            <Link href="/gezin" aria-label="Familiewapen">
              <Crest svg={crest} className="h-11 w-9 object-contain drop-shadow-sm" />
            </Link>
          )}
          <Link href="/gezin" className="flex -space-x-3" aria-label="Naar het gezin">
            {members.map((member) => (
              <span
                key={member.id}
                title={member.name}
                className={`grid h-10 w-10 place-items-center rounded-full border-2 border-white bg-gradient-to-br text-xs font-bold text-white shadow-sm ${member.color}`}
              >
                {member.initials}
              </span>
            ))}
          </Link>

          <button
            type="button"
            onClick={openEdit}
            aria-label="Vandaag aanpassen"
            title="Vandaag aanpassen"
            className="grid h-10 w-10 place-items-center rounded-full border border-cardborder bg-white text-slate-500 transition-colors hover:bg-slate-50 hover:text-brand"
          >
            <SlidersHorizontal className="h-5 w-5" />
          </button>
          <NotificationBell />
        </div>
      </header>

      {coParent && (
        <div className="mb-5 flex items-center gap-3 rounded-card bg-gradient-to-br from-violet-50 to-white px-5 py-3 ring-1 ring-violet-100">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-violet-100 text-violet-500">
            <CalendarRange className="h-5 w-5" strokeWidth={2.1} />
          </span>
          <p className="text-sm text-slate-700">
            Deze week zijn de kinderen bij <span className="font-bold">{coParent.parent}</span>.
          </p>
        </div>
      )}

      {/* Aankomende seintjes (verloopdata, verjaardagen, feestdagen) — altijd
          bovenaan, los van de instelbare widgets. Verbergt zich als er niks speelt. */}
      <UpcomingRemindersCard />

      {order.length === 0 ? (
        <DashboardCard>
          <p className="text-sm text-slate-500">
            Je hebt geen kaarten gekozen. Tik op het schuifjes-icoon rechtsboven om je Vandaag in te
            delen.
          </p>
        </DashboardCard>
      ) : (
        <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-2">{order.map(renderWidget)}</div>
      )}

      {/* Vandaag indelen */}
      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Vandaag indelen">
        <div className="flex flex-col gap-4">
          <p className="text-sm text-slate-500">
            Kies welke kaarten je ziet en in welke volgorde. Dit is persoonlijk — alleen voor jou.
          </p>

          <div>
            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Zichtbaar</p>
            <ul className="flex flex-col gap-1.5">
              {draft.map((key, i) => (
                <li key={key} className="flex items-center gap-2 rounded-xl border border-cardborder bg-white p-2.5">
                  <span className="min-w-0 flex-1 text-sm font-semibold text-slate-700">{labelOf(key)}</span>
                  <button
                    type="button"
                    onClick={() => move(i, -1)}
                    disabled={i === 0}
                    aria-label="Omhoog"
                    className="grid h-10 w-10 place-items-center rounded-full text-slate-400 hover:bg-slate-100 disabled:opacity-30"
                  >
                    <ArrowUp className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => move(i, 1)}
                    disabled={i === draft.length - 1}
                    aria-label="Omlaag"
                    className="grid h-10 w-10 place-items-center rounded-full text-slate-400 hover:bg-slate-100 disabled:opacity-30"
                  >
                    <ArrowDown className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => removeWidget(key)}
                    aria-label="Verbergen"
                    className="grid h-10 w-10 place-items-center rounded-full text-slate-400 hover:bg-rose-50 hover:text-rose-500"
                  >
                    <EyeOff className="h-4 w-4" />
                  </button>
                </li>
              ))}
              {draft.length === 0 && <li className="text-sm text-slate-400">Nog niets gekozen.</li>}
            </ul>
          </div>

          {hidden.length > 0 && (
            <div>
              <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Toevoegen</p>
              <div className="flex flex-wrap gap-2">
                {hidden.map((w) => (
                  <button
                    key={w.key}
                    type="button"
                    onClick={() => addWidget(w.key)}
                    className="pill border border-cardborder bg-white px-3 py-1.5 text-xs text-slate-600 hover:border-brand/40 hover:text-brand"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    {w.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={saveLayout}
            className="pill bg-brand px-4 py-2.5 text-white shadow-sm shadow-brand/20 hover:bg-brand-dark"
          >
            Opslaan
          </button>
        </div>
      </Modal>
    </>
  )
}

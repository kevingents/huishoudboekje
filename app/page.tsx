'use client'

import Link from 'next/link'
import {
  Sun,
  UtensilsCrossed,
  Clock,
  Users,
  Milk,
  ChevronRight,
  Baby,
  Plus,
  Sparkles,
} from 'lucide-react'

import DashboardCard from '@/components/DashboardCard'
import BudgetCard from '@/components/BudgetCard'
import AgendaCard from '@/components/AgendaCard'
import ShoppingList from '@/components/ShoppingList'
import NotificationBell from '@/components/NotificationBell'
import { useFamily, useRecipes, useWeather, useAuth } from '@/lib/hooks'
import { resolveWeatherIcon } from '@/lib/icons'

import { family, today, stockAlert, diaperStock, aiSuggestion } from '@/lib/mockData'

export default function Home() {
  const { members } = useFamily()
  const { recipes } = useRecipes()
  const { weather } = useWeather()
  const { user } = useAuth()
  const WeatherIcon = resolveWeatherIcon(weather?.icon ?? 'Cloud')
  const recipe = recipes[0]
  const greetingName = user?.name.split(' ')[0] ?? family.greetingName

  return (
    <>
      {/* ------------------------------------------------------------------ */}
      {/*  Header                                                            */}
      {/* ------------------------------------------------------------------ */}
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-amber-100 text-amber-500">
            <Sun className="h-7 w-7" strokeWidth={2.2} />
          </span>
          <div>
            <h1 className="text-xl font-extrabold text-slate-800 sm:text-2xl">
              Goedemorgen, {greetingName}!
            </h1>
            <p className="text-sm text-slate-500">
              {today.weekday} {today.date}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 sm:gap-4">
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

          <NotificationBell />
        </div>
      </header>

      {/* ------------------------------------------------------------------ */}
      {/*  Dashboard grid                                                    */}
      {/* ------------------------------------------------------------------ */}
      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-2">
        {/* Recipe of the day */}
        <DashboardCard title="Vandaag eten we dit" icon={UtensilsCrossed}>
          <div className="relative mb-4 aspect-[16/10] overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-100 to-amber-100">
            {recipe && (
              <img
                src={recipe.image}
                alt={recipe.title}
                loading="lazy"
                className="h-full w-full object-cover"
              />
            )}
          </div>
          <h3 className="text-lg font-bold text-slate-800">
            {recipe ? recipe.title : 'Nog geen recept gekozen'}
          </h3>
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
          <Link
            href="/recepten"
            className="pill mt-4 bg-brand-light px-4 py-2.5 text-brand hover:bg-emerald-100"
          >
            Bekijk recepten
          </Link>
        </DashboardCard>

        {/* Right column of row 1: milk reminder + budget */}
        <div className="flex flex-col gap-5">
          {/* Milk almost out */}
          <DashboardCard bg="bg-indigo-50/70" bordered={false} className="ring-1 ring-indigo-100">
            <Link href="/boodschappen" className="flex w-full items-center gap-4 text-left">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-white text-indigo-500 shadow-sm">
                <Milk className="h-6 w-6" strokeWidth={2.2} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-base font-bold text-slate-800">{stockAlert.title}</span>
                <span className="block text-sm text-slate-500">{stockAlert.subtitle}</span>
              </span>
              <ChevronRight className="h-5 w-5 shrink-0 text-slate-400" />
            </Link>
          </DashboardCard>

          <BudgetCard />
        </div>

        {/* Weather (live via Open-Meteo) */}
        <DashboardCard bg="bg-weather" bordered={false}>
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
              <p className="text-sm text-slate-500">
                {weather ? `${weather.low}° / ${weather.high}°` : ''}
              </p>
            </div>
          </div>
          {weather?.wet && (
            <>
              <p className="mt-4 font-semibold text-slate-700">Voetbaltraining afgelast?</p>
              <div className="mt-3 flex flex-wrap gap-3">
                <button
                  type="button"
                  className="pill border border-sky-200 bg-white px-5 py-2.5 text-slate-700 hover:bg-sky-50"
                >
                  Afgelasten
                </button>
                <button
                  type="button"
                  className="pill bg-sky-500 px-5 py-2.5 text-white shadow-sm shadow-sky-500/30 hover:bg-sky-600"
                >
                  Training gaat door
                </button>
              </div>
            </>
          )}
        </DashboardCard>

        {/* Upcoming appointments */}
        <AgendaCard />

        {/* Diaper stock */}
        <DashboardCard>
          <div className="flex items-center gap-4">
            <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-orange-100 text-stock">
              <Baby className="h-7 w-7" strokeWidth={2.1} />
            </span>
            <div>
              <p className="text-base font-bold text-slate-800">{diaperStock.title}</p>
              <p className="text-sm font-semibold text-stock">nog {diaperStock.daysLeft} dagen</p>
            </div>
          </div>
          <div className="mt-4 h-2.5 w-full overflow-hidden rounded-full bg-orange-100">
            <div
              className="h-full rounded-full bg-stock transition-all"
              style={{ width: `${diaperStock.percent}%` }}
            />
          </div>
          <Link
            href="/boodschappen"
            className="pill mt-4 w-full border border-orange-200 bg-orange-50 px-4 py-2.5 text-stock hover:bg-orange-100 sm:w-auto"
          >
            <Plus className="h-4 w-4" />
            Toevoegen aan boodschappen
          </Link>
        </DashboardCard>

        {/* AI suggestion */}
        <DashboardCard
          title="Suggestie van je AI-assistent"
          icon={Sparkles}
          iconClassName="text-violet-500"
          bg="bg-ai"
          bordered={false}
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="relative aspect-[4/3] w-full shrink-0 overflow-hidden rounded-2xl bg-gradient-to-br from-violet-100 to-amber-100 sm:h-24 sm:w-28">
              <img
                src={aiSuggestion.image}
                alt="Lasagne"
                loading="lazy"
                className="h-full w-full object-cover"
              />
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

        {/* Shopping list (full width) */}
        <ShoppingList className="lg:col-span-2" />
      </div>
    </>
  )
}

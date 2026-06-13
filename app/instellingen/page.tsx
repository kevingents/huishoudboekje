'use client'

import { useEffect, useState } from 'react'
import { Settings, Bell, BellRing, Wallet, Users, LogOut, UserCircle, Sparkles, Smartphone, Download, Share, Check, Accessibility, Trash2, ShieldCheck, CalendarClock } from 'lucide-react'
import Link from 'next/link'
import PageHeader from '@/components/PageHeader'
import DashboardCard from '@/components/DashboardCard'
import IntegrationsSection from '@/components/IntegrationsSection'
import CoParentCard from '@/components/CoParentCard'
import ProfileCard from '@/components/ProfileCard'
import LocationCard from '@/components/LocationCard'
import { useA11y, type FontScale, type Theme } from '@/components/A11yProvider'
import { useSettings, useFamily, useAuth } from '@/lib/hooks'
import { apiDelete, apiPost } from '@/lib/api'
import { usePwaInstall } from '@/lib/usePwaInstall'
import { usePush } from '@/lib/usePush'
import { mergePrefs } from '@/lib/notifications'

const AI_DATA = [
  { key: 'agenda', label: 'Agenda', description: 'Aankomende afspraken' },
  { key: 'boodschappen', label: 'Boodschappen', description: 'Je open boodschappenlijst' },
  { key: 'budget', label: 'Budget', description: 'Categorieën en uitgaven' },
  { key: 'recepten', label: 'Recepten', description: 'Favorieten en voorkeuren' },
  { key: 'gezin', label: 'Gezin', description: 'Namen en rollen van gezinsleden' },
]

export default function InstellingenPage() {
  const { settings, setSetting } = useSettings()
  const { members } = useFamily()
  const { user, logout } = useAuth()
  const pwa = usePwaInstall()
  const push = usePush()
  const a11y = useA11y()

  const FONT_OPTIONS: [FontScale, string][] = [
    ['normaal', 'Normaal'],
    ['groot', 'Groot'],
    ['extra', 'Extra groot'],
  ]
  const THEME_OPTIONS: [Theme, string][] = [
    ['licht', 'Licht'],
    ['donker', 'Donker'],
    ['systeem', 'Systeem'],
  ]

  const prefs = mergePrefs(settings.notifications)
  const savedTarget = typeof settings.budgetTarget === 'number' ? settings.budgetTarget : 500
  const savedPeriodStart = typeof settings.budgetPeriodStart === 'number' ? settings.budgetPeriodStart : 1

  // AI-instellingen (standaard aan; alle data toegestaan tenzij uitgezet).
  const aiEnabled = settings.aiEnabled !== false
  const aiDataRaw = (settings.aiData ?? {}) as Record<string, boolean>
  const aiAllows = (key: string) => aiDataRaw[key] !== false
  const setAiData = (key: string, value: boolean) => {
    const next: Record<string, boolean> = {}
    for (const d of AI_DATA) next[d.key] = d.key === key ? value : aiAllows(d.key)
    setSetting('aiData', next)
  }

  const [target, setTarget] = useState(savedTarget)
  useEffect(() => setTarget(savedTarget), [savedTarget])
  const [periodStart, setPeriodStart] = useState(savedPeriodStart)
  useEffect(() => setPeriodStart(savedPeriodStart), [savedPeriodStart])

  // Testmelding voor push (verifieert VAPID-keys + abonnement end-to-end).
  const [pushTestBusy, setPushTestBusy] = useState(false)
  const [pushTestMsg, setPushTestMsg] = useState<string | null>(null)
  const sendTestPush = async () => {
    setPushTestBusy(true)
    setPushTestMsg(null)
    try {
      await apiPost('/api/push/test', {})
      setPushTestMsg('Verstuurd — de melding verschijnt binnen enkele seconden op dit apparaat.')
    } catch (e) {
      setPushTestMsg(e instanceof Error ? e.message : 'Versturen mislukt.')
    } finally {
      setPushTestBusy(false)
    }
  }

  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleteBusy, setDeleteBusy] = useState(false)
  const deleteAccount = async () => {
    setDeleteBusy(true)
    try {
      await apiDelete('/api/household')
      window.location.href = '/inloggen'
    } catch {
      setDeleteBusy(false)
    }
  }

  const setChannel = (key: string, channel: 'inApp' | 'email', value: boolean) => {
    const next = prefs.map((p) => (p.key === key ? { ...p, [channel]: value } : p))
    setSetting('notifications', next)
  }

  return (
    <>
      <PageHeader
        title="Instellingen"
        subtitle="Beheer je gezinsdashboard"
        icon={Settings}
        iconClassName="bg-slate-100 text-slate-600"
      />

      <div className="flex flex-col gap-5">
        {/* Mijn profiel */}
        <ProfileCard />

        {/* Notifications */}
        <DashboardCard title="Notificaties" icon={Bell} iconClassName="text-amber-500">
          <div className="mb-1 flex items-center gap-3 pb-1">
            <span className="flex-1" />
            <span className="w-12 text-center text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              In-app
            </span>
            <span className="w-12 text-center text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              E-mail
            </span>
          </div>
          <ul className="flex flex-col">
            {prefs.map((item, index) => (
              <li key={item.key}>
                <div className="flex items-center gap-3 py-3.5">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-slate-800">{item.label}</p>
                    <p className="text-xs text-slate-500">{item.description}</p>
                  </div>
                  <div className="grid w-12 place-items-center">
                    <Toggle
                      enabled={item.inApp}
                      onClick={() => setChannel(item.key, 'inApp', !item.inApp)}
                      label={`${item.label} in-app`}
                    />
                  </div>
                  <div className="grid w-12 place-items-center">
                    <Toggle
                      enabled={item.email}
                      onClick={() => setChannel(item.key, 'email', !item.email)}
                      label={`${item.label} e-mail`}
                    />
                  </div>
                </div>
                {index < prefs.length - 1 && <hr className="border-cardborder" />}
              </li>
            ))}
          </ul>
        </DashboardCard>

        {/* Pushmeldingen */}
        <DashboardCard title="Pushmeldingen" icon={BellRing} iconClassName="text-amber-500">
          {!push.configured ? (
            <p className="text-sm text-slate-500">
              Pushmeldingen zijn nog niet ingesteld op de server (VAPID-sleutels ontbreken).
            </p>
          ) : !push.supported ? (
            <p className="text-sm text-slate-500">
              Dit apparaat ondersteunt geen pushmeldingen. Op de iPhone werkt het alleen als Fam op
              je beginscherm staat.
            </p>
          ) : (
            <>
              <div className="flex items-center gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-800">Meldingen op dit apparaat</p>
                  <p className="text-xs text-slate-500">
                    Krijg een seintje op je telefoon, ook als de app dicht is.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => (push.subscribed ? push.disable() : push.enable())}
                  disabled={push.busy}
                  className={`pill px-4 py-2 text-sm font-semibold disabled:opacity-50 ${
                    push.subscribed
                      ? 'border border-cardborder bg-white text-slate-600 hover:bg-slate-50'
                      : 'bg-brand text-white shadow-sm shadow-brand/20 hover:bg-brand-dark'
                  }`}
                >
                  {push.busy ? 'Bezig…' : push.subscribed ? 'Uitzetten' : 'Aanzetten'}
                </button>
              </div>
              {push.subscribed && (
                <div className="mt-3 border-t border-cardborder pt-3">
                  <button
                    type="button"
                    disabled={pushTestBusy}
                    onClick={sendTestPush}
                    className="pill bg-amber-50 px-3.5 py-2 text-sm font-semibold text-amber-700 ring-1 ring-amber-200 hover:bg-amber-100 disabled:opacity-50 dark:text-amber-300 dark:ring-amber-800/50"
                  >
                    <BellRing className={`h-4 w-4 ${pushTestBusy ? 'animate-pulse' : ''}`} />
                    {pushTestBusy ? 'Versturen…' : 'Stuur testmelding'}
                  </button>
                  {pushTestMsg && <p className="mt-1.5 text-xs font-medium text-slate-500">{pushTestMsg}</p>}
                </div>
              )}
            </>
          )}
        </DashboardCard>

        {/* Toegankelijkheid */}
        <DashboardCard title="Toegankelijkheid" icon={Accessibility} iconClassName="text-sky-500">
          <div className="flex flex-col gap-4">
            <div>
              <p className="text-sm font-semibold text-slate-800">Thema</p>
              <p className="mb-2 text-xs text-slate-500">Licht, donker of automatisch volgens je apparaat.</p>
              <div className="inline-flex flex-wrap gap-1 rounded-full bg-slate-100 p-1">
                {THEME_OPTIONS.map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => a11y.setTheme(value)}
                    aria-pressed={a11y.theme === value}
                    className={`rounded-full px-3 py-1.5 text-sm font-semibold transition-colors ${
                      a11y.theme === value ? 'bg-white text-brand shadow-sm' : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <hr className="border-cardborder" />

            <div>
              <p className="text-sm font-semibold text-slate-800">Lettergrootte</p>
              <p className="mb-2 text-xs text-slate-500">Maakt alle tekst en knoppen in de app groter.</p>
              <div className="inline-flex flex-wrap gap-1 rounded-full bg-slate-100 p-1">
                {FONT_OPTIONS.map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => a11y.setFontScale(value)}
                    aria-pressed={a11y.fontScale === value}
                    className={`rounded-full px-3 py-1.5 text-sm font-semibold transition-colors ${
                      a11y.fontScale === value
                        ? 'bg-white text-brand shadow-sm'
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <hr className="border-cardborder" />

            <div className="flex items-center gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-slate-800">Hoog contrast</p>
                <p className="text-xs text-slate-500">Donkerdere tekst en sterkere randen voor betere leesbaarheid.</p>
              </div>
              <Toggle
                enabled={a11y.highContrast}
                onClick={() => a11y.setHighContrast(!a11y.highContrast)}
                label="Hoog contrast aan of uit"
              />
            </div>

            <hr className="border-cardborder" />

            <div className="flex items-center gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-slate-800">Minder beweging</p>
                <p className="text-xs text-slate-500">Zet animaties en overgangen uit.</p>
              </div>
              <Toggle
                enabled={a11y.reduceMotion}
                onClick={() => a11y.setReduceMotion(!a11y.reduceMotion)}
                label="Minder beweging aan of uit"
              />
            </div>

            <p className="text-[11px] text-slate-400">Deze instellingen gelden alleen op dit apparaat.</p>
          </div>
        </DashboardCard>

        {/* AI-assistent: aan/uit + welke gegevens */}
        <DashboardCard title="AI-assistent" icon={Sparkles} iconClassName="text-violet-500">
          <div className="flex items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-slate-800">AI-assistent gebruiken</p>
              <p className="text-xs text-slate-500">
                Persoonlijke antwoorden op basis van jullie eigen gegevens.
              </p>
            </div>
            <Toggle
              enabled={aiEnabled}
              onClick={() => setSetting('aiEnabled', !aiEnabled)}
              label="AI-assistent aan of uit"
            />
          </div>

          {aiEnabled && (
            <>
              <hr className="my-4 border-cardborder" />
              <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                Welke gegevens mag de AI gebruiken?
              </p>
              <ul className="flex flex-col">
                {AI_DATA.map((d, index) => (
                  <li key={d.key}>
                    <div className="flex items-center gap-3 py-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-slate-800">{d.label}</p>
                        <p className="text-xs text-slate-500">{d.description}</p>
                      </div>
                      <Toggle
                        enabled={aiAllows(d.key)}
                        onClick={() => setAiData(d.key, !aiAllows(d.key))}
                        label={`${d.label} voor AI`}
                      />
                    </div>
                    {index < AI_DATA.length - 1 && <hr className="border-cardborder" />}
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-xs text-slate-400">
                Voor kinderen kun je de AI helemaal uitzetten met de schakelaar bovenaan.
              </p>
            </>
          )}
        </DashboardCard>

        {/* Budget target */}
        <DashboardCard title="Maandbudget boodschappen" icon={Wallet} iconClassName="text-brand">
          <p className="text-sm text-slate-500">
            Stel je maandelijkse target in. Je krijgt een seintje bij 90%.
          </p>
          <div className="mt-4 flex items-center gap-4">
            <span className="w-20 text-2xl font-extrabold text-slate-800">€{target}</span>
            <input
              type="range"
              min={200}
              max={1000}
              step={25}
              value={target}
              onChange={(e) => setTarget(Number(e.target.value))}
              onPointerUp={() => setSetting('budgetTarget', target)}
              onKeyUp={() => setSetting('budgetTarget', target)}
              className="h-2 flex-1 cursor-pointer appearance-none rounded-full bg-slate-100 accent-brand"
              aria-label="Maandbudget"
            />
          </div>
          <div className="mt-1 flex justify-between text-xs text-slate-400">
            <span>€200</span>
            <span>€1000</span>
          </div>
        </DashboardCard>

        {/* Budgetperiode (salarisdag) */}
        <DashboardCard title="Budgetperiode" icon={CalendarClock} iconClassName="text-violet-500">
          <p className="text-sm text-slate-500">
            Begint je geldmaand op je salarisdag i.p.v. de 1e? Stel hier de startdag in. Je periode loopt dan
            bijvoorbeeld van de 25e t/m de 24e — handig als je rond die dag betaald wordt.
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <label htmlFor="periodStart" className="text-sm font-semibold text-slate-600">
              Periode start op de
            </label>
            <select
              id="periodStart"
              value={periodStart}
              onChange={(e) => {
                const v = Number(e.target.value)
                setPeriodStart(v)
                setSetting('budgetPeriodStart', v)
              }}
              className="rounded-xl border border-cardborder bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-brand/40 focus:ring-2 focus:ring-brand/20"
            >
              <option value={1}>1e (kalendermaand)</option>
              {Array.from({ length: 27 }, (_, i) => i + 2).map((d) => (
                <option key={d} value={d}>
                  {d}e van de maand
                </option>
              ))}
            </select>
          </div>
          <p className="mt-2 text-xs text-slate-400">
            Het budgetscherm groepeert je uitgaven en gemiddelden dan op deze periodes.
          </p>
        </DashboardCard>

        {/* Locatie (woonplaats → weer + uitjes) */}
        <LocationCard />

        {/* Integraties */}
        <IntegrationsSection />

        {/* Family */}
        <DashboardCard title="Gezin" icon={Users} iconClassName="text-emerald-500">
          <div className="flex items-center gap-3">
            <div className="flex -space-x-3">
              {members.map((member) => (
                <span
                  key={member.id}
                  title={member.name}
                  className={`grid h-10 w-10 place-items-center rounded-full border-2 border-white bg-gradient-to-br text-xs font-bold text-white shadow-sm ${member.color}`}
                >
                  {member.initials}
                </span>
              ))}
            </div>
            <p className="text-sm text-slate-600">{members.length} gezinsleden</p>
          </div>
          <Link
            href="/gezin"
            className="pill mt-4 w-full border border-cardborder bg-white px-4 py-2.5 text-slate-700 hover:bg-slate-50 sm:w-auto"
          >
            Gezinsleden beheren
          </Link>
        </DashboardCard>

        {/* Co-ouderschap */}
        <CoParentCard />

        {/* App installeren */}
        <DashboardCard title="App installeren" icon={Smartphone} iconClassName="text-sky-500">
          {pwa.isStandalone ? (
            <p className="flex items-center gap-2 text-sm font-medium text-emerald-600">
              <Check className="h-4 w-4" /> Fam is geïnstalleerd op dit apparaat.
            </p>
          ) : pwa.canInstall ? (
            <>
              <p className="text-sm text-slate-500">
                Zet Fam als app op je beginscherm — snel en zonder appstore.
              </p>
              <button
                type="button"
                onClick={() => pwa.install()}
                className="pill mt-4 bg-brand px-4 py-2.5 text-white shadow-sm shadow-brand/20 hover:bg-brand-dark sm:w-auto"
              >
                <Download className="h-4 w-4" />
                Nu installeren
              </button>
            </>
          ) : pwa.isIosChrome ? (
            <p className="text-sm text-slate-500">
              Open Fam in <strong>Safari</strong> op je iPhone en kies dan het deel-icoon →{' '}
              &lsquo;Zet op beginscherm&rsquo;. In Chrome op iOS kan installeren helaas niet.
            </p>
          ) : pwa.isIos ? (
            <p className="text-sm text-slate-500">
              Tik onderin op het deel-icoon <Share className="inline h-4 w-4 text-sky-500" /> en kies{' '}
              &lsquo;Zet op beginscherm&rsquo;.
            </p>
          ) : (
            <p className="text-sm text-slate-500">
              Gebruik het menu van je browser (&lsquo;Installeren&rsquo; of &lsquo;Toevoegen aan
              beginscherm&rsquo;) om Fam als app te installeren.
            </p>
          )}
        </DashboardCard>

        {/* Account */}
        <DashboardCard title="Account" icon={UserCircle} iconClassName="text-slate-600">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-brand to-emerald-600 text-sm font-bold text-white">
              {(user?.name ?? '·').slice(0, 1).toUpperCase()}
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-800">{user?.name ?? '…'}</p>
              <p className="truncate text-xs text-slate-500">{user?.email ?? ''}</p>
            </div>
          </div>
          <div className="mt-4 flex flex-col gap-2">
            <a
              href="/api/account/export"
              className="pill w-full justify-center border border-cardborder bg-white px-4 py-2.5 text-slate-700 hover:bg-slate-50 sm:w-auto sm:justify-start"
            >
              <Download className="h-4 w-4" />
              Mijn gegevens downloaden
            </a>
            <button
              type="button"
              onClick={logout}
              className="pill w-full justify-center border border-cardborder bg-white px-4 py-2.5 text-slate-700 hover:bg-rose-50 hover:text-rose-600 sm:w-auto sm:justify-start"
            >
              <LogOut className="h-4 w-4" />
              Uitloggen
            </button>
          </div>

          {user?.role === 'owner' &&
            (confirmDelete ? (
              <div className="mt-3 rounded-2xl border border-rose-200 bg-rose-50 p-3">
                <p className="text-sm font-semibold text-rose-700">
                  Account én alle gezinsgegevens verwijderen?
                </p>
                <p className="mt-1 text-xs text-rose-600">
                  Dit kan niet ongedaan worden gemaakt. Agenda, budget, documenten, gezinsmail — alles
                  van het hele gezin wordt definitief gewist.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={deleteAccount}
                    disabled={deleteBusy}
                    className="pill bg-rose-600 px-3 py-2 text-xs font-semibold text-white hover:bg-rose-700 disabled:opacity-50"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    {deleteBusy ? 'Bezig…' : 'Ja, definitief verwijderen'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(false)}
                    className="pill border border-cardborder bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                  >
                    Annuleren
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="pill mt-2 w-full justify-center border border-rose-200 bg-white px-4 py-2.5 text-rose-600 hover:bg-rose-50 sm:w-auto sm:justify-start"
              >
                <Trash2 className="h-4 w-4" />
                Account verwijderen
              </button>
            ))}

          <div className="mt-4 flex items-center gap-4 border-t border-cardborder pt-3 text-xs">
            <Link href="/privacy" className="inline-flex items-center gap-1 text-slate-500 hover:text-brand">
              <ShieldCheck className="h-3.5 w-3.5" />
              Privacybeleid
            </Link>
            <Link href="/voorwaarden" className="text-slate-500 hover:text-brand">
              Voorwaarden
            </Link>
          </div>
        </DashboardCard>

        <p className="px-1 text-center text-xs text-slate-400">Fam · versie 0.1.0</p>
      </div>
    </>
  )
}

function Toggle({ enabled, onClick, label }: { enabled: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      aria-label={label}
      onClick={onClick}
      className={[
        'relative h-7 w-12 shrink-0 rounded-full transition-colors',
        enabled ? 'bg-brand' : 'bg-slate-200',
      ].join(' ')}
    >
      <span
        className={[
          'absolute top-1 h-5 w-5 rounded-full bg-white shadow-sm transition-all',
          enabled ? 'left-6' : 'left-1',
        ].join(' ')}
      />
    </button>
  )
}

'use client'

import { useEffect, useState } from 'react'
import { Settings, Bell, BellRing, Wallet, Users, LogOut, UserCircle, Sparkles, Smartphone, Download, Share, Check } from 'lucide-react'
import Link from 'next/link'
import PageHeader from '@/components/PageHeader'
import DashboardCard from '@/components/DashboardCard'
import IntegrationsSection from '@/components/IntegrationsSection'
import { useSettings, useFamily, useAuth } from '@/lib/hooks'
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

  const prefs = mergePrefs(settings.notifications)
  const savedTarget = typeof settings.budgetTarget === 'number' ? settings.budgetTarget : 500

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
          )}
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
          <button
            type="button"
            onClick={logout}
            className="pill mt-4 w-full border border-cardborder bg-white px-4 py-2.5 text-slate-700 hover:bg-rose-50 hover:text-rose-600 sm:w-auto"
          >
            <LogOut className="h-4 w-4" />
            Uitloggen
          </button>
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

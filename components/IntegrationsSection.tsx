'use client'

import { useState } from 'react'
import { Plug, RefreshCw, Plus, Trash2, CalendarClock } from 'lucide-react'
import DashboardCard from './DashboardCard'
import { useIntegrations } from '@/lib/hooks'
import { apiPost } from '@/lib/api'
import type { Integration } from '@/lib/types'

const statusMeta: Record<string, { label: string; className: string }> = {
  connected: { label: 'Gekoppeld', className: 'bg-emerald-100 text-emerald-600' },
  disconnected: { label: 'Niet gekoppeld', className: 'bg-slate-100 text-slate-500' },
  coming_soon: { label: 'Binnenkort', className: 'bg-amber-100 text-amber-600' },
}

const hints: Record<string, string> = {
  weather: 'Live weer via Open-Meteo. Geen sleutel nodig.',
  ical: 'Koppel je Google-, Outlook-, Apple- of Parro-agenda via een iCal-URL.',
  ai: 'Echte AI-antwoorden via Claude. Vul ANTHROPIC_API_KEY in (.env.local).',
  mollie: 'Terugkerende betalingen. Vul MOLLIE_API_KEY in (.env.local). Een test-key kan.',
  supermarkt: 'Automatisch bestellen bij de supermarkt — nog niet beschikbaar.',
}

// 'mollie' en 'ai' zijn operator-/platformconfig (betalingen lopen bij ons binnen,
// AI-sleutel is backend) — niet relevant voor de gebruiker, dus niet tonen.
const HIDDEN_INTEGRATIONS = new Set(['mollie', 'ai'])

export default function IntegrationsSection() {
  const { integrations, isLoading, updateIntegration } = useIntegrations()
  const visible = integrations.filter((i) => !HIDDEN_INTEGRATIONS.has(i.key))

  return (
    <DashboardCard title="Integraties" icon={Plug} iconClassName="text-sky-500">
      {isLoading && visible.length === 0 ? (
        <p className="text-sm text-slate-400">Laden…</p>
      ) : (
        <ul className="flex flex-col">
          {visible.map((integration, index) => (
            <li key={integration.key}>
              <IntegrationRow integration={integration} onUpdate={updateIntegration} />
              {index < visible.length - 1 && <hr className="border-cardborder" />}
            </li>
          ))}
        </ul>
      )}
    </DashboardCard>
  )
}

function IntegrationRow({
  integration,
  onUpdate,
}: {
  integration: Integration
  onUpdate: (key: string, payload: { config?: unknown }) => Promise<void>
}) {
  const meta = statusMeta[integration.status] ?? statusMeta.disconnected
  const isIcal = integration.key === 'ical'

  return (
    <div className="py-3.5">
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-slate-800">{integration.name}</p>
          <p className="text-xs text-slate-500">{hints[integration.key]}</p>
        </div>
        <span className={`pill px-2.5 py-1 text-xs font-semibold ${meta.className}`}>{meta.label}</span>
      </div>

      {isIcal && <IcalConfig integration={integration} onUpdate={onUpdate} />}
    </div>
  )
}

function IcalConfig({
  integration,
  onUpdate,
}: {
  integration: Integration
  onUpdate: (key: string, payload: { config?: unknown }) => Promise<void>
}) {
  const feeds: { url: string; label: string }[] = ((integration.config?.urls as unknown[] | undefined) ?? [])
    .map((e) =>
      typeof e === 'string'
        ? { url: e, label: 'Agenda' }
        : {
            url: String((e as { url?: unknown })?.url ?? ''),
            label: String((e as { label?: unknown })?.label || 'Agenda'),
          },
    )
    .filter((f) => f.url)
  const [draftUrl, setDraftUrl] = useState('')
  const [draftLabel, setDraftLabel] = useState('Agenda')
  const [syncing, setSyncing] = useState(false)
  const [result, setResult] = useState<string | null>(null)

  const save = (next: { url: string; label: string }[]) => onUpdate('ical', { config: { urls: next } })

  const add = async () => {
    const url = draftUrl.trim()
    if (!url) return
    await save([...feeds, { url, label: draftLabel.trim() || 'Agenda' }])
    setDraftUrl('')
    setDraftLabel('Agenda')
  }

  const remove = (url: string) => save(feeds.filter((f) => f.url !== url))

  const sync = async () => {
    setSyncing(true)
    setResult(null)
    try {
      const res = (await apiPost('/api/ical/sync', {})) as { synced: number }
      setResult(`Gesynchroniseerd: ${res.synced} afspraken.`)
    } catch (e) {
      setResult(`Sync mislukt: ${String(e)}`)
    } finally {
      setSyncing(false)
    }
  }

  return (
    <div className="mt-3 rounded-2xl bg-slate-50 p-3">
      <div className="mb-2.5 rounded-xl bg-sky-50 px-3 py-2 text-[11px] leading-relaxed text-slate-600 ring-1 ring-sky-100">
        <p className="font-semibold text-slate-700">Waar vind ik mijn iCal-URL?</p>
        <p className="mt-0.5">
          <span className="font-semibold">Google Agenda:</span> agenda-instellingen → kopieer het{' '}
          <span className="font-semibold">Geheime adres in iCal-indeling</span>. Het openbare adres
          werkt alleen als je agenda openbaar staat — gebruik dus het geheime adres.
        </p>
        <p className="mt-0.5">
          <span className="font-semibold">Outlook / Apple:</span> kopieer de gedeelde ICS-link en plak die hieronder.
        </p>
        <p className="mt-0.5">
          <span className="font-semibold">Parro (schoolagenda):</span> open Parro → <span className="font-semibold">Agenda</span> →{' '}
          <span className="font-semibold">Abonneren / iCal-link kopiëren</span>, plak hieronder en kies het label{' '}
          <span className="font-semibold">School</span>. Schoolafspraken verschijnen dan met een eigen kleur in jullie agenda.
        </p>
      </div>

      {feeds.length > 0 && (
        <ul className="mb-2 flex flex-col gap-1.5">
          {feeds.map((feed) => (
            <li key={feed.url} className="flex items-center gap-2 text-xs text-slate-600">
              <CalendarClock className="h-3.5 w-3.5 shrink-0 text-slate-400" />
              <span className="shrink-0 rounded-full bg-slate-100 px-1.5 py-0.5 font-semibold text-slate-500">
                {feed.label}
              </span>
              <span className="min-w-0 flex-1 truncate">{feed.url}</span>
              <button
                type="button"
                onClick={() => remove(feed.url)}
                aria-label="Feed verwijderen"
                className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-slate-400 hover:bg-rose-50 hover:text-rose-500 sm:h-6 sm:w-6"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-wrap gap-2">
        <input
          value={draftUrl}
          onChange={(e) => setDraftUrl(e.target.value)}
          placeholder="Plak je iCal-URL (https://…)"
          className="min-w-0 flex-1 rounded-full border border-cardborder bg-white px-3.5 py-2 text-xs text-slate-700 outline-none placeholder:text-slate-400 focus:border-brand/40 focus:ring-2 focus:ring-brand/20"
        />
        <select
          value={draftLabel}
          onChange={(e) => setDraftLabel(e.target.value)}
          aria-label="Label voor deze agenda"
          className="rounded-full border border-cardborder bg-white px-3 py-2 text-xs text-slate-700 outline-none focus:border-brand/40 focus:ring-2 focus:ring-brand/20"
        >
          <option value="Agenda">Agenda</option>
          <option value="School">School (Parro)</option>
          <option value="Werk">Werk</option>
          <option value="Sport">Sport</option>
        </select>
        <button
          type="button"
          onClick={add}
          className="pill bg-white px-3 py-2 text-xs text-slate-700 ring-1 ring-cardborder hover:bg-slate-100"
        >
          <Plus className="h-3.5 w-3.5" />
          Toevoegen
        </button>
        <button
          type="button"
          onClick={sync}
          disabled={syncing || feeds.length === 0}
          className="pill bg-brand px-3 py-2 text-xs text-white hover:bg-brand-dark disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${syncing ? 'animate-spin' : ''}`} />
          Synchroniseren
        </button>
      </div>

      {result && <p className="mt-2 text-xs text-slate-500">{result}</p>}
    </div>
  )
}

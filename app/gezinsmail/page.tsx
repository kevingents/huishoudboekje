'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  Mail,
  Inbox,
  Copy,
  Check,
  Trash2,
  ShieldCheck,
  FileText,
  Calendar,
  ShoppingCart,
  Paperclip,
  ArrowRight,
  Sparkles,
  Forward,
  Receipt,
} from 'lucide-react'
import PageHeader from '@/components/PageHeader'
import DashboardCard from '@/components/DashboardCard'
import ModuleGate from '@/components/ModuleGate'
import { useMail, type MailItem } from '@/lib/hooks'

const categoryMeta: Record<
  string,
  { label: string; className: string; icon: typeof Mail; href?: string }
> = {
  factuur: { label: 'Factuur', className: 'bg-emerald-100 text-emerald-600', icon: Receipt, href: '/documenten' },
  garantie: { label: 'Garantie', className: 'bg-amber-100 text-amber-600', icon: ShieldCheck, href: '/documenten' },
  document: { label: 'Document', className: 'bg-sky-100 text-sky-600', icon: FileText, href: '/documenten' },
  afspraak: { label: 'Afspraak', className: 'bg-violet-100 text-violet-600', icon: Calendar, href: '/agenda' },
  boodschap: { label: 'Boodschap', className: 'bg-emerald-100 text-emerald-600', icon: ShoppingCart, href: '/boodschappen' },
  overig: { label: 'Overig', className: 'bg-slate-100 text-slate-500', icon: Mail },
}

const filedHref: Record<string, string> = {
  document: '/documenten',
  agenda: '/agenda',
  shopping: '/boodschappen',
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const min = Math.round(diff / 60000)
  if (min < 1) return 'zojuist'
  if (min < 60) return `${min} min geleden`
  const hr = Math.round(min / 60)
  if (hr < 24) return `${hr} uur geleden`
  const day = Math.round(hr / 24)
  return `${day} ${day === 1 ? 'dag' : 'dagen'} geleden`
}

export default function GezinsmailPage() {
  return (
    <>
      <PageHeader
        title="Gezinsmail"
        subtitle="Stuur facturen, garanties en afspraken door — wij zetten ze goed"
        icon={Mail}
        iconClassName="bg-sky-100 text-sky-500"
      />
      <ModuleGate module="gezinsmail">
        <GezinsmailContent />
      </ModuleGate>
    </>
  )
}

function GezinsmailContent() {
  const { address, items, isLoading, setStatus, remove } = useMail()
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(address)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      /* clipboard niet beschikbaar */
    }
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Adres + uitleg */}
      <DashboardCard
        title="Jullie gezinsmail-adres"
        icon={Inbox}
        iconClassName="text-sky-500"
        bg="bg-gradient-to-br from-sky-50 to-white"
      >
        <p className="text-sm text-slate-600">
          Stuur (of laat automatisch doorsturen) facturen, garantiebewijzen, afspraakbevestigingen en
          boodschappenlijstjes naar dit adres. De AI leest mee en zet alles op de juiste plek.
        </p>

        <div className="mt-3 flex items-center gap-2 rounded-2xl bg-white p-2 ring-1 ring-sky-100">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-sky-100 text-sky-500">
            <Mail className="h-4 w-4" />
          </span>
          <span className="min-w-0 flex-1 truncate font-mono text-sm font-semibold text-slate-700">
            {address || '…'}
          </span>
          <button
            type="button"
            onClick={copy}
            disabled={!address}
            className="pill shrink-0 bg-sky-500 px-3 py-2 text-xs font-semibold text-white hover:bg-sky-600 disabled:opacity-50"
          >
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? 'Gekopieerd' : 'Kopieer'}
          </button>
        </div>

        <div className="mt-4 grid gap-2.5 sm:grid-cols-3">
          <Step icon={Forward} title="1. Doorsturen" text="Mail of stuur door naar het adres hierboven." />
          <Step icon={Sparkles} title="2. AI sorteert" text="Garantie, document, afspraak of boodschap." />
          <Step icon={Check} title="3. Klaar" text="Staat automatisch op de juiste plek, met melding." />
        </div>
      </DashboardCard>

      {/* Inbox */}
      <DashboardCard title="Ontvangen" icon={Mail} iconClassName="text-slate-400">
        {isLoading && items.length === 0 ? (
          <p className="text-sm text-slate-400">Laden…</p>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-8 text-center">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-slate-100 text-slate-300">
              <Inbox className="h-6 w-6" />
            </span>
            <p className="text-sm text-slate-500">
              Nog niets ontvangen. Stuur een testmail naar het adres hierboven — binnen een paar
              tellen verschijnt hij hier.
            </p>
          </div>
        ) : (
          <ul className="flex flex-col divide-y divide-cardborder">
            {items.map((item) => (
              <MailRow key={item.id} item={item} onStatus={setStatus} onRemove={remove} />
            ))}
          </ul>
        )}
      </DashboardCard>
    </div>
  )
}

function Step({ icon: Icon, title, text }: { icon: typeof Mail; title: string; text: string }) {
  return (
    <div className="rounded-2xl bg-white/70 p-3 ring-1 ring-sky-100">
      <span className="mb-1.5 grid h-8 w-8 place-items-center rounded-xl bg-sky-100 text-sky-500">
        <Icon className="h-4 w-4" />
      </span>
      <p className="text-xs font-bold text-slate-700">{title}</p>
      <p className="text-[11px] leading-snug text-slate-500">{text}</p>
    </div>
  )
}

function MailRow({
  item,
  onStatus,
  onRemove,
}: {
  item: MailItem
  onStatus: (id: number, status: string) => Promise<void>
  onRemove: (id: number) => Promise<void>
}) {
  const meta = categoryMeta[item.category ?? 'overig'] ?? categoryMeta.overig
  const Icon = meta.icon
  const href = item.filedType ? filedHref[item.filedType] : meta.href
  const ignored = item.status === 'genegeerd'

  return (
    <li className={`flex items-start gap-3 py-3.5 ${ignored ? 'opacity-50' : ''}`}>
      <span className={`mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl ${meta.className}`}>
        <Icon className="h-4 w-4" />
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className={`pill px-2 py-0.5 text-[10px] font-semibold ${meta.className}`}>{meta.label}</span>
          {item.status === 'nieuw' && (
            <span className="pill bg-brand-light px-2 py-0.5 text-[10px] font-semibold text-brand">Nieuw</span>
          )}
          <span className="text-[11px] text-slate-400">{relativeTime(item.createdAt)}</span>
        </div>

        <p className="mt-1 truncate text-sm font-semibold text-slate-800">{item.subject}</p>
        <p className="truncate text-xs text-slate-500">
          van {item.fromName || item.fromAddr || 'onbekend'}
        </p>
        {item.summary && <p className="mt-1 text-xs text-slate-600">{item.summary}</p>}

        <div className="mt-2 flex flex-wrap items-center gap-2">
          {href && (
            <Link
              href={href}
              className="inline-flex items-center gap-1 text-xs font-semibold text-brand hover:underline"
            >
              Bekijken
              <ArrowRight className="h-3 w-3" />
            </Link>
          )}
          {item.attachmentUrl && (
            <a
              href={item.attachmentUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-700"
            >
              <Paperclip className="h-3 w-3" />
              {item.attachmentName || 'Bijlage'}
            </a>
          )}
          {item.status === 'nieuw' && (
            <button
              type="button"
              onClick={() => onStatus(item.id, 'verwerkt')}
              className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-brand"
            >
              <Check className="h-3 w-3" />
              Markeer verwerkt
            </button>
          )}
          {ignored ? (
            <button
              type="button"
              onClick={() => onStatus(item.id, 'nieuw')}
              className="text-xs font-semibold text-slate-400 hover:text-slate-600"
            >
              Terugzetten
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onStatus(item.id, 'genegeerd')}
              className="text-xs font-semibold text-slate-400 hover:text-slate-600"
            >
              Negeer
            </button>
          )}
        </div>
      </div>

      <button
        type="button"
        onClick={() => onRemove(item.id)}
        aria-label="Verwijderen"
        className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-slate-300 transition-colors hover:bg-rose-50 hover:text-rose-500"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </li>
  )
}

'use client'

import { useEffect, useState } from 'react'
import { Settings, Bell, Wallet, Users } from 'lucide-react'
import Link from 'next/link'
import PageHeader from '@/components/PageHeader'
import DashboardCard from '@/components/DashboardCard'
import { useSettings, useFamily } from '@/lib/hooks'
import type { NotificationSetting } from '@/lib/types'

export default function InstellingenPage() {
  const { settings, setSetting } = useSettings()
  const { members } = useFamily()

  const notifications = (settings.notifications as NotificationSetting[] | undefined) ?? []
  const savedTarget = typeof settings.budgetTarget === 'number' ? settings.budgetTarget : 500

  const [target, setTarget] = useState(savedTarget)
  useEffect(() => setTarget(savedTarget), [savedTarget])

  const toggle = (key: string) => {
    const next = notifications.map((item) =>
      item.key === key ? { ...item, enabled: !item.enabled } : item,
    )
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
          {notifications.length === 0 ? (
            <p className="text-sm text-slate-400">Laden…</p>
          ) : (
            <ul className="flex flex-col">
              {notifications.map((item, index) => (
                <li key={item.key}>
                  <div className="flex items-center gap-4 py-3.5">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-slate-800">{item.label}</p>
                      <p className="text-xs text-slate-500">{item.description}</p>
                    </div>
                    <Toggle enabled={item.enabled} onClick={() => toggle(item.key)} label={item.label} />
                  </div>
                  {index < notifications.length - 1 && <hr className="border-cardborder" />}
                </li>
              ))}
            </ul>
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

        <p className="px-1 text-center text-xs text-slate-400">Huishoudboekje · versie 0.1.0</p>
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

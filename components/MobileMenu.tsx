'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LogOut, X, ShieldCheck } from 'lucide-react'
import { sidebarNav, type NavItem } from '@/lib/mockData'
import { useAuth } from '@/lib/hooks'

/** Volledig navigatie-overzicht voor mobiel (het zijmenu is daar verborgen). */
export default function MobileMenu({ open, onClose }: { open: boolean; onClose: () => void }) {
  const pathname = usePathname()
  const { user, logout } = useAuth()

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  const items: NavItem[] = [...sidebarNav]
  if (user?.isAdmin) items.push({ label: 'Beheer', icon: ShieldCheck, href: '/beheer' })

  const isActive = (href: string) => (href === '/' ? pathname === '/' : pathname.startsWith(href))

  return (
    <div className="fixed inset-0 z-[60] lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className="absolute inset-x-0 bottom-0 max-h-[85dvh] overflow-y-auto rounded-t-3xl bg-white p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-soft">
        <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-slate-200" />

        <div className="mb-4 flex items-center justify-between">
          <span className="text-base font-extrabold text-slate-800">Menu</span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Sluiten"
            className="grid h-9 w-9 place-items-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {items.map((item) => {
            const active = isActive(item.href)
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                aria-current={active ? 'page' : undefined}
                className={`flex flex-col items-center gap-2 rounded-2xl border p-3 text-center transition-colors ${
                  active ? 'border-brand/30 bg-brand-light' : 'border-cardborder bg-white hover:bg-slate-50'
                }`}
              >
                <span
                  className={`grid h-10 w-10 place-items-center rounded-xl ${
                    active ? 'bg-brand text-white' : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  <Icon className="h-5 w-5" strokeWidth={2.1} />
                </span>
                <span className={`text-[11px] font-semibold leading-tight ${active ? 'text-brand' : 'text-slate-600'}`}>
                  {item.label}
                </span>
              </Link>
            )
          })}
        </div>

        <div className="mt-5 flex items-center gap-3 rounded-2xl bg-slate-50 p-3">
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

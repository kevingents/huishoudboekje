'use client'

import { useEffect, useRef, useState } from 'react'
import { Bell, Check, Trash2, BellOff } from 'lucide-react'
import { useNotifications } from '@/lib/hooks'

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

export default function NotificationBell() {
  const { items, unread, markRead, markAllRead, remove } = useNotifications()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', onClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-label="Notificaties"
        onClick={() => setOpen((v) => !v)}
        className="relative grid h-11 w-11 place-items-center rounded-full border border-cardborder bg-white text-slate-600 transition-colors hover:bg-slate-50"
      >
        <Bell className="h-5 w-5" strokeWidth={2.2} />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white ring-2 ring-white">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 flex max-h-[72dvh] w-80 max-w-[calc(100vw-1.5rem)] flex-col overflow-hidden rounded-card border border-cardborder bg-white shadow-soft">
          <div className="flex shrink-0 items-center justify-between border-b border-cardborder px-4 py-3">
            <p className="text-sm font-bold text-slate-800">Meldingen</p>
            {unread > 0 && (
              <button
                type="button"
                onClick={() => markAllRead()}
                className="inline-flex items-center gap-1 text-xs font-semibold text-brand hover:underline"
              >
                <Check className="h-3.5 w-3.5" />
                Alles gelezen
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto">
            {items.length === 0 ? (
              <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
                <BellOff className="h-6 w-6 text-slate-300" />
                <p className="text-sm text-slate-400">Geen meldingen.</p>
              </div>
            ) : (
              <ul className="flex flex-col">
                {items.map((n) => (
                  <li
                    key={n.id}
                    className={[
                      'group flex items-start gap-2.5 px-4 py-3 transition-colors hover:bg-slate-50',
                      n.read ? '' : 'bg-brand-light/40',
                    ].join(' ')}
                  >
                    <span
                      className={[
                        'mt-1.5 h-2 w-2 shrink-0 rounded-full',
                        n.read ? 'bg-transparent' : 'bg-brand',
                      ].join(' ')}
                    />
                    <button
                      type="button"
                      onClick={() => !n.read && markRead(n.id)}
                      className="min-w-0 flex-1 text-left"
                    >
                      <span className="block text-sm font-semibold text-slate-800">{n.title}</span>
                      {n.body && <span className="block text-xs text-slate-500">{n.body}</span>}
                      <span className="mt-0.5 block text-[11px] text-slate-400">
                        {relativeTime(n.createdAt)}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => remove(n.id)}
                      aria-label="Verwijderen"
                      className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-slate-300 opacity-100 transition-all hover:bg-rose-50 hover:text-rose-500 lg:h-7 lg:w-7 lg:opacity-0 lg:group-hover:opacity-100"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

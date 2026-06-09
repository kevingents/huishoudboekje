'use client'

import { useEffect, useState } from 'react'
import { Download, Share, X, Plus } from 'lucide-react'

/** Het beforeinstallprompt-event (alleen Chrome/Android/desktop). */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const DISMISS_KEY = 'hhb-install-dismissed'

/**
 * Toont een "voeg toe aan beginscherm"-banner. Android/Chrome krijgt een echte
 * installeer-knop (via beforeinstallprompt); iOS Safari heeft geen install-API,
 * dus daar tonen we de stappen (deel-icoon → "Zet op beginscherm").
 */
export default function InstallPrompt() {
  const [mode, setMode] = useState<'none' | 'android' | 'ios'>('none')
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null)

  useEffect(() => {
    const nav = navigator as Navigator & { standalone?: boolean }
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches || nav.standalone === true
    if (standalone) return
    if (localStorage.getItem(DISMISS_KEY)) return

    const onBeforeInstall = (e: Event) => {
      e.preventDefault()
      setDeferred(e as BeforeInstallPromptEvent)
      setMode('android')
    }
    const onInstalled = () => {
      localStorage.setItem(DISMISS_KEY, '1')
      setMode('none')
    }
    window.addEventListener('beforeinstallprompt', onBeforeInstall)
    window.addEventListener('appinstalled', onInstalled)

    // iOS Safari: geen beforeinstallprompt — toon na een korte tel de instructie.
    const ua = navigator.userAgent
    const isIOS = /iphone|ipad|ipod/i.test(ua)
    const isSafari = /safari/i.test(ua) && !/crios|fxios|edgios/i.test(ua)
    let timer: ReturnType<typeof setTimeout> | undefined
    if (isIOS && isSafari) {
      timer = setTimeout(() => setMode((m) => (m === 'none' ? 'ios' : m)), 1500)
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall)
      window.removeEventListener('appinstalled', onInstalled)
      if (timer) clearTimeout(timer)
    }
  }, [])

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, '1')
    setMode('none')
  }

  const install = async () => {
    if (!deferred) return
    await deferred.prompt()
    await deferred.userChoice
    setMode('none')
  }

  if (mode === 'none') return null

  return (
    <div className="fixed inset-x-0 bottom-[84px] z-[55] px-4 lg:bottom-6 lg:left-auto lg:right-6 lg:px-0">
      <div className="mx-auto flex max-w-md items-center gap-3 rounded-2xl border border-cardborder bg-white p-3 shadow-soft lg:max-w-sm">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-brand to-emerald-600 text-lg font-extrabold text-white">
          F
        </span>

        {mode === 'android' ? (
          <>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-slate-800">App installeren</p>
              <p className="text-xs text-slate-500">Zet Fam op je beginscherm.</p>
            </div>
            <button
              type="button"
              onClick={install}
              className="pill shrink-0 bg-brand px-3.5 py-2 text-xs font-semibold text-white shadow-sm shadow-brand/20 hover:bg-brand-dark"
            >
              <Download className="h-4 w-4" />
              Installeren
            </button>
          </>
        ) : (
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-slate-800">Op je beginscherm zetten</p>
            <p className="text-xs leading-relaxed text-slate-500">
              Tik onderin op het deel-icoon{' '}
              <Share className="-mt-0.5 inline h-3.5 w-3.5 text-sky-500" /> en kies{' '}
              <span className="font-semibold text-slate-700">&lsquo;Zet op beginscherm&rsquo;</span>{' '}
              <Plus className="-mt-0.5 inline h-3 w-3" />.
            </p>
          </div>
        )}

        <button
          type="button"
          onClick={dismiss}
          aria-label="Sluiten"
          className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}

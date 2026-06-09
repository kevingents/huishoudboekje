'use client'

import { Download, Share, X, Plus, Compass } from 'lucide-react'
import { usePwaInstall } from '@/lib/usePwaInstall'

/**
 * "Voeg toe aan beginscherm"-banner. Android/Chrome krijgt een echte
 * installeer-knop; iOS Safari de stappen; iOS Chrome de tip om in Safari te
 * openen (Chrome op iOS kan geen PWA installeren). Sluiten = 2 weken weg.
 */
export default function InstallPrompt() {
  const { mounted, isStandalone, isIosSafari, isIosChrome, canInstall, install, dismiss, dismissedRecently } =
    usePwaInstall()

  if (!mounted || isStandalone || dismissedRecently) return null
  const show = canInstall || isIosSafari || isIosChrome
  if (!show) return null

  return (
    <div className="fixed inset-x-0 bottom-[84px] z-[55] px-4 lg:bottom-6 lg:left-auto lg:right-6 lg:px-0">
      <div className="mx-auto flex max-w-md items-center gap-3 rounded-2xl border border-cardborder bg-white p-3 shadow-soft lg:max-w-sm">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-brand to-emerald-600 text-lg font-extrabold text-white">
          F
        </span>

        {canInstall ? (
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
        ) : isIosChrome ? (
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-slate-800">Open in Safari om te installeren</p>
            <p className="text-xs leading-relaxed text-slate-500">
              In Chrome op iPhone kan dit niet. Open fam in{' '}
              <Compass className="-mt-0.5 inline h-3.5 w-3.5 text-sky-500" /> Safari en kies daarna
              &lsquo;Zet op beginscherm&rsquo;.
            </p>
          </div>
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

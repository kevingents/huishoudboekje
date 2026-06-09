'use client'

import { useEffect, useState } from 'react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

// Module-singleton: het beforeinstallprompt-event vuurt één keer, vroeg. We
// vangen het globaal op en delen het met alle componenten via subscribe.
let deferred: BeforeInstallPromptEvent | null = null
const subs = new Set<() => void>()
let initialized = false

function init() {
  if (initialized || typeof window === 'undefined') return
  initialized = true
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    deferred = e as BeforeInstallPromptEvent
    subs.forEach((f) => f())
  })
  window.addEventListener('appinstalled', () => {
    deferred = null
    subs.forEach((f) => f())
  })
}

const DISMISS_KEY = 'fam-install-dismissed-at'
const REMIND_AFTER = 14 * 24 * 60 * 60 * 1000 // 2 weken

export function usePwaInstall() {
  const [, force] = useState(0)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    init()
    setMounted(true)
    const f = () => force((n) => n + 1)
    subs.add(f)
    return () => {
      subs.delete(f)
    }
  }, [])

  const ua = mounted ? navigator.userAgent : ''
  const navAny = mounted ? (navigator as Navigator & { standalone?: boolean }) : null
  const isStandalone =
    mounted && (window.matchMedia('(display-mode: standalone)').matches || navAny?.standalone === true)
  const isIos = /iphone|ipad|ipod/i.test(ua)
  const isIosChrome = isIos && /crios/i.test(ua)
  const isIosSafari = isIos && /safari/i.test(ua) && !/crios|fxios|edgios/i.test(ua)
  const canInstall = mounted && !!deferred

  const install = async (): Promise<boolean> => {
    if (!deferred) return false
    await deferred.prompt()
    await deferred.userChoice
    deferred = null
    subs.forEach((f) => f())
    return true
  }

  const dismissedRecently = () => {
    if (typeof window === 'undefined') return false
    const ts = Number(localStorage.getItem(DISMISS_KEY) || 0)
    return ts > 0 && Date.now() - ts < REMIND_AFTER
  }
  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, String(Date.now()))
    force((n) => n + 1)
  }

  return {
    mounted,
    isStandalone,
    isIos,
    isIosChrome,
    isIosSafari,
    canInstall,
    install,
    dismiss,
    dismissedRecently: mounted ? dismissedRecently() : true,
  }
}

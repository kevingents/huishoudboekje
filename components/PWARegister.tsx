'use client'

import { useEffect } from 'react'

/** Registreert de service worker zodat de app installeerbaar is en offline laadt. */
export default function PWARegister() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        /* registratie mislukt — app blijft gewoon werken */
      })
    }
  }, [])
  return null
}

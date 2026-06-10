'use client'

import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'
import Sidebar from './Sidebar'
import MobileNav from './MobileNav'
import SwipeBack from './SwipeBack'

const AUTH_ROUTES = [
  '/inloggen',
  '/registreren',
  '/uitnodiging',
  '/wachtwoord-vergeten',
  '/wachtwoord-herstellen',
]

/**
 * Rendert de gedeelde app-frame (sidebar + scrollbare main + mobiele nav),
 * behalve op de auth-pagina's — die krijgen een gecentreerde, kale layout.
 */
export default function AppFrame({ children }: { children: ReactNode }) {
  const pathname = usePathname()

  // Publieke marketing-landing en juridische pagina's — eigen, schermvullende
  // layout (geen app-shell, werkt zowel in- als uitgelogd).
  if (pathname === '/' || pathname === '/privacy' || pathname === '/voorwaarden') {
    return <>{children}</>
  }

  if (AUTH_ROUTES.includes(pathname)) {
    return (
      <div className="grid min-h-[100dvh] place-items-center bg-canvas p-4">
        <div className="w-full max-w-md">{children}</div>
      </div>
    )
  }

  return (
    <div className="h-[100dvh] bg-canvas lg:p-6">
      <SwipeBack />
      <div className="mx-auto flex h-full max-w-[1440px] overflow-hidden bg-white shadow-card lg:rounded-[28px]">
        <Sidebar />
        <main className="scrollbar-thin min-w-0 flex-1 overflow-y-auto overflow-x-hidden px-4 pb-28 pt-6 sm:px-6 lg:px-8 lg:pb-8">
          <div className="mx-auto max-w-6xl">{children}</div>
        </main>
      </div>
      <MobileNav />
    </div>
  )
}

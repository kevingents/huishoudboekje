'use client'

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

/**
 * Toegankelijkheidsvoorkeuren (lettergrootte, hoog contrast, minder beweging).
 * Bewust op APPARAAT-niveau opgeslagen in localStorage — het is een persoonlijke
 * UI-voorkeur, niet iets dat je met het hele (gedeelde) huishouden wilt delen.
 * Wordt toegepast door één CSS-variabele (--font-scale) en twee klassen op <html>;
 * doordat Tailwind in rem werkt, schaalt de hele UI mee.
 */

export type FontScale = 'normaal' | 'groot' | 'extra'

export const FONT_SCALE: Record<FontScale, number> = { normaal: 1, groot: 1.125, extra: 1.25 }

const STORAGE_KEY = 'fam-a11y'

interface A11yState {
  fontScale: FontScale
  highContrast: boolean
  reduceMotion: boolean
}

interface A11yContextValue extends A11yState {
  setFontScale: (value: FontScale) => void
  setHighContrast: (value: boolean) => void
  setReduceMotion: (value: boolean) => void
}

const A11yContext = createContext<A11yContextValue | null>(null)

const DEFAULTS: A11yState = { fontScale: 'normaal', highContrast: false, reduceMotion: false }

function applyToDocument(state: A11yState) {
  const el = document.documentElement
  el.style.setProperty('--font-scale', String(FONT_SCALE[state.fontScale]))
  el.classList.toggle('hc', state.highContrast)
  el.classList.toggle('reduce-motion', state.reduceMotion)
}

function readStored(): A11yState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<A11yState>
      return {
        fontScale: (['normaal', 'groot', 'extra'] as FontScale[]).includes(parsed.fontScale as FontScale)
          ? (parsed.fontScale as FontScale)
          : 'normaal',
        highContrast: !!parsed.highContrast,
        reduceMotion: !!parsed.reduceMotion,
      }
    }
  } catch {
    /* corrupt/onbeschikbaar — val terug op defaults */
  }
  // Geen opgeslagen voorkeur: respecteer de OS-voorkeur voor minder beweging.
  const prefersReduce =
    typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  return { ...DEFAULTS, reduceMotion: !!prefersReduce }
}

export function A11yProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<A11yState>(DEFAULTS)

  useEffect(() => {
    const stored = readStored()
    setState(stored)
    applyToDocument(stored)
  }, [])

  const update = (patch: Partial<A11yState>) => {
    setState((prev) => {
      const next = { ...prev, ...patch }
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      } catch {
        /* opslag niet beschikbaar */
      }
      applyToDocument(next)
      return next
    })
  }

  return (
    <A11yContext.Provider
      value={{
        ...state,
        setFontScale: (value) => update({ fontScale: value }),
        setHighContrast: (value) => update({ highContrast: value }),
        setReduceMotion: (value) => update({ reduceMotion: value }),
      }}
    >
      {children}
    </A11yContext.Provider>
  )
}

export function useA11y(): A11yContextValue {
  const ctx = useContext(A11yContext)
  if (!ctx) throw new Error('useA11y moet binnen <A11yProvider> gebruikt worden')
  return ctx
}

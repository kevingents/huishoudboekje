'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

/**
 * Swipe vanaf de linkerrand naar rechts = één pagina terug (zoals in iOS Safari).
 * Start binnen de linker 32px zodat horizontaal scrollen/vegen in de content
 * (carrousels, barcodes) niet per ongeluk terug navigeert.
 */
export default function SwipeBack() {
  const router = useRouter()

  useEffect(() => {
    let startX = 0
    let startY = 0
    let startT = 0
    let tracking = false

    const onStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) {
        tracking = false
        return
      }
      const t = e.touches[0]
      if (t.clientX > 32) {
        tracking = false
        return
      }
      startX = t.clientX
      startY = t.clientY
      startT = Date.now()
      tracking = true
    }

    const onEnd = (e: TouchEvent) => {
      if (!tracking) return
      tracking = false
      const t = e.changedTouches[0]
      const dx = t.clientX - startX
      const dy = t.clientY - startY
      const dt = Date.now() - startT
      // duidelijke, horizontale veeg naar rechts, snel genoeg
      if (dx > 70 && Math.abs(dy) < 50 && dt < 600 && window.history.length > 1) {
        router.back()
      }
    }

    document.addEventListener('touchstart', onStart, { passive: true })
    document.addEventListener('touchend', onEnd, { passive: true })
    return () => {
      document.removeEventListener('touchstart', onStart)
      document.removeEventListener('touchend', onEnd)
    }
  }, [router])

  return null
}

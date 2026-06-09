'use client'

import { useEffect, useRef } from 'react'
import JsBarcode from 'jsbarcode'

/** Rendert een scanbare barcode (SVG) uit een nummer/tekst. */
export default function Barcode({
  value,
  format = 'CODE128',
  className,
}: {
  value: string
  format?: string
  className?: string
}) {
  const ref = useRef<SVGSVGElement>(null)

  useEffect(() => {
    if (!ref.current || !value) return
    try {
      JsBarcode(ref.current, value, {
        format,
        displayValue: false,
        margin: 0,
        height: 90,
        width: 2,
        background: 'transparent',
      })
    } catch {
      // Waarde past niet bij dit barcodeformaat — laat leeg.
    }
  }, [value, format])

  return <svg ref={ref} className={className} aria-label={`Barcode ${value}`} />
}

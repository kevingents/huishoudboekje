'use client'

/**
 * Tijd kiezen met twee dropdowns (uur + minuut) i.p.v. vrij typen — scheelt
 * typefouten en levert altijd een geldig "HH:MM" op. Lege waarde = geen tijd
 * (hele dag). Minuten in stappen van 5 zodat de lijst kort blijft maar je toch
 * flexibel bent.
 */
const HOURS = Array.from({ length: 24 }, (_, h) => String(h).padStart(2, '0'))
const MINUTES = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, '0')) // 00,05,…,55

export default function TimeSelect({
  value,
  onChange,
  selectClass = '',
  allDayLabel = 'Hele dag',
}: {
  value: string // '' = hele dag, anders 'HH:MM'
  onChange: (v: string) => void
  selectClass?: string
  allDayLabel?: string
}) {
  const [hh, mm] = value ? value.split(':') : ['', '']
  // Een bestaande/geïmporteerde tijd kan een minuut buiten de 5-stappen hebben
  // (bijv. 16:47 uit een iCal-feed). Voeg die dan toe zodat 'ie zichtbaar blijft
  // en niet stilletjes verandert bij het bewerken.
  const minuteList = hh && mm && !MINUTES.includes(mm) ? [...MINUTES, mm].sort() : MINUTES

  const setHour = (h: string) => {
    if (!h) return onChange('') // geen uur → hele dag
    onChange(`${h}:${mm || '00'}`)
  }
  const setMinute = (m: string) => {
    onChange(`${hh || '00'}:${m}`)
  }

  return (
    <div className="mt-1 flex gap-2">
      <select
        value={hh}
        onChange={(e) => setHour(e.target.value)}
        aria-label="Uur"
        className={`${selectClass} min-w-0 flex-1`}
      >
        <option value="">{allDayLabel}</option>
        {HOURS.map((h) => (
          <option key={h} value={h}>
            {h}
          </option>
        ))}
      </select>
      <select
        value={hh ? mm || '00' : ''}
        onChange={(e) => setMinute(e.target.value)}
        disabled={!hh}
        aria-label="Minuten"
        className={`${selectClass} min-w-0 flex-1 disabled:opacity-40`}
      >
        {!hh && <option value="">—</option>}
        {minuteList.map((m) => (
          <option key={m} value={m}>
            {m}
          </option>
        ))}
      </select>
    </div>
  )
}

/* Familiewapen (coat of arms) als SVG. De AI maakt er een; zonder AI valt het
   terug op een deterministische, nette procedurele variant. Wordt veilig
   gerenderd als <img> (data-URL), dus SVG-scripts draaien sowieso niet. */

const PALETTES: [string, string, string][] = [
  ['#35B558', '#1f7a3d', '#d1fae5'],
  ['#3b82f6', '#1e40af', '#dbeafe'],
  ['#8b5cf6', '#6d28d9', '#ede9fe'],
  ['#f59e0b', '#b45309', '#fef3c7'],
  ['#ef4444', '#991b1b', '#fee2e2'],
  ['#0ea5e9', '#0369a1', '#e0f2fe'],
]

function hash(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0
  return Math.abs(h)
}

const CHARGES: Record<number, string> = {
  // ster
  0: '<path d="M100 92 l7 16 17 2 -13 12 4 18 -15 -9 -15 9 4 -18 -13 -12 17 -2 z" fill="#ffffff"/>',
  // hart
  1: '<path d="M100 132 C92 116 70 119 78 134 C84 146 100 154 100 154 C100 154 116 146 122 134 C130 119 108 116 100 132 Z" fill="#ffffff"/>',
  // blad
  2: '<path d="M100 96 C120 110 120 140 100 152 C80 140 80 110 100 96 Z" fill="#ffffff"/>',
  // huis
  3: '<path d="M100 96 L124 116 H112 V146 H88 V116 H76 Z" fill="#ffffff"/>',
}

/** Deterministische, veilige procedurele wapenschild-SVG. */
export function proceduralCrest(description: string, initial: string): string {
  const h = hash(description || 'fam')
  const [main, dark, light] = PALETTES[h % PALETTES.length]
  const charge = CHARGES[h % 4]
  const letter = (initial || 'F').slice(0, 1).toUpperCase()
  return `<svg viewBox="0 0 200 240" xmlns="http://www.w3.org/2000/svg">
  <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="${main}"/><stop offset="1" stop-color="${dark}"/>
  </linearGradient></defs>
  <path d="M30 22 H170 V120 C170 182 100 222 100 222 C100 222 30 182 30 120 Z" fill="url(#g)" stroke="${dark}" stroke-width="7"/>
  <path d="M37 28 H163 V70 H37 Z" fill="${light}" opacity="0.35"/>
  ${charge}
  <text x="100" y="200" text-anchor="middle" font-family="Georgia, serif" font-size="34" font-weight="bold" fill="${light}">${letter}</text>
</svg>`
}

/** Houdt alleen een geldige, redelijke <svg> over (voor AI-output). */
export function sanitizeCrestSvg(input: string): string | null {
  const m = input.match(/<svg[\s\S]*<\/svg>/i)
  if (!m) return null
  let s = m[0]
  s = s
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<foreignObject[\s\S]*?<\/foreignObject>/gi, '')
    .replace(/<image[\s\S]*?>/gi, '')
    .replace(/\son\w+\s*=\s*"[^"]*"/gi, '')
    .replace(/\son\w+\s*=\s*'[^']*'/gi, '')
    .replace(/javascript:/gi, '')
  if (s.length > 20000) return null
  return s
}

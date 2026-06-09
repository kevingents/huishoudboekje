/* Familiewapen (coat of arms) als SVG. De AI maakt er een; zonder AI valt het
   terug op een deterministische, nette procedurele variant. Wordt veilig
   gerenderd als <img> (data-URL), dus SVG-scripts draaien sowieso niet. */

// Zachte, merk-aligned paletten [hoofd, donker, licht].
const PALETTES: [string, string, string][] = [
  ['#35B558', '#2C9A4A', '#E9F7EE'], // brand-groen
  ['#3B82F6', '#2563EB', '#DBEAFE'],
  ['#8B5CF6', '#7C3AED', '#EDE9FE'],
  ['#F59E0B', '#D97706', '#FEF3C7'],
  ['#EC4899', '#DB2777', '#FCE7F3'],
  ['#0EA5E9', '#0284C7', '#E0F2FE'],
]

function hash(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0
  return Math.abs(h)
}

// Eenvoudige, vriendelijke symbolen, gecentreerd rond (100,108).
const CHARGES: Record<number, string> = {
  0: '<path d="M100 84 l7.5 17 18.5 1.7 -14 12.4 4.3 18.3 -16.3 -9.7 -16.3 9.7 4.3 -18.3 -14 -12.4 18.5 -1.7 z" fill="#ffffff"/>', // ster
  1: '<path d="M100 130 C90 110 64 114 74 132 C81 145 100 156 100 156 C100 156 119 145 126 132 C136 114 110 110 100 130 Z" fill="#ffffff"/>', // hart
  2: '<path d="M100 82 C124 100 124 134 100 150 C76 134 76 100 100 82 Z" fill="#ffffff"/>', // blad
  3: '<path d="M100 84 L128 108 H116 V142 H84 V108 H72 Z" fill="#ffffff"/>', // huis
}

/** Deterministische, veilige procedurele wapenschild-SVG in de app-stijl. */
export function proceduralCrest(description: string, initial: string): string {
  const h = hash(description || 'fam')
  const [main, dark, light] = PALETTES[h % PALETTES.length]
  const charge = CHARGES[h % 4]
  const letter = (initial || 'F').slice(0, 1).toUpperCase()
  // Zacht, afgerond wapenschild met witte rand en naam-pill onderaan.
  const shield = 'M100 16 C138 16 166 28 166 28 L166 110 C166 168 134 200 100 224 C66 200 34 168 34 110 L34 28 C34 28 62 16 100 16 Z'
  return `<svg viewBox="0 0 200 240" xmlns="http://www.w3.org/2000/svg">
  <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="${main}"/><stop offset="1" stop-color="${dark}"/>
  </linearGradient></defs>
  <path d="${shield}" fill="url(#g)" stroke="#ffffff" stroke-width="7" stroke-linejoin="round"/>
  <path d="M100 30 C132 30 154 39 154 39 L154 70 L46 70 L46 39 C46 39 68 30 100 30 Z" fill="${light}" opacity="0.45"/>
  ${charge}
  <rect x="58" y="176" width="84" height="32" rx="16" fill="#ffffff" opacity="0.95"/>
  <text x="100" y="198" text-anchor="middle" font-family="Inter, ui-sans-serif, sans-serif" font-size="20" font-weight="800" fill="${dark}">${letter}</text>
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

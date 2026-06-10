/* Inladen van bankafschriften. Ondersteunt CSV (per-bank, met kolom-autodetectie),
   CAMT.053 (XML, ISO 20022 — werkt voor alle SEPA-banken) en MT940. */

export interface BankTx {
  date: string // yyyy-mm-dd
  amount: number // altijd positief
  description: string
  isIncome: boolean // true = bij/credit, false = af/debet
  category: string
}

/* -------------------------------------------------------------------------- */
/*  Hulpfuncties                                                               */
/* -------------------------------------------------------------------------- */

function pad(n: number | string): string {
  return String(n).padStart(2, '0')
}

/** Bedrag-string ("1.234,56", "1234.56", "-12,34", "€ 5,00") → number. */
export function parseAmount(raw: string): number {
  let s = String(raw).trim().replace(/\s/g, '').replace(/€|eur/gi, '')
  const neg = /^-/.test(s) || /-$/.test(s)
  s = s.replace(/[+-]/g, '')
  if (s.includes('.') && s.includes(',')) s = s.replace(/\./g, '').replace(',', '.')
  else if (s.includes(',')) s = s.replace(',', '.')
  const n = Number(s)
  if (!isFinite(n)) return NaN
  return neg ? -n : n
}

/** Datum-string (yyyymmdd, dd-mm-jjjj, jjjj-mm-dd, dd/mm/jjjj) → yyyy-mm-dd. */
export function parseDate(raw: string): string {
  const s = String(raw).trim()
  if (/^\d{8}$/.test(s)) return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`
  let m = /^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/.exec(s)
  if (m) return `${m[1]}-${pad(m[2])}-${pad(m[3])}`
  m = /^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})/.exec(s)
  if (m) return `${m[3]}-${pad(m[2])}-${pad(m[1])}`
  return ''
}

/* -------------------------------------------------------------------------- */
/*  Categorisatie (op basis van omschrijving/tegenpartij)                      */
/* -------------------------------------------------------------------------- */

const CATEGORY_RULES: [RegExp, string][] = [
  [/albert heijn|\bah\b|jumbo|lidl|aldi|\bplus\b|dirk|dekamarkt|vomar|picnic|\bspar\b|\bcoop\b|hoogvliet|\bdeen\b|kruidvat|etos|drogist|bakker|slager|supermarkt/i, 'Boodschappen'],
  [/mcdonald|burger king|\bkfc\b|thuisbezorgd|uber\s?eats|deliveroo|dominos|new york pizza|pizza|restaurant|\bcafe|café|\bbar\b|coffee|koffie|starbucks|febo|snackbar|horeca|stach|maeva/i, 'Horeca'],
  [/shell|\bbp\b|esso|tinq|tango|tankstation|\bq8\b|texaco|total|benzine|diesel|\bns\b|trein|ov-?chip|9292|\bret\b|\bgvb\b|\bhtm\b|connexxion|arriva|greenwheels|parkeren|parkmobile|q-?park|yourparking|anwb/i, 'Vervoer'],
  [/vattenfall|eneco|essent|greenchoice|budget energie|energiedirect|tibber|\bgas\b|stroom|elektra/i, 'Gas/Elektra/Water'],
  [/\bpwn\b|vitens|dunea|waternet|evides|brabant water|drinkwater/i, 'Gas/Elektra/Water'],
  [/zorgverzeker|\bcz\b|\bvgz\b|zilveren kruis|menzis|achmea|nationale-?nederlanden|aegon|\basr\b|\bfbto\b|univé|unive|inshared|centraal beheer|verzeker/i, 'Verzekeringen'],
  [/ziggo|\bkpn\b|vodafone|odido|t-?mobile|tele2|simyo|youfone|hollandsnieuwe|netflix|spotify|disney|videoland|\bhbo\b|prime video|abonnement/i, 'Internet/TV/Telefoon'],
  [/\bzara\b|h&m|\bhema\b|action|primark|c&a|wehkamp|zalando|aboutyou|vinted|bol\.com|coolblue|mediamarkt|\bikea\b|zeeman|intertoys|jamin|kleding|schoenen|winkel/i, 'Winkels'],
  [/apotheek|huisarts|tandarts|fysio|ziekenhuis|medisch|drogist/i, 'Apotheek/Medisch'],
  [/hypotheek|aflossing|creditcard|\blening\b|krediet/i, 'Aflossingen'],
  [/gemeente|belastingdienst|waterschap|\bcjib\b|\bozb\b|afvalstoffen|hoogheemraadschap/i, 'Belastingen'],
  [/\bsport\b|\bgym\b|fitness|basic-?fit|sportschool|more impact/i, 'Sport'],
  [/pathe|pathé|bioscoop|efteling|dierentuin|museum|\buitje|pretpark|loten|staatsloterij/i, 'Leuke dingen/Uitjes'],
]

export function categorizeTx(description: string): string {
  for (const [re, cat] of CATEGORY_RULES) if (re.test(description)) return cat
  return 'Overig'
}

/* -------------------------------------------------------------------------- */
/*  Parsers                                                                    */
/* -------------------------------------------------------------------------- */

function splitCsvLine(line: string, delim: string): string[] {
  const out: string[] = []
  let cur = ''
  let q = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (q) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"'
          i++
        } else q = false
      } else cur += ch
    } else if (ch === '"') q = true
    else if (ch === delim) {
      out.push(cur)
      cur = ''
    } else cur += ch
  }
  out.push(cur)
  return out
}

function parseCsv(text: string): BankTx[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0)
  if (lines.length < 2) return []
  const delim = lines[0].split(';').length > lines[0].split(',').length ? ';' : ','
  const header = splitCsvLine(lines[0], delim).map((h) => h.toLowerCase().trim().replace(/^"|"$/g, ''))

  const find = (re: RegExp) => header.findIndex((h) => re.test(h))
  const dateI = find(/datum|date|boekdatum|transactiedatum|rentedatum/)
  const amtI = find(/bedrag|amount|mutatie/)
  const afbijI = find(/af\s?bij|af\/bij|bij\/af|debet|credit|debit\/credit|type/)
  const descCols = header
    .map((h, i) => (/omschrijving|naam|mededeling|description|tegenpartij|tegenrekening|narrative|naam \/ omschrijving|naam tegenpartij/.test(h) ? i : -1))
    .filter((i) => i !== -1)

  if (dateI === -1 || amtI === -1) return []

  const out: BankTx[] = []
  for (let r = 1; r < lines.length; r++) {
    const cells = splitCsvLine(lines[r], delim).map((c) => c.replace(/^"|"$/g, ''))
    const signed = parseAmount(cells[amtI] ?? '')
    if (!isFinite(signed) || signed === 0) continue
    let isIncome = signed > 0
    if (afbijI !== -1) {
      const v = (cells[afbijI] ?? '').toLowerCase()
      if (/bij|credit|^c$/.test(v)) isIncome = true
      else if (/af|debet|debit|^d$/.test(v)) isIncome = false
    }
    const date = parseDate(cells[dateI] ?? '')
    const description = (descCols.length ? descCols : [amtI])
      .map((i) => cells[i] ?? '')
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim()
    out.push({ date, amount: Math.abs(signed), description, isIncome, category: categorizeTx(description) })
  }
  return out
}

function parseCamt(text: string): BankTx[] {
  const entries = text.match(/<Ntry>[\s\S]*?<\/Ntry>/g) ?? []
  const out: BankTx[] = []
  for (const e of entries) {
    const amt = Number(/<Amt[^>]*>([\d.]+)<\/Amt>/.exec(e)?.[1] ?? '0')
    if (!amt) continue
    const ind = /<CdtDbtInd>(\w+)<\/CdtDbtInd>/.exec(e)?.[1] ?? 'DBIT'
    const date =
      /<BookgDt>[\s\S]*?<Dt>(\d{4}-\d{2}-\d{2})/.exec(e)?.[1] ??
      /<Dt>(\d{4}-\d{2}-\d{2})/.exec(e)?.[1] ??
      ''
    const ustrd = (e.match(/<Ustrd>([\s\S]*?)<\/Ustrd>/g) ?? [])
      .map((u) => u.replace(/<\/?Ustrd>/g, ''))
      .join(' ')
    const nm = /<Nm>([\s\S]*?)<\/Nm>/.exec(e)?.[1] ?? ''
    const description = `${nm} ${ustrd}`.replace(/\s+/g, ' ').trim()
    out.push({ date, amount: amt, description, isIncome: ind === 'CRDT', category: categorizeTx(description) })
  }
  return out
}

function parseMt940(text: string): BankTx[] {
  const lines = text.split(/\r?\n/)
  const out: BankTx[] = []
  let cur: BankTx | null = null
  const flush = () => {
    if (cur) {
      cur.description = cur.description.replace(/\s+/g, ' ').trim()
      cur.category = categorizeTx(cur.description)
      out.push(cur)
    }
  }
  for (const raw of lines) {
    const line = raw.trimStart()
    if (line.startsWith(':61:')) {
      flush()
      // valutadatum(6) [boekdatum(4)] D/C-merk(C|D|RC|RD) [fondscode(1 letter)] bedrag
      const m = /:61:(\d{6})(?:\d{4})?(RC|RD|C|D)[A-Za-z]?([\d.,]+)/.exec(line)
      if (m) {
        const ymd = m[1]
        const mark = m[2]
        cur = {
          date: `20${ymd.slice(0, 2)}-${ymd.slice(2, 4)}-${ymd.slice(4, 6)}`,
          amount: Math.abs(parseAmount(m[3])),
          description: '',
          isIncome: mark === 'C' || mark === 'RD',
          category: 'Overig',
        }
      } else cur = null
    } else if (line.startsWith(':86:') && cur) {
      cur.description += ' ' + line.slice(4)
    } else if (cur && line && !line.startsWith(':')) {
      cur.description += ' ' + line
    }
  }
  flush()
  return out
}

/** ABN AMRO tab-gescheiden export (.TAB / .txt, géén kopregel).
 *  Kolommen: rekening, muntsoort, boekdatum(yyyymmdd), beginsaldo, eindsaldo,
 *  rentedatum(yyyymmdd), bedrag(±, komma-decimaal), omschrijving. */
function parseAbnTab(text: string): BankTx[] {
  const out: BankTx[] = []
  for (const raw of text.split(/\r?\n/)) {
    const c = raw.split('\t')
    if (c.length < 7) continue
    const signed = parseAmount(c[6] ?? '')
    if (!isFinite(signed) || signed === 0) continue
    const date = parseDate(c[2] || c[5] || '')
    const description = c.slice(7).join(' ').replace(/\s+/g, ' ').trim()
    out.push({
      date,
      amount: Math.abs(signed),
      description: description || 'Transactie',
      isIncome: signed > 0,
      category: categorizeTx(description),
    })
  }
  return out
}

/** Detecteert het formaat en parseert het afschrift. */
export function parseBankStatement(filename: string, text: string): BankTx[] {
  const f = filename.toLowerCase()
  const head = text.slice(0, 600)
  if (f.endsWith('.xml') || head.includes('<Document') || head.includes('camt.05') || head.trimStart().startsWith('<?xml')) {
    return parseCamt(text)
  }
  // MT940 herkennen aan de SWIFT-tags in de inhoud, ongeacht de bestandsextensie.
  if (
    f.endsWith('.sta') ||
    f.endsWith('.940') ||
    f.endsWith('.mt940') ||
    f.endsWith('.swi') ||
    f.endsWith('.mt9') ||
    /:20:/.test(head) ||
    /:61:/.test(text)
  ) {
    return parseMt940(text)
  }
  // ABN AMRO tab-gescheiden export: rekening<TAB>EUR<TAB>jjjjmmdd<TAB>...
  if (f.endsWith('.tab') || /^[A-Z0-9.]+\t[A-Z]{3}\t\d{8}\t/m.test(text)) {
    return parseAbnTab(text)
  }
  return parseCsv(text)
}

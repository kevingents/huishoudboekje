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
  // Aflossingen/schulden — eerst, zodat een betalingsregeling bij een verzekeraar
  // niet als verzekering telt. ICS = creditcard-afschrijving (betaling aan ICS).
  [/betalingsregeling|deurwaarder|incassobureau|international card service|\baflos\b/i, 'Aflossingen'],
  // Boodschappen / supermarkt / drogist / bakker
  [/albert heijn|\bah\b|ah to go|jumbo|\blidl\b|\baldi\b|\bplus\b|\bdirk\b|dekamarkt|vomar|picnic|\bspar\b|\bcoop\b|hoogvliet|\bdeen\b|poiesz|nettorama|\bboni\b|jan linders|\bmarqt\b|ekoplaza|\bcrisp\b|gorillas|\bflink\b|\bgetir\b|\btoko\b|supermarkt|kruidvat|\betos\b|drogist|bakker|bakkerij|slagerij|slager|groente|versmarkt/i, 'Boodschappen'],
  // Horeca / uit eten / bezorgen
  [/mcdonald|burger king|\bkfc\b|thuisbezorgd|uber\s?eats|deliveroo|dominos|new york pizza|\bpizza\b|restaurant|eetcafe|\bcafe|café|brasserie|bistro|coffee|koffie|starbucks|\bfebo\b|snackbar|cafetaria|horeca|lunchroom|ijssalon|la place|vapiano|\bwok\b|sushi|shoarma|kebab|subway|stach|broodje/i, 'Horeca'],
  // Vervoer / brandstof / OV / parkeren / deelmobiliteit
  [/shell|\bbp\b|\besso\b|\btinq\b|tango|tankstation|\bq8\b|texaco|totalenergies|firezone|\bgulf\b|\bavia\b|benzine|diesel|\bns\b|\btrein\b|ov-?chip|ovpay|9292|\bret\b|\bgvb\b|\bhtm\b|connexxion|arriva|qbuzz|flixbus|blablacar|greenwheels|\bfelyx\b|go sharing|donkey republic|swapfiets|parkeren|parkmobile|parkeer|q-?park|yourparking|\banwb\b|\bapk\b|garage|kwik.?fit|euromaster|fastned|allego|laadpas|shell recharge/i, 'Vervoer'],
  // Energie + water
  [/vattenfall|\beneco\b|essent|greenchoice|budget energie|energiedirect|\btibber\b|\boxxio\b|vandebron|pure energie|frank energie|\bengie\b|\bnuon\b|\bgas\b|stroom|elektra|\benergie\b/i, 'Gas/Elektra/Water'],
  [/\bpwn\b|vitens|\bdunea\b|waternet|evides|brabant water|drinkwater|waterbedrijf|\bwml\b|\boasen\b|waterleiding/i, 'Gas/Elektra/Water'],
  // Verzekeringen
  [/zorgverzeker|\bcz\b|\bvgz\b|zilveren kruis|menzis|\bachmea\b|nationale-?nederlanden|\baegon\b|\basr\b|\bfbto\b|univé|unive|inshared|centraal beheer|\bditzo\b|interpolis|\bohra\b|\breaal\b|allianz|klaverblad|promovendum|\baevitae\b|\bpolis\b|verzeker|\bpremie\b/i, 'Verzekeringen'],
  // Internet / TV / Telefoon / streaming / digitaal
  [/\bziggo\b|\bkpn\b|vodafone|\bodido\b|t-?mobile|tele2|simyo|youfone|hollandsnieuwe|\blebara\b|online\.nl|caiway|netflix|spotify|disney|videoland|\bhbo\b|prime video|viaplay|nlziet|storytel|audible|\bicloud\b|dropbox|microsoft|adobe|playstation|\bxbox\b|nintendo|\bsteam\b|patreon|youtube premium|abonnement/i, 'Internet/TV/Telefoon'],
  // Winkels / online / warenhuis / wonen / klussen / kleding
  [/\bzara\b|h&m|\bhema\b|\baction\b|primark|c&a|wehkamp|zalando|aboutyou|vinted|bol\.com|coolblue|mediamarkt|\bbcc\b|\bikea\b|zeeman|\bwibra\b|big bazar|flying tiger|kwantum|leen bakker|\bgamma\b|karwei|praxis|hornbach|bauhaus|intratuin|tuincentrum|decathlon|\bbever\b|scapino|van haren|\bomoda\b|\bsacha\b|shoeby|we fashion|bershka|\bnike\b|adidas|\bjysk\b|amazon|aliexpress|\btemu\b|\bshein\b|marktplaats|\betsy\b|xenos|blokker|bijenkorf|kleding|schoenen|speelgoed|intertoys|\bjamin\b|\bwinkel\b/i, 'Winkels'],
  // Apotheek / medisch / optiek
  [/apotheek|huisarts|tandarts|\bfysio|ziekenhuis|\bmedisch|drogisterij|optiek|pearle|hans anders|specsavers|eye wish|\bkliniek\b|psycholoog|\bggz\b|mondhygien/i, 'Apotheek/Medisch'],
  // Persoonlijke verzorging / kapper / beauty
  [/kapper|kapsalon|barbier|barberstudio|\bbarber\b|\bnails\b|nagelstudio|schoonheidssalon|\bbeauty\b|sally beauty|massage|parfum|ici paris|\bdouglas\b|\brituals\b/i, 'Persoonlijke verzorging'],
  // Aflossingen / krediet / koop-op-afbetaling
  [/hypotheek|aflossing|creditcard|credit card|\blening\b|krediet|\bobvion\b|\bklarna\b|afterpay|\briverty\b|billink|\bduo\b/i, 'Aflossingen'],
  // Belastingen / overheid
  [/gemeente|belastingdienst|waterschap|\bcjib\b|\bozb\b|afvalstoffen|hoogheemraadschap|rioolheffing|motorrijtuig|wegenbelasting|\brdw\b|kadaster|\bkvk\b|gemeentebelasting/i, 'Belastingen'],
  // Sport
  [/\bsport\b|\bgym\b|fitness|basic-?fit|sportschool|sportcity|fit for free|anytime fitness|sportcomplex|sportcafe|club nemo|tetterode|houtvaart|geel-?wit|\bzwembad\b|\btennis\b|voetbal|hockey|korfbal|sportverenig|\byoga\b|pilates|crossfit|\bpadel\b|\bmanege\b|more impact/i, 'Sport'],
  // Kinderen / opvang / school
  [/kinderopvang|kindercentr|wonderberk|\bhero\b|\bkdv\b|\bbso\b|gastouder|\bcreche\b|crèche|peuterspeel|ouderbijdrage|schoolreis|babypark|prenatal|zwemles|\boppas\b/i, 'Kinderen'],
  // Reizen / vakantie / verblijf
  [/booking\.com|airbnb|\bhotel\b|vakantie|transavia|\bklm\b|ryanair|\btui\b|sunweb|d-?reizen|center parcs|\blandal\b|roompot|\beasyjet\b|corendon/i, 'Reizen/Vakantie'],
  // Leuke dingen / uitjes / entertainment / loterij
  [/pathe|pathé|bioscoop|kinepolis|\bvue\b|efteling|dierentuin|museum|\buitje|pretpark|attractiepark|walibi|duinrell|madurodam|\bartis\b|dolfinarium|\bconcert\b|ticketmaster|festival|theater|escape room|bowlen|lasergame|\bnemo\b|speeltuin|klimbos|\bloten\b|staatslot|\blotto\b/i, 'Leuke dingen/Uitjes'],
  // Goede doelen / donaties
  [/unicef|rode kruis|\bkwf\b|greenpeace|\bwnf\b|artsen zonder|cliniclowns|donatie|\bkerk\b|\bcollecte\b|\boxfam\b|hartstichting|longfonds|dierenbescherming/i, 'Goede doelen'],
  // Onderling / Tikkie / betaalverzoek (geld naar of van personen — splitten, p2p)
  [/via tikkie|tikkie id|betaalverzoek|\btikkie\b/i, 'Onderling'],
  // Contant geld (geldautomaat)
  [/geldautomaat|geldopname|\bgea\b|opname automaat|\batm\b/i, 'Contant geld'],
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
      cur = null
    }
  }
  for (const raw of lines) {
    const line = raw.trimStart()
    // Einde van een dagafschrift ("-") of begin van een nieuw afschrift (:20:):
    // transactie afsluiten zodat de bankheader (ABNANL2A / 940) niet aan de vorige
    // omschrijving blijft plakken.
    if (line === '-' || line.startsWith(':20:')) {
      flush()
      continue
    }
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
      cur.description += (cur.description ? ' ' : '') + line.slice(4)
    } else if (cur && line && !line.startsWith(':')) {
      // Gestructureerde ABN :86: (begint met /TRTP/..) wordt op 65 tekens afgebroken
      // ZONDER spatie → zonder spatie samenvoegen herstelt afgebroken woorden
      // (INTERN\nATIONAL -> INTERNATIONAL, BOL.CO\nM -> BOL.COM). Ongestructureerde
      // regels (BEA, die ook een / in de tijd hebben) juist mét spatie.
      cur.description += cur.description.trimStart().startsWith('/') ? line : ' ' + line
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

import Link from 'next/link'
import type { Metadata } from 'next'
import {
  Calendar,
  ShoppingCart,
  ChefHat,
  BarChart3,
  Users,
  Sparkles,
  Sun,
  Gift,
  Smartphone,
  Check,
  ArrowRight,
  ShieldCheck,
  MapPin,
  BellRing,
  FileText,
  PiggyBank,
  Mail,
  Wallet,
  UserPlus,
  Link2,
} from 'lucide-react'
import PricingSection from '@/components/PricingSection'

export const metadata: Metadata = {
  title: 'Fam — Eén rustig overzicht voor het hele gezin',
  description:
    'Fam brengt agenda, boodschappen, recepten, budget, uitjes en je gezin samen op één plek. Importeer je bankafschrift, krijg op tijd een seintje voor paspoort of APK, en laat de AI meedenken. Gratis te beginnen, in seconden op je telefoon.',
}

const HERO_IMG =
  'https://images.unsplash.com/photo-1511895426328-dc8714191300?auto=format&fit=crop&w=1280&q=80'
const FOOD_IMG =
  'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1080&q=80'

const FEATURES = [
  { icon: Calendar, color: 'bg-violet-100 text-violet-600', title: 'Gedeelde agenda', text: 'Alle afspraken op één plek — automatisch gevuld vanuit je Google-, Outlook- of Parro-agenda, met een herinnering precies wanneer je die nodig hebt.' },
  { icon: ShoppingCart, color: 'bg-emerald-100 text-emerald-600', title: 'Boodschappenlijst', text: 'Wat de één toevoegt, ziet de ander direct in de winkel. Nooit meer dubbel of vergeten.' },
  { icon: BarChart3, color: 'bg-sky-100 text-sky-600', title: 'Slim budget', text: 'Importeer je bankafschrift, laat het automatisch indelen en zie per dag wat je nog kunt uitgeven — vaste lasten, abonnementen en leningen netjes apart.' },
  { icon: PiggyBank, color: 'bg-emerald-100 text-emerald-600', title: 'Sparen & potjes', text: 'Per categorie een dag-potje dat doorrolt, spaardoelen met streefdatum en aan het eind van de maand advies wat je opzij kunt zetten.' },
  { icon: MapPin, color: 'bg-teal-100 text-teal-600', title: 'Uitjes in de buurt', text: 'Ontdek gratis uitjes en álle speeltuinen op de kaart — gefilterd op leeftijd en prijs. Ook als je op vakantie bent.' },
  { icon: BellRing, color: 'bg-amber-100 text-amber-600', title: 'Slimme herinneringen', text: 'Een seintje een half jaar vóór je paspoort, ID, APK of verzekering verloopt — en op tijd voor verjaardagen, Vaderdag en Sinterklaas.' },
  { icon: ChefHat, color: 'bg-orange-100 text-orange-500', title: 'Recepten', text: 'Een receptenboek met duimpjes. Wat in de smaak valt, komt vaker terug — of laat de AI een weekmenu maken.' },
  { icon: FileText, color: 'bg-indigo-100 text-indigo-600', title: 'Documenten & pasjes', text: 'Bewaar belangrijke documenten en al je klantenkaarten met barcode — altijd bij de hand aan de kassa.' },
  { icon: Sparkles, color: 'bg-violet-100 text-violet-600', title: 'AI-assistent', text: 'Vraag wat je vanavond eet of laat een weekmenu maken. Slimme hulp die jullie week kent.' },
  { icon: Gift, color: 'bg-pink-100 text-pink-600', title: 'Gezinsspel & taken', text: 'Maak van klusjes een spel: taken verdelen, punten verdienen en samen sparen voor een beloning.' },
  { icon: Mail, color: 'bg-sky-100 text-sky-600', title: 'Gezinsmail', text: 'Een eigen inbox-adres voor school en clubs — de AI sorteert post automatisch in je agenda en documenten. (Premium)' },
  { icon: Sun, color: 'bg-amber-100 text-amber-600', title: 'Weer', text: 'De verwachting voor jullie plek, gekoppeld aan jullie plannen — zodat je weet of die training doorgaat.' },
]

const STEPS = [
  { icon: UserPlus, title: 'Maak gratis een gezin aan', text: 'In een halve minuut een eigen, veilige omgeving voor jullie gezin — zonder appstore.' },
  { icon: Link2, title: 'Koppel je agenda & bank', text: 'Plak je agenda-link en sleep je bankafschrift erin. Fam vult de boel automatisch.' },
  { icon: Users, title: 'Nodig het gezin uit', text: 'Iedereen een eigen login, alles gedeeld. Vanaf nu staat alles op één plek.' },
]

const FAQ = [
  { q: 'Is Fam echt gratis?', a: 'Ja. Het Basis-pakket met agenda, boodschappen, recepten en gezinsoverzicht is gratis, voor altijd. Wil je meer — zoals de slimme budget-tools of gezinsmail — dan kies je Plus of Compleet, maandelijks opzegbaar.' },
  { q: 'Hoe werkt het importeren van mijn bankafschrift?', a: 'Je downloadt het afschrift bij je bank (CSV, MT940, CAMT of Excel) en sleept het in Fam. Het wordt op je eigen apparaat ingelezen en automatisch ingedeeld. Je kiest zelf of je alleen uitgaven, alleen inkomsten of beide importeert.' },
  { q: 'Moet ik iets downloaden uit een appstore?', a: 'Nee. Je installeert Fam rechtstreeks vanuit je browser op je telefoon of tablet. Eén tik vanaf je startscherm en je bent startklaar.' },
  { q: 'Kan het hele gezin meedoen?', a: 'Zeker. Nodig gezinsleden uit via e-mail; ieder krijgt een eigen veilige login binnen jullie gezin. Meldingen kun je per persoon richten.' },
  { q: 'Werkt het ook ’s avonds en op kleine schermen?', a: 'Ja. Fam heeft een rustige donkere modus, instelbare lettergrootte en hoog contrast, en is volledig gemaakt voor de telefoon.' },
  { q: 'Wat doet de AI met onze gegevens?', a: 'Je bepaalt zelf of de AI aan staat en welke gegevens hij mag gebruiken. Alles is per categorie in te stellen en helemaal uit te zetten. Je kunt je gegevens exporteren of je account met één klik verwijderen.' },
]

export default function Landing() {
  return (
    <div className="min-h-[100dvh] bg-white text-slate-800">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-cardborder bg-white/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <Link href="/" className="flex items-center gap-2">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-brand to-emerald-600 text-base font-extrabold text-white shadow-sm shadow-brand/30">
              F
            </span>
            <span className="text-lg font-extrabold">Fam</span>
          </Link>
          <nav className="hidden items-center gap-6 text-sm font-semibold text-slate-600 md:flex">
            <a href="#functies" className="transition-colors hover:text-brand">Functies</a>
            <a href="#hoe" className="transition-colors hover:text-brand">Hoe het werkt</a>
            <a href="#pakketten" className="transition-colors hover:text-brand">Pakketten</a>
            <a href="#faq" className="transition-colors hover:text-brand">Vragen</a>
          </nav>
          <div className="flex items-center gap-2">
            <Link href="/inloggen" className="pill px-3.5 py-2 text-sm font-semibold text-slate-600 hover:text-brand">
              Inloggen
            </Link>
            <Link
              href="/registreren"
              className="pill bg-brand px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-brand/20 hover:bg-brand-dark"
            >
              Gratis beginnen
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-14 sm:px-6 lg:grid-cols-2 lg:py-20">
        <div>
          <span className="pill inline-flex bg-brand-light px-3 py-1 text-xs font-semibold text-brand">
            Voor het hele gezin · gratis te beginnen
          </span>
          <h1 className="mt-4 text-4xl font-extrabold leading-[1.1] tracking-tight sm:text-5xl">
            Eén rustig overzicht voor het hele gezin
          </h1>
          <p className="mt-5 text-lg leading-relaxed text-slate-500">
            Agenda, boodschappen, recepten, budget en uitjes op één plek. Importeer je bankafschrift,
            krijg op tijd een seintje voor paspoort of APK, en laat de AI meedenken — zodat jullie
            minder regelen en meer samen zijn.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link
              href="/registreren"
              className="pill bg-brand px-6 py-3 text-white shadow-sm shadow-brand/20 hover:bg-brand-dark"
            >
              Gratis beginnen
              <ArrowRight className="h-4 w-4" />
            </Link>
            <a href="#functies" className="pill border border-cardborder px-6 py-3 text-slate-700 hover:bg-slate-50">
              Bekijk functies
            </a>
          </div>
          <p className="mt-4 flex items-center gap-1.5 text-xs text-slate-400">
            <Smartphone className="h-3.5 w-3.5" />
            Geen appstore nodig · in een minuut op je telefoon
          </p>
        </div>
        <div className="relative">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={HERO_IMG}
            alt="Een gezin samen thuis"
            className="aspect-[4/3] w-full rounded-card object-cover shadow-soft"
          />
          <div className="absolute -bottom-5 -left-3 hidden items-center gap-3 rounded-2xl border border-cardborder bg-white p-3 shadow-soft sm:flex">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-100 text-emerald-600">
              <Check className="h-5 w-5" strokeWidth={2.5} />
            </span>
            <div>
              <p className="text-sm font-bold text-slate-800">Melk is bijna op</p>
              <p className="text-xs text-slate-500">toegevoegd aan boodschappen</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="functies" className="bg-canvas py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-extrabold sm:text-4xl">Alles voor het gezinsleven, op één plek</h2>
            <p className="mt-3 text-slate-500">
              Geen losse appjes, briefjes en kalenders meer. Fam brengt het samen — overzichtelijk en warm.
            </p>
          </div>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map((f) => {
              const Icon = f.icon
              return (
                <div key={f.title} className="rounded-card border border-cardborder bg-white p-5 shadow-card">
                  <span className={`grid h-11 w-11 place-items-center rounded-2xl ${f.color}`}>
                    <Icon className="h-6 w-6" strokeWidth={2.1} />
                  </span>
                  <h3 className="mt-4 text-base font-bold text-slate-800">{f.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-slate-500">{f.text}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Hoe het werkt */}
      <section id="hoe" className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-extrabold sm:text-4xl">In drie stappen startklaar</h2>
          <p className="mt-3 text-slate-500">Geen gedoe met installeren of instellen. Binnen een minuut staat alles klaar.</p>
        </div>
        <div className="mt-10 grid gap-5 sm:grid-cols-3">
          {STEPS.map((s, i) => {
            const Icon = s.icon
            return (
              <div key={s.title} className="relative rounded-card border border-cardborder bg-white p-6 shadow-card">
                <span className="absolute right-5 top-5 text-3xl font-extrabold text-slate-100">{i + 1}</span>
                <span className="grid h-12 w-12 place-items-center rounded-2xl bg-brand-light text-brand">
                  <Icon className="h-6 w-6" strokeWidth={2.1} />
                </span>
                <h3 className="mt-4 text-base font-bold text-slate-800">{s.title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-slate-500">{s.text}</p>
              </div>
            )
          })}
        </div>
      </section>

      {/* Highlight: slim budget */}
      <section className="bg-canvas py-16 sm:py-20">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 sm:px-6 lg:grid-cols-2">
          <div>
            <span className="pill inline-flex bg-sky-100 px-3 py-1 text-xs font-semibold text-sky-600">Slim budget</span>
            <h2 className="mt-4 text-3xl font-extrabold sm:text-4xl">Grip op het huishoudgeld, zonder spreadsheets</h2>
            <p className="mt-4 text-lg leading-relaxed text-slate-500">
              Sleep je bankafschrift erin en Fam doet de rest: uitgaven automatisch ingedeeld, vaste
              lasten apart, en in één oogopslag wat je vandaag nog kunt uitgeven. Aan het eind van de
              maand zie je precies wat je opzij kunt zetten.
            </p>
            <ul className="mt-6 flex flex-col gap-2.5">
              {['Bankafschrift importeren (CSV, MT940, CAMT, Excel)', 'Automatisch indelen in categorieën', 'Dag-potjes die doorrollen als je ze niet opmaakt', 'Spaardoelen en maandelijks spaaradvies'].map((b) => (
                <li key={b} className="flex items-center gap-2 text-sm text-slate-600">
                  <Check className="h-4 w-4 shrink-0 text-emerald-500" strokeWidth={2.4} />
                  {b}
                </li>
              ))}
            </ul>
          </div>
          {/* Zelfgemaakte preview (geen externe afbeelding) */}
          <div className="rounded-card border border-cardborder bg-white p-5 shadow-soft">
            <div className="flex items-center gap-2">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-light text-brand">
                <Wallet className="h-5 w-5" />
              </span>
              <div>
                <p className="text-sm font-bold text-slate-800">Vandaag te besteden</p>
                <p className="text-xs text-slate-500">periode 15 mei – 15 jun</p>
              </div>
              <span className="ml-auto text-2xl font-extrabold text-brand">€23</span>
            </div>
            <div className="mt-4 h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
              <div className="h-full w-[64%] rounded-full bg-brand" />
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2 text-center">
              {[
                { l: 'Boodschappen', v: '€12' },
                { l: 'Vervoer', v: '€6' },
                { l: 'Vrij', v: '€5' },
              ].map((p) => (
                <div key={p.l} className="rounded-2xl bg-slate-50 p-3">
                  <p className="text-xs text-slate-500">{p.l}</p>
                  <p className="text-base font-extrabold text-slate-800">{p.v}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 flex items-center gap-3 rounded-2xl bg-emerald-100 p-3">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-emerald-500/15 text-emerald-600">
                <PiggyBank className="h-5 w-5" />
              </span>
              <div>
                <p className="text-sm font-bold text-emerald-700 dark:text-emerald-300">€340 over deze maand</p>
                <p className="text-xs text-emerald-700/80 dark:text-emerald-300/80">mooi om naar je spaarrekening te zetten</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Highlight: koelkast-scan */}
      <section className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 sm:px-6 lg:grid-cols-2">
        <div className="order-2 lg:order-1">
          <span className="pill inline-flex bg-rose-100 px-3 py-1 text-xs font-semibold text-rose-600">Koelkast-scan</span>
          <h2 className="mt-4 text-3xl font-extrabold sm:text-4xl">Koken met wat je al hebt</h2>
          <p className="mt-4 text-lg leading-relaxed text-slate-500">
            Geen inspiratie en geen zin in verspilling? Maak een foto van je koelkast. Fam herkent
            de ingrediënten, stelt gerechten voor en zet ontbrekende producten met één tik op de
            gedeelde boodschappenlijst.
          </p>
          <ul className="mt-6 flex flex-col gap-2.5">
            {['De AI herkent je ingrediënten', 'Receptsuggesties met wat in huis is', 'Ziet wat bijna op is, zoals melk', 'Minder weggooien, minder verspilling'].map((b) => (
              <li key={b} className="flex items-center gap-2 text-sm text-slate-600">
                <Check className="h-4 w-4 shrink-0 text-emerald-500" strokeWidth={2.4} />
                {b}
              </li>
            ))}
          </ul>
        </div>
        <div className="order-1 lg:order-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={FOOD_IMG} alt="Verse ingrediënten" className="aspect-[4/3] w-full rounded-card object-cover shadow-soft" />
        </div>
      </section>

      {/* Highlight: nooit meer een datum vergeten */}
      <section className="bg-canvas py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <span className="pill inline-flex bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-600">Altijd op tijd</span>
            <h2 className="mt-4 text-3xl font-extrabold sm:text-4xl">Nooit meer verrast door een datum</h2>
            <p className="mt-3 text-slate-500">
              Fam houdt de belangrijke datums voor je in de gaten en geeft op tijd een seintje — op je telefoon, bij de juiste persoon.
            </p>
          </div>
          <div className="mx-auto mt-10 grid max-w-4xl gap-4 sm:grid-cols-3">
            {[
              { icon: ShieldCheck, t: 'Paspoort & ID', d: 'Een half jaar van tevoren een seintje — ook voor de kinderen.' },
              { icon: BellRing, t: 'APK & verzekering', d: 'Ruim op tijd herinnerd, zodat je nooit te laat bent.' },
              { icon: Gift, t: 'Verjaardagen & feesten', d: 'Vaderdag, Moederdag, Sinterklaas en elke verjaardag op tijd.' },
            ].map((c) => {
              const Icon = c.icon
              return (
                <div key={c.t} className="rounded-card border border-cardborder bg-white p-5 shadow-card">
                  <span className="grid h-11 w-11 place-items-center rounded-2xl bg-amber-100 text-amber-600">
                    <Icon className="h-6 w-6" strokeWidth={2.1} />
                  </span>
                  <h3 className="mt-4 text-base font-bold text-slate-800">{c.t}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-slate-500">{c.d}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <PricingSection />

      {/* Install / PWA */}
      <section id="installeren" className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 sm:px-6 lg:grid-cols-2">
        <div>
          <span className="pill inline-flex bg-sky-100 px-3 py-1 text-xs font-semibold text-sky-600">App</span>
          <h2 className="mt-4 text-3xl font-extrabold sm:text-4xl">Fam op je telefoon, zonder appstore</h2>
          <p className="mt-4 text-lg leading-relaxed text-slate-500">
            Installeer Fam rechtstreeks vanuit je browser op telefoon of tablet, net als een gewone
            app. Open het met één tik vanaf je startscherm — snel, vertrouwd en voor het hele gezin.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link href="/registreren" className="pill bg-brand px-6 py-3 text-white shadow-sm shadow-brand/20 hover:bg-brand-dark">
              Gratis beginnen
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
        <div className="flex justify-center">
          <div className="grid grid-cols-2 gap-4">
            {[
              { icon: Smartphone, label: 'Werkt als app' },
              { icon: ShieldCheck, label: 'Eigen veilige login' },
              { icon: Users, label: 'Voor het hele gezin' },
              { icon: Sparkles, label: 'Slim met AI' },
            ].map((b) => {
              const Icon = b.icon
              return (
                <div key={b.label} className="flex w-full flex-col items-center gap-2 rounded-card border border-cardborder bg-white p-5 text-center shadow-card">
                  <span className="grid h-11 w-11 place-items-center rounded-2xl bg-brand-light text-brand">
                    <Icon className="h-6 w-6" strokeWidth={2.1} />
                  </span>
                  <span className="text-xs font-semibold text-slate-600">{b.label}</span>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="bg-canvas py-16 sm:py-20">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <h2 className="text-center text-3xl font-extrabold sm:text-4xl">Veelgestelde vragen</h2>
          <div className="mt-8 flex flex-col gap-3">
            {FAQ.map((item) => (
              <details key={item.q} className="group rounded-card border border-cardborder bg-white p-5 shadow-card">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-bold text-slate-800">
                  {item.q}
                  <span className="text-slate-400 transition-transform group-open:rotate-45">+</span>
                </summary>
                <p className="mt-3 text-sm leading-relaxed text-slate-500">{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA band */}
      <section className="px-4 py-16 sm:px-6">
        <div className="mx-auto max-w-5xl rounded-[28px] bg-gradient-to-br from-brand to-emerald-600 px-6 py-14 text-center text-white shadow-soft">
          <h2 className="text-3xl font-extrabold sm:text-4xl">Klaar voor meer rust in huis?</h2>
          <p className="mx-auto mt-3 max-w-xl text-white/90">
            Begin vandaag gratis met Fam. In een minuut startklaar — het hele gezin op één plek.
          </p>
          <Link
            href="/registreren"
            className="pill mt-7 inline-flex bg-white px-7 py-3 font-bold text-brand shadow-sm hover:bg-emerald-50"
          >
            Gratis beginnen
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-cardborder">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-8 sm:flex-row sm:px-6">
          <Link href="/" className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-brand to-emerald-600 text-sm font-extrabold text-white">
              F
            </span>
            <span className="font-extrabold">Fam</span>
          </Link>
          <p className="text-xs text-slate-400">Jullie gezinsdashboard voor agenda, boodschappen, budget en meer.</p>
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-sm font-semibold text-slate-600">
            <Link href="/privacy" className="hover:text-brand">Privacy</Link>
            <Link href="/voorwaarden" className="hover:text-brand">Voorwaarden</Link>
            <Link href="/inloggen" className="hover:text-brand">Inloggen</Link>
            <Link href="/registreren" className="hover:text-brand">Account aanmaken</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}

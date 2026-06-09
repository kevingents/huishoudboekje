import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export const metadata = {
  title: 'Privacyverklaring — Fam',
  description: 'Hoe Fam omgaat met jullie persoonsgegevens.',
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="text-lg font-extrabold text-slate-800">{title}</h2>
      <div className="mt-2 flex flex-col gap-2 text-sm leading-relaxed text-slate-600">{children}</div>
    </section>
  )
}

export default function PrivacyPage() {
  return (
    <div className="min-h-[100dvh] bg-canvas">
      <header className="border-b border-cardborder bg-white">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-4 sm:px-6">
          <Link
            href="/"
            className="grid h-9 w-9 place-items-center rounded-full border border-cardborder text-slate-500 hover:bg-slate-50"
            aria-label="Terug"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <span className="grid h-8 w-8 place-items-center rounded-xl bg-gradient-to-br from-brand to-emerald-600 text-sm font-extrabold text-white">
            F
          </span>
          <span className="font-extrabold text-slate-800">Privacyverklaring</span>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <p className="text-sm text-slate-500">Laatst bijgewerkt: juni 2026</p>
        <p className="mt-3 text-sm leading-relaxed text-slate-600">
          Fam is een app waarmee een gezin samen de agenda, boodschappen, het budget, documenten en
          meer beheert. We gaan zorgvuldig om met jullie gegevens en verwerken niet meer dan nodig.
          Deze verklaring legt uit welke persoonsgegevens we verwerken, waarom, met wie we ze delen en
          welke rechten je hebt.
        </p>

        <Section title="Wie is verantwoordelijk?">
          <p>
            Fam (de aanbieder van deze app) is de verwerkingsverantwoordelijke. Vragen of een verzoek
            over je gegevens? Mail naar <span className="font-semibold text-slate-700">privacy@fam.app</span>.
          </p>
          <p className="text-xs text-slate-400">
            (Vul hier vóór livegang je echte bedrijfs-/contactgegevens in.)
          </p>
        </Section>

        <Section title="Welke gegevens verwerken we?">
          <ul className="list-disc pl-5">
            <li>Accountgegevens: naam, e-mailadres en een versleuteld (gehasht) wachtwoord.</li>
            <li>Gezinsleden: naam, rol, geboortedatum en of iemand een kind is.</li>
            <li>Optionele medische gegevens per gezinslid (bloedgroep, allergieën, medicijnen) — zie hieronder.</li>
            <li>Agenda-afspraken (ook gesynct uit Google/Outlook/Apple/Parro), boodschappen en recepten.</li>
            <li>Budget, transacties, spaardoelen en vaste lasten.</li>
            <li>Contacten (zoals school, opvang, dokter), documenten/garantiebewijzen en officiële documenten.</li>
            <li>Klantenkaarten (pasnummer/barcode en foto).</li>
            <li>Gezinsmail: doorgestuurde e-mails, hun inhoud en bijlagen, en de AI-samenvatting ervan.</li>
            <li>Gebruiksgegevens die nodig zijn om de app te laten werken (bijv. meldingen, pushabonnement).</li>
          </ul>
        </Section>

        <Section title="Waarvoor en op welke grondslag?">
          <ul className="list-disc pl-5">
            <li>
              <span className="font-semibold text-slate-700">Uitvoering van de overeenkomst</span> — om je
              account en de kernfuncties (agenda, boodschappen, budget, documenten) te leveren.
            </li>
            <li>
              <span className="font-semibold text-slate-700">Toestemming</span> — voor de AI-assistent,
              koelkast-scan en gezinsmail. Je kunt deze in Instellingen aan- of uitzetten.
            </li>
            <li>
              <span className="font-semibold text-slate-700">Wettelijke plicht</span> — betaal- en
              administratiegegevens bij een abonnement.
            </li>
            <li>
              <span className="font-semibold text-slate-700">Gerechtvaardigd belang</span> — partner-aanbiedingen
              in de app; hierop kun je je afmelden.
            </li>
          </ul>
        </Section>

        <Section title="AI-functies">
          <p>
            Als je de AI-assistent, koelkast-scan of gezinsmail gebruikt, sturen we de daarvoor benodigde
            inhoud (zoals je vraag, een foto of de doorgestuurde mail) naar onze AI-verwerker om een
            antwoord of automatische sortering te maken. In Instellingen bepaal je of de AI aan staat en
            welke gegevens hij mag gebruiken. Voor kind-accounts kun je de AI volledig uitzetten.
          </p>
        </Section>

        <Section title="Kinderen">
          <p>
            Een ouder of verzorger voert de gegevens van gezinsleden in en is daarvoor verantwoordelijk;
            kinderen geven niet zelfstandig toestemming. Kind-accounts hebben geen toegang tot de
            AI-assistent, modules of beheer. Voer niet meer gegevens van kinderen in dan nodig.
          </p>
        </Section>

        <Section title="Bijzondere (gevoelige) gegevens">
          <p>
            Medische gegevens (bloedgroep, allergieën, medicijnen) en officiële documenten (zoals een
            paspoort of rijbewijs) zijn bijzondere/gevoelige gegevens. Ze zijn optioneel, je voert ze zelf
            in, ze zijn alleen zichtbaar binnen jullie eigen gezin en worden niet voor andere doeleinden
            gebruikt. Doorgestuurde gezinsmail kan ongemerkt gevoelige gegevens bevatten — stuur alleen
            door wat je echt wilt bewaren.
          </p>
        </Section>

        <Section title="Met wie delen we gegevens (sub-verwerkers)?">
          <p>We delen gegevens alleen met partijen die ons helpen de dienst te leveren:</p>
          <ul className="list-disc pl-5">
            <li><span className="font-semibold text-slate-700">Neon / PostgreSQL</span> — opslag van de database.</li>
            <li><span className="font-semibold text-slate-700">Vercel</span> — hosting van de app.</li>
            <li><span className="font-semibold text-slate-700">Anthropic (Claude)</span> — de AI-functies.</li>
            <li><span className="font-semibold text-slate-700">Resend</span> — uitgaande e-mail en inkomende gezinsmail.</li>
            <li><span className="font-semibold text-slate-700">Mollie</span> — betalingen en abonnementen.</li>
            <li><span className="font-semibold text-slate-700">Open-Meteo</span> — weersvoorspelling (locatie).</li>
          </ul>
          <p>
            Met deze partijen zijn verwerkersovereenkomsten gesloten. We verkopen je gegevens nooit en
            gebruiken geen tracking- of advertentiecookies van derden.
          </p>
        </Section>

        <Section title="Cookies">
          <p>
            Fam gebruikt alleen één functionele cookie om je ingelogd te houden. Er zijn geen
            analytics-, tracking- of marketingcookies. Daarom is er ook geen cookiebanner nodig.
          </p>
        </Section>

        <Section title="Hoe lang bewaren we gegevens?">
          <p>
            We bewaren je gegevens zolang je een account hebt. Verwijder je je account, dan wissen we alle
            gezinsgegevens onomkeerbaar. Inlog- en herstel-links verlopen automatisch (binnen 15 minuten
            tot 1 uur).
          </p>
        </Section>

        <Section title="Jouw rechten">
          <p>Je hebt recht op inzage, correctie, verwijdering en overdraagbaarheid van je gegevens:</p>
          <ul className="list-disc pl-5">
            <li>
              <span className="font-semibold text-slate-700">Inzage / meenemen:</span> download al je
              gegevens via <span className="font-semibold">Instellingen → Account → Mijn gegevens downloaden</span>.
            </li>
            <li>
              <span className="font-semibold text-slate-700">Verwijderen:</span> wis je account en alle
              gezinsgegevens via <span className="font-semibold">Instellingen → Account → Account verwijderen</span>.
            </li>
            <li><span className="font-semibold text-slate-700">Corrigeren:</span> pas gegevens direct in de app aan.</li>
          </ul>
          <p>
            Je kunt ook een klacht indienen bij de Autoriteit Persoonsgegevens.
          </p>
        </Section>

        <Section title="Wijzigingen">
          <p>
            We kunnen deze verklaring aanpassen. Bij belangrijke wijzigingen laten we het je weten in de
            app. Bekijk ook de{' '}
            <Link href="/voorwaarden" className="font-semibold text-brand hover:underline">
              gebruiksvoorwaarden
            </Link>
            .
          </p>
        </Section>

        <div className="mt-10">
          <Link href="/" className="pill border border-cardborder bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">
            <ArrowLeft className="h-4 w-4" />
            Terug naar Fam
          </Link>
        </div>
      </main>
    </div>
  )
}

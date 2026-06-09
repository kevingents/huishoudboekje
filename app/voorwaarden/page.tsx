import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export const metadata = {
  title: 'Gebruiksvoorwaarden — Fam',
  description: 'De voorwaarden voor het gebruik van Fam.',
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="text-lg font-extrabold text-slate-800">{title}</h2>
      <div className="mt-2 flex flex-col gap-2 text-sm leading-relaxed text-slate-600">{children}</div>
    </section>
  )
}

export default function VoorwaardenPage() {
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
          <span className="font-extrabold text-slate-800">Gebruiksvoorwaarden</span>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <p className="text-sm text-slate-500">Laatst bijgewerkt: juni 2026</p>

        <Section title="1. Over Fam">
          <p>
            Fam is een gezinsapp voor o.a. agenda, boodschappen, budget, documenten en gezinsmail. Door
            een account aan te maken of de app te gebruiken ga je akkoord met deze voorwaarden.
          </p>
        </Section>

        <Section title="2. Je account">
          <p>
            Je bent verantwoordelijk voor je inloggegevens en voor wat er onder jouw account gebeurt. De
            gezinseigenaar nodigt gezinsleden uit en beheert het pakket. Je voert alleen gegevens in van je
            eigen gezin en bent verantwoordelijk voor de gegevens van gezinsleden, inclusief kinderen.
          </p>
        </Section>

        <Section title="3. Pakketten en betaling">
          <p>
            Fam heeft een gratis Basis-pakket en betaalde pakketten (Plus en Compleet), maandelijks of per
            jaar (met 10% korting). De eerste maand van een betaald pakket is gratis. Betalingen lopen via
            Mollie. Je kunt maandelijks opzeggen of wisselen; reeds betaalde periodes worden niet
            terugbetaald. Prijzen kunnen wijzigen; we melden dit vooraf.
          </p>
        </Section>

        <Section title="4. Toegestaan gebruik">
          <p>
            Gebruik Fam alleen voor je eigen gezinsbeheer en niet voor onrechtmatige doeleinden. Voer geen
            gegevens van anderen in zonder dat je daartoe gerechtigd bent. Misbruik kan leiden tot
            beëindiging van je account.
          </p>
        </Section>

        <Section title="5. Koppelingen en AI">
          <p>
            Koppelingen (zoals agenda via iCal) en AI-functies zijn hulpmiddelen. Resultaten van de AI
            kunnen fouten bevatten; controleer belangrijke zaken zelf. We zijn niet verantwoordelijk voor
            de inhoud of beschikbaarheid van diensten van derden.
          </p>
        </Section>

        <Section title="6. Beschikbaarheid en aansprakelijkheid">
          <p>
            We doen ons best de app betrouwbaar te laten werken, maar kunnen geen ononderbroken
            beschikbaarheid garanderen. Voor zover wettelijk toegestaan is onze aansprakelijkheid beperkt.
            Maak zelf belangrijke gegevens niet uitsluitend in de app afhankelijk.
          </p>
        </Section>

        <Section title="7. Privacy">
          <p>
            We gaan zorgvuldig met je gegevens om. Lees hoe in de{' '}
            <Link href="/privacy" className="font-semibold text-brand hover:underline">
              privacyverklaring
            </Link>
            .
          </p>
        </Section>

        <Section title="8. Beëindiging">
          <p>
            Je kunt je account op elk moment verwijderen via Instellingen; daarbij worden al je
            gezinsgegevens onomkeerbaar gewist.
          </p>
        </Section>

        <Section title="9. Wijzigingen">
          <p>We kunnen deze voorwaarden aanpassen. Bij belangrijke wijzigingen informeren we je in de app.</p>
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

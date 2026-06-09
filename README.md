# Huishoudboekje — Gezinsdashboard

Een modern gezinsdashboard gebouwd met **Next.js 14 (App Router)**, **TypeScript** en
**Tailwind CSS**, met een echte backend (**Prisma + SQLite**). Eén centrale plek waar
agenda, boodschappen, voorraad, budget, weer, recepten, abonnementen en AI samenkomen —
inclusief koppelingen met bekende apps.

![Dashboard preview](https://images.unsplash.com/photo-1511895426328-dc8714191300?auto=format&fit=crop&w=1200&q=80)

## Aan de slag

```bash
npm install
npx prisma migrate dev   # maakt de SQLite-database
npm run db:seed          # vult de database met startdata
npm run dev
```

Open vervolgens [http://localhost:3000](http://localhost:3000).

> Alle gegevens worden bewaard in een lokale SQLite-database (`prisma/dev.db`) en blijven
> behouden na verversen. Voor productie/multi-device: zet de Prisma-provider op
> `postgresql` en wijs `DATABASE_URL` naar een gehoste Postgres.

## Koppelingen

Te beheren via het **Instellingen → Integraties**-menu:

| Koppeling | Werkt met | Nodig |
| --------- | --------- | ----- |
| **Weer** | Open-Meteo | niets (werkt direct) |
| **Agenda & school** | Parro, Google, Outlook, Apple | een iCal-URL plakken |
| **AI Assistent** | Claude (Anthropic) | `ANTHROPIC_API_KEY` |
| **Abonnementen** | Mollie | `MOLLIE_API_KEY` (test-key kan) |

Secrets horen in `.env.local` (zie `.env.example`). Zonder key valt AI terug op een
voorbeeldantwoord en worden abonnementen lokaal bijgehouden.

## Scripts

| Script              | Omschrijving                          |
| ------------------- | ------------------------------------- |
| `npm run dev`       | Start de ontwikkelserver              |
| `npm run build`     | Bouwt de productieversie              |
| `npm run start`     | Start de gebouwde productieversie     |
| `npm run db:seed`   | Vult de database met startdata        |
| `npm run db:reset`  | Reset de database en seedt opnieuw    |

## Structuur

De app is een multi-page Next.js-app. De sidebar (desktop) en bottom-nav
(mobiel) zitten in de gedeelde root-layout en blijven over alle routes staan;
de actieve route licht automatisch op via `usePathname`.

```
app/
  layout.tsx            # Root layout: Inter font + gedeelde app-frame (Sidebar + MobileNav)
  page.tsx              # /            — Vandaag (dashboard met alle cards)
  agenda/page.tsx       # /agenda      — Afspraken gegroepeerd per dag
  boodschappen/page.tsx # /boodschappen — Interactieve lijst per categorie + toevoegen
  recepten/page.tsx     # /recepten    — Receptengrid met tag-filter en favorieten
  budget/page.tsx       # /budget      — Maandoverzicht, categorieën en transacties
  gezin/page.tsx        # /gezin       — Gezinsleden en verjaardagen
  ai-assistent/page.tsx # /ai-assistent — Chat met Claude (persistent)
  abonnementen/page.tsx # /abonnementen — Mollie-abonnementen
  instellingen/page.tsx # /instellingen — Toggles, budget-target, Integraties
  api/                  # Route handlers per domein + koppelingen (weather, ical, ai, subscriptions, webhooks)
  globals.css           # Tailwind + basis-styling
components/
  Sidebar.tsx           # Linker navigatie (desktop), Next Link + actieve staat
  MobileNav.tsx         # Bottom navigation (mobiel)
  PageHeader.tsx        # Gedeelde paginakop (icoon-badge, titel, acties)
  Modal.tsx             # Herbruikbare modal voor toevoeg-formulieren
  IntegrationsSection.tsx # Integraties-hub (Instellingen)
  DashboardCard.tsx     # Herbruikbare kaart-wrapper
  BudgetCard / AgendaCard / ShoppingList # Dashboard-cards (lezen uit de API)
lib/
  db.ts                 # Prisma-client (singleton)
  api.ts / hooks.ts     # Client-datalaag: fetchers + SWR-hooks (optimistic)
  types.ts              # Gedeelde types (API/DB-vorm)
  mollie.ts / weather.ts / icons.ts / date.ts / serialize.ts  # Helpers
  mockData.ts           # Navigatie + statische dashboard-flavor + seed-bron
prisma/
  schema.prisma         # Datamodel (SQLite -> Postgres-ready)
  seed.ts               # Startdata
```

## Designsysteem

| Token            | Waarde     |
| ---------------- | ---------- |
| Achtergrond      | `#F6F8FA`  |
| Kaartrand        | `#E8EDF2`  |
| Border radius    | `24px`     |
| Hoofdaccent      | `#35B558`  |
| Weerkaart        | `#EAF5FF`  |
| AI-kaart         | `#F5EDFF`  |
| Voorraadaccent   | `#FF8A1F`  |
| Font             | Inter      |

De kleuren en radius staan centraal in `tailwind.config.ts`.

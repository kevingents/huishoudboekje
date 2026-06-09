# Huishoudboekje — Gezinsdashboard

Een modern gezinsdashboard gebouwd met **Next.js 14 (App Router)**, **TypeScript** en
**Tailwind CSS**. Eén centrale plek waar agenda, boodschappen, voorraad, budget, weer,
recepten en AI-suggesties samenkomen.

![Dashboard preview](https://images.unsplash.com/photo-1511895426328-dc8714191300?auto=format&fit=crop&w=1200&q=80)

## Aan de slag

```bash
npm install
npm run dev
```

Open vervolgens [http://localhost:3000](http://localhost:3000).

> Alle data is mock-data (zie `lib/mockData.ts`). Er is geen backend of authenticatie nodig.

## Scripts

| Script          | Omschrijving                          |
| --------------- | ------------------------------------- |
| `npm run dev`   | Start de ontwikkelserver              |
| `npm run build` | Bouwt de productieversie              |
| `npm run start` | Start de gebouwde productieversie     |

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
  ai-assistent/page.tsx # /ai-assistent — Chatinterface met snelle prompts
  instellingen/page.tsx # /instellingen — Notificatie-toggles en budget-target
  globals.css           # Tailwind + basis-styling
components/
  Sidebar.tsx           # Linker navigatie (desktop), Next Link + actieve staat
  MobileNav.tsx         # Bottom navigation (mobiel), Next Link + actieve staat
  PageHeader.tsx        # Gedeelde paginakop (icoon-badge, titel, acties)
  DashboardCard.tsx     # Herbruikbare kaart-wrapper
  BudgetCard.tsx        # Budget met circulaire voortgang
  AgendaCard.tsx        # Komende afspraken (dashboard)
  ShoppingList.tsx      # Interactief boodschappenlijstje (dashboard)
lib/
  mockData.ts           # Alle mock-data en types
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

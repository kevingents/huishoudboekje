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

```
app/
  layout.tsx        # Root layout + Inter font
  page.tsx          # Het dashboard (compositie van alle cards)
  globals.css       # Tailwind + basis-styling
components/
  Sidebar.tsx       # Linker navigatie (desktop)
  DashboardCard.tsx # Herbruikbare kaart-wrapper
  BudgetCard.tsx    # Budget met circulaire voortgang
  AgendaCard.tsx    # Komende afspraken
  ShoppingList.tsx  # Interactief boodschappenlijstje
  MobileNav.tsx     # Bottom navigation (mobiel)
lib/
  mockData.ts       # Alle mock-data en types
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

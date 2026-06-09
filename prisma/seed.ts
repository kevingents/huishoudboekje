import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { defaultSettings, DEFAULT_INTEGRATIONS } from '../lib/defaults'

const prisma = new PrismaClient()

/* Multi-tenant seed: één demo-huishouden met een demo-gebruiker en rijke
   voorbeelddata. Echte nieuwe huishoudens krijgen hun data via registratie. */

const familyMembers = [
  { name: 'Mark', initials: 'M', color: 'from-sky-400 to-blue-500', role: 'Vader', birthday: '14 maart' },
  { name: 'Tom', initials: 'T', color: 'from-amber-400 to-orange-500', role: 'Zoon (8)', birthday: '2 september' },
  { name: 'Opa Jan', initials: 'OJ', color: 'from-emerald-400 to-green-500', role: 'Opa', birthday: '30 november' },
  { name: 'Sanne', initials: 'S', color: 'from-violet-400 to-purple-500', role: 'Moeder', birthday: '21 mei' },
]

const shoppingItems = [
  { label: 'Melk', checked: true, category: 'Zuivel', qty: '2 pak' },
  { label: 'Bananen', checked: false, category: 'Groente & fruit', qty: '1 tros' },
  { label: 'Broccoli', checked: false, category: 'Groente & fruit', qty: null },
  { label: 'Luiers maat 5', checked: false, category: 'Verzorging', qty: '1 pak' },
  { label: 'Raspkaas', checked: false, category: 'Zuivel', qty: null },
  { label: 'Volkoren pasta', checked: false, category: 'Voorraadkast', qty: null },
  { label: 'Kipfilet', checked: false, category: 'Vlees & vis', qty: '500 g' },
  { label: 'Appels', checked: true, category: 'Groente & fruit', qty: '6 st' },
  { label: 'Tandpasta', checked: false, category: 'Verzorging', qty: null },
  { label: 'Eieren', checked: false, category: 'Zuivel', qty: '10 st' },
]

const agendaEvents = [
  { dateKey: '2026-05-21', day: '21', month: 'mei', weekday: 'Woensdag', title: 'Zwemles Tom', time: '16:00 – 16:45', who: 'Tom', accent: 'sky' },
  { dateKey: '2026-05-21', day: '21', month: 'mei', weekday: 'Woensdag', title: 'Avondeten met Opa Jan', time: '18:30', who: 'Gezin', accent: 'emerald' },
  { dateKey: '2026-05-23', day: '23', month: 'mei', weekday: 'Vrijdag', title: 'Pleindienst', time: '18:00 – 20:00', who: 'Sanne', accent: 'violet' },
  { dateKey: '2026-05-23', day: '23', month: 'mei', weekday: 'Vrijdag', title: 'Afspraak consultatiebureau', time: '10:30', who: 'Sanne', accent: 'violet' },
  { dateKey: '2026-05-24', day: '24', month: 'mei', weekday: 'Zaterdag', title: 'Voetbaltraining', time: '09:30 – 11:00', who: 'Tom', accent: 'amber' },
  { dateKey: '2026-05-24', day: '24', month: 'mei', weekday: 'Zaterdag', title: 'Boodschappen doen', time: '14:00', who: 'Mark', accent: 'sky' },
  { dateKey: '2026-05-26', day: '26', month: 'mei', weekday: 'Maandag', title: 'Tandarts Mark', time: '11:15', who: 'Mark', accent: 'sky' },
  { dateKey: '2026-05-28', day: '28', month: 'mei', weekday: 'Woensdag', title: 'Verjaardag buurvrouw', time: 'Hele dag', who: 'Gezin', accent: 'rose' },
]

const recipes = [
  { title: 'Romige kip-pasta met broccoli', image: 'https://images.unsplash.com/photo-1473093295043-cdd812d0e601?auto=format&fit=crop&w=900&q=80', time: '30 min', servings: '4 personen', tags: 'Snel,Kindvriendelijk', description: 'Romige pasta met malse kip en verse broccoli. Klaar in een half uur.', favorite: true },
  { title: 'Verse lasagne uit de oven', image: 'https://images.unsplash.com/photo-1574894709920-11b28e7367e3?auto=format&fit=crop&w=900&q=80', time: '55 min', servings: '6 personen', tags: 'Oven,Meal prep', description: 'Klassieke lasagne met rijke tomaten-gehaktsaus en romige bechamel.', favorite: true },
  { title: 'Buddha bowl met kikkererwten', image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=900&q=80', time: '25 min', servings: '2 personen', tags: 'Vegetarisch,Gezond', description: 'Kleurrijke bowl met geroosterde groenten, kikkererwten en tahindressing.', favorite: false },
  { title: 'Pannenkoeken voor het hele gezin', image: 'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?auto=format&fit=crop&w=900&q=80', time: '20 min', servings: '4 personen', tags: 'Kindvriendelijk,Budget', description: 'Luchtige pannenkoeken met appel en kaneel — altijd een succes.', favorite: false },
  { title: 'Thaise groene curry', image: 'https://images.unsplash.com/photo-1455619452474-d2be8b1e70cd?auto=format&fit=crop&w=900&q=80', time: '35 min', servings: '4 personen', tags: 'Pittig,Oosters', description: 'Aromatische curry met kokosmelk, kip en seizoensgroenten.', favorite: false },
  { title: 'Geroosterde tomatensoep', image: 'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=900&q=80', time: '40 min', servings: '4 personen', tags: 'Vegetarisch,Comfort food', description: 'Romige soep van langzaam geroosterde tomaten met verse basilicum.', favorite: false },
]

const budgetCategories = [
  { name: 'Boodschappen', icon: 'ShoppingCart', spent: 387, limit: 500, color: 'emerald' },
  { name: 'Verzorging', icon: 'Sparkles', spent: 64, limit: 100, color: 'violet' },
  { name: 'Vrije tijd', icon: 'Calendar', spent: 142, limit: 150, color: 'amber' },
  { name: 'Vervoer', icon: 'Car', spent: 78, limit: 200, color: 'sky' },
]

const transactions = [
  { label: 'Albert Heijn', category: 'Boodschappen', amount: 42.18, date: 'Vandaag' },
  { label: 'Kruidvat', category: 'Verzorging', amount: 18.95, date: 'Gisteren' },
  { label: 'Bioscoop', category: 'Vrije tijd', amount: 31.0, date: '19 mei' },
  { label: 'NS dagkaart', category: 'Vervoer', amount: 16.4, date: '18 mei' },
  { label: 'Bakkerij', category: 'Boodschappen', amount: 7.85, date: '18 mei' },
  { label: 'Speelgoedwinkel', category: 'Vrije tijd', amount: 24.99, date: '17 mei' },
]

const chatMessages = [
  { role: 'assistant', text: 'Goedemorgen Sanne! Ik heb je week alvast bekeken. Waar kan ik mee helpen?' },
  { role: 'user', text: 'Wat eten we vanavond? Het moet snel kunnen.' },
  { role: 'assistant', text: 'Je hebt nog kip en broccoli in voorraad. Wat dacht je van de romige kip-pasta? Klaar in 30 minuten en Tom is er dol op.' },
]

async function main() {
  // Schone slate (idempotent).
  await prisma.$transaction([
    prisma.chatMessage.deleteMany(),
    prisma.transaction.deleteMany(),
    prisma.budgetCategory.deleteMany(),
    prisma.recipe.deleteMany(),
    prisma.agendaEvent.deleteMany(),
    prisma.shoppingItem.deleteMany(),
    prisma.familyMember.deleteMany(),
    prisma.subscription.deleteMany(),
    prisma.notification.deleteMany(),
    prisma.savingsGoal.deleteMany(),
    prisma.fixedCost.deleteMany(),
    prisma.setting.deleteMany(),
    prisma.integration.deleteMany(),
    prisma.user.deleteMany(),
    prisma.household.deleteMany(),
  ])

  const household = await prisma.household.create({
    data: { name: 'Het Jansen Gezin', tier: 'compleet' },
  })
  const householdId = household.id

  await prisma.user.create({
    data: {
      name: 'Sanne Jansen',
      email: 'demo@huishoudboekje.nl',
      passwordHash: await bcrypt.hash('demo1234', 10),
      householdId,
      role: 'owner',
    },
  })

  const withHid = <T extends object>(rows: T[]) => rows.map((r) => ({ ...r, householdId }))

  await prisma.familyMember.createMany({ data: withHid(familyMembers) })
  await prisma.shoppingItem.createMany({ data: withHid(shoppingItems) })
  await prisma.agendaEvent.createMany({ data: withHid(agendaEvents) })
  await prisma.recipe.createMany({ data: withHid(recipes) })
  await prisma.budgetCategory.createMany({ data: withHid(budgetCategories) })
  await prisma.transaction.createMany({ data: withHid(transactions) })
  await prisma.chatMessage.createMany({ data: withHid(chatMessages) })
  await prisma.setting.createMany({ data: defaultSettings(householdId) })
  await prisma.integration.createMany({ data: DEFAULT_INTEGRATIONS.map((i) => ({ ...i, householdId })) })

  console.log('Seed voltooid — demo-account: demo@huishoudboekje.nl / demo1234')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

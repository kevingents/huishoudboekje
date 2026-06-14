import { prisma } from '@/lib/db'
import { requireHousehold, requireModule } from '@/lib/guard'
import { getCurrentMemberName } from '@/lib/auth'
import { maySeePotjeSavings } from '@/lib/budget'

export const dynamic = 'force-dynamic'

export async function GET() {
  const hid = await requireHousehold()
  if (hid instanceof Response) return hid
  const me = await getCurrentMemberName()
  const items = await prisma.familyBudget.findMany({ where: { householdId: hid }, orderBy: { id: 'asc' } })
  // Privé spaarsaldo: laat 'savedTotal' weg voor potjes van een ánder gezinslid,
  // zodat het bedrag niet eens naar de browser gaat (echte privacy, geen CSS-truc).
  const safe = items.map((b) => (maySeePotjeSavings(b.member, me) ? b : { ...b, savedTotal: null }))
  return Response.json(safe)
}

export async function POST(req: Request) {
  const hid = await requireModule('budgetplanner')
  if (hid instanceof Response) return hid
  const body = await req.json()
  if (!body?.name) {
    return Response.json({ error: 'name is verplicht' }, { status: 400 })
  }
  const item = await prisma.familyBudget.create({
    data: {
      householdId: hid,
      name: String(body.name),
      limit: Number(body.limit ?? 0),
      savings: Number(body.savings ?? 0),
      spent: Number(body.spent ?? 0),
      member: body.member ? String(body.member) : null,
      color: String(body.color ?? 'emerald'),
    },
  })
  // Ook het create-antwoord respecteert de privacy: maak je een persoonlijk potje
  // voor een ánder lid aan, dan krijg je het (lege) saldo niet terug.
  const me = await getCurrentMemberName()
  const safe = maySeePotjeSavings(item.member, me) ? item : { ...item, savedTotal: null }
  return Response.json(safe, { status: 201 })
}

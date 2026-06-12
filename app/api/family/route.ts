import { prisma } from '@/lib/db'
import { requireHousehold } from '@/lib/guard'

export const dynamic = 'force-dynamic'

/** Eenvoudige initialen uit een naam, bijv. "Opa Jan" → "OJ". */
function initialsFrom(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

const GRADIENTS = [
  'from-sky-400 to-blue-500',
  'from-amber-400 to-orange-500',
  'from-emerald-400 to-green-500',
  'from-violet-400 to-purple-500',
  'from-rose-400 to-pink-500',
  'from-teal-400 to-cyan-500',
]

export async function GET() {
  const hid = await requireHousehold()
  if (hid instanceof Response) return hid

  // Self-heal: accounts zonder gekoppeld gezinslid (bijv. de eigenaar van vóór
  // deze fix) koppelen we op naam, of we maken het lid aan. Zo sta je zelf ook
  // in keuzelijsten (taken toewijzen) en komen gerichte pushmeldingen goed aan.
  const unlinked = await prisma.user.findMany({
    where: { householdId: hid, memberId: null },
    select: { id: true, name: true, role: true },
  })
  if (unlinked.length > 0) {
    const existing = await prisma.familyMember.findMany({
      where: { householdId: hid },
      select: { id: true, name: true },
    })
    for (const u of unlinked) {
      const uname = u.name.trim().toLowerCase()
      const first = uname.split(/\s+/)[0]
      const match = existing.find((m) => {
        const mname = m.name.trim().toLowerCase()
        return mname === uname || mname === first || mname.split(/\s+/)[0] === first
      })
      if (match) {
        await prisma.user.update({ where: { id: u.id }, data: { memberId: match.id } })
      } else {
        const created = await prisma.familyMember.create({
          data: {
            householdId: hid,
            name: u.name,
            initials: initialsFrom(u.name),
            color: GRADIENTS[existing.length % GRADIENTS.length],
            role: u.role === 'child' ? 'Kind' : 'Ouder',
            isChild: u.role === 'child',
          },
        })
        existing.push({ id: created.id, name: created.name })
        await prisma.user.update({ where: { id: u.id }, data: { memberId: created.id } })
      }
    }
  }

  const members = await prisma.familyMember.findMany({ where: { householdId: hid }, orderBy: { id: 'asc' } })
  return Response.json(members)
}

export async function POST(req: Request) {
  const hid = await requireHousehold()
  if (hid instanceof Response) return hid
  const body = await req.json()
  if (!body?.name) {
    return Response.json({ error: 'name is verplicht' }, { status: 400 })
  }
  const count = await prisma.familyMember.count({ where: { householdId: hid } })
  const member = await prisma.familyMember.create({
    data: {
      householdId: hid,
      name: String(body.name),
      initials: body.initials ? String(body.initials) : initialsFrom(String(body.name)),
      color: body.color ? String(body.color) : GRADIENTS[count % GRADIENTS.length],
      role: body.role ? String(body.role) : null,
      birthday: body.birthday ? String(body.birthday) : null,
      isChild: Boolean(body.isChild),
      bloodType: body.bloodType ? String(body.bloodType) : null,
      allergies: body.allergies ? String(body.allergies) : null,
      medication: body.medication ? String(body.medication) : null,
      medicalNotes: body.medicalNotes ? String(body.medicalNotes) : null,
    },
  })
  return Response.json(member, { status: 201 })
}

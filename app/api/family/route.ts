import { prisma } from '@/lib/db'

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
  const members = await prisma.familyMember.findMany({ orderBy: { id: 'asc' } })
  return Response.json(members)
}

export async function POST(req: Request) {
  const body = await req.json()
  if (!body?.name) {
    return Response.json({ error: 'name is verplicht' }, { status: 400 })
  }
  const count = await prisma.familyMember.count()
  const member = await prisma.familyMember.create({
    data: {
      name: String(body.name),
      initials: body.initials ? String(body.initials) : initialsFrom(String(body.name)),
      color: body.color ? String(body.color) : GRADIENTS[count % GRADIENTS.length],
      role: body.role ? String(body.role) : null,
      birthday: body.birthday ? String(body.birthday) : null,
    },
  })
  return Response.json(member, { status: 201 })
}

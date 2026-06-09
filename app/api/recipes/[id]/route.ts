import { prisma } from '@/lib/db'
import { serializeRecipe, tagsToString } from '@/lib/serialize'
import { requireHousehold, notFound } from '@/lib/guard'

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const hid = await requireHousehold()
  if (hid instanceof Response) return hid
  const id = Number(params.id)
  const body = await req.json()
  const data: Record<string, unknown> = {}
  for (const key of ['title', 'image', 'time', 'servings', 'description'] as const) {
    if (body[key] !== undefined) data[key] = String(body[key])
  }
  if (body.tags !== undefined) data.tags = tagsToString(body.tags)
  if (body.favorite !== undefined) data.favorite = Boolean(body.favorite)
  if (body.vote !== undefined) data.vote = Math.sign(Number(body.vote))
  const result = await prisma.recipe.updateMany({ where: { id, householdId: hid }, data })
  if (result.count === 0) return notFound()
  const recipe = await prisma.recipe.findUnique({ where: { id } })
  return Response.json(recipe ? serializeRecipe(recipe) : null)
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const hid = await requireHousehold()
  if (hid instanceof Response) return hid
  await prisma.recipe.deleteMany({ where: { id: Number(params.id), householdId: hid } })
  return new Response(null, { status: 204 })
}

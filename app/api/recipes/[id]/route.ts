import { prisma } from '@/lib/db'
import { serializeRecipe, tagsToString } from '@/lib/serialize'

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const id = Number(params.id)
  const body = await req.json()
  const data: Record<string, unknown> = {}
  for (const key of ['title', 'image', 'time', 'servings', 'description'] as const) {
    if (body[key] !== undefined) data[key] = String(body[key])
  }
  if (body.tags !== undefined) data.tags = tagsToString(body.tags)
  if (body.favorite !== undefined) data.favorite = Boolean(body.favorite)
  const recipe = await prisma.recipe.update({ where: { id }, data })
  return Response.json(serializeRecipe(recipe))
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  await prisma.recipe.delete({ where: { id: Number(params.id) } })
  return new Response(null, { status: 204 })
}

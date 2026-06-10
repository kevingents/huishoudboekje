import { prisma } from '@/lib/db'
import { serializeRecipe, tagsToString } from '@/lib/serialize'
import { requireHousehold } from '@/lib/guard'

export const dynamic = 'force-dynamic'

export async function GET() {
  const hid = await requireHousehold()
  if (hid instanceof Response) return hid
  const recipes = await prisma.recipe.findMany({ where: { householdId: hid }, orderBy: { id: 'asc' } })
  return Response.json(recipes.map(serializeRecipe))
}

export async function POST(req: Request) {
  const hid = await requireHousehold()
  if (hid instanceof Response) return hid
  const body = await req.json()
  if (!body?.title) {
    return Response.json({ error: 'title is verplicht' }, { status: 400 })
  }
  const ingredients = Array.isArray(body.ingredients)
    ? body.ingredients
        .map((i: { name?: unknown; amount?: unknown }) => ({
          name: String(i?.name ?? '').trim(),
          amount: String(i?.amount ?? '').trim(),
        }))
        .filter((i: { name: string }) => i.name)
    : []
  const steps = Array.isArray(body.steps)
    ? body.steps.map((s: unknown) => String(s).trim()).filter(Boolean)
    : []

  const recipe = await prisma.recipe.create({
    data: {
      householdId: hid,
      title: String(body.title),
      image: String(body.image ?? 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=900&q=80'),
      time: String(body.time ?? ''),
      servings: String(body.servings ?? ''),
      tags: tagsToString(body.tags),
      description: String(body.description ?? ''),
      ingredients,
      steps,
      favorite: Boolean(body.favorite ?? false),
    },
  })
  return Response.json(serializeRecipe(recipe), { status: 201 })
}

import type { Recipe as DbRecipe } from '@prisma/client'

/** Komma-gescheiden tags-string uit de DB → array voor de UI. */
export function tagsToArray(tags: string): string[] {
  return tags
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean)
}

/** Array (of string) uit de UI → genormaliseerde komma-string voor de DB. */
export function tagsToString(tags: unknown): string {
  if (Array.isArray(tags)) return tags.map((t) => String(t).trim()).filter(Boolean).join(',')
  if (typeof tags === 'string') return tagsToArray(tags).join(',')
  return ''
}

/** DB-recept → API-vorm met tags als array. */
export function serializeRecipe(recipe: DbRecipe) {
  return { ...recipe, tags: tagsToArray(recipe.tags) }
}

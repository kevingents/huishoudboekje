import type { Recipe } from './types'

/**
 * Rangschikt recepten zodat aanbevelingen beter worden naarmate je meer duimt.
 * Leert per tag een score (som van duimpjes van recepten met die tag) en
 * gebruikt die om nog niet-gestemde recepten te sorteren. Duim-omhoog bovenaan,
 * duim-omlaag onderaan.
 */
export function rankRecipes(recipes: Recipe[]): Recipe[] {
  // Tag-affiniteit op basis van eerdere stemmen.
  const tagScore = new Map<string, number>()
  for (const r of recipes) {
    if (!r.vote) continue
    for (const tag of r.tags) tagScore.set(tag, (tagScore.get(tag) ?? 0) + r.vote)
  }

  const affinity = (r: Recipe) => r.tags.reduce((sum, t) => sum + (tagScore.get(t) ?? 0), 0)

  return [...recipes].sort((a, b) => {
    // 1) eigen duim weegt het zwaarst
    if (a.vote !== b.vote) return b.vote - a.vote
    // 2) daarna favorieten
    if (a.favorite !== b.favorite) return Number(b.favorite) - Number(a.favorite)
    // 3) daarna tag-affiniteit (geleerde voorkeur)
    const fa = affinity(a)
    const fb = affinity(b)
    if (fa !== fb) return fb - fa
    return a.id - b.id
  })
}

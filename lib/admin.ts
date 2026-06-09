/* Platform-beheer (super-admin over álle huishoudens). Wie beheerder is, staat
   in de env-var ADMIN_EMAILS (komma-gescheiden e-mailadressen). Dit is
   platform-config en hoort daarom in de env, niet in de tool-config. */

import { getCurrentUser } from './auth'

export function adminEmails(): string[] {
  return (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
}

export function isAdminEmail(email: string | undefined | null): boolean {
  if (!email) return false
  return adminEmails().includes(email.toLowerCase())
}

/**
 * Geeft de ingelogde beheerder, of een 401/403-Response. Gebruik in routes:
 *   const admin = await requireAdmin()
 *   if (admin instanceof Response) return admin
 */
export async function requireAdmin() {
  const user = await getCurrentUser()
  if (!user) return Response.json({ error: 'Niet ingelogd' }, { status: 401 })
  if (!isAdminEmail(user.email)) {
    return Response.json({ error: 'Geen beheerrechten' }, { status: 403 })
  }
  return user
}

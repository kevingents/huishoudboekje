import { getHouseholdId } from './auth'

/**
 * Geeft het huishouden-id van de ingelogde gebruiker, of een 401-Response.
 * Gebruik in route-handlers:
 *   const hid = await requireHousehold()
 *   if (hid instanceof Response) return hid
 */
export async function requireHousehold(): Promise<number | Response> {
  const householdId = await getHouseholdId()
  if (!householdId) return Response.json({ error: 'Niet ingelogd' }, { status: 401 })
  return householdId
}

export const unauthorized = () => Response.json({ error: 'Niet ingelogd' }, { status: 401 })
export const notFound = () => Response.json({ error: 'Niet gevonden' }, { status: 404 })

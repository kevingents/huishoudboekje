import { getCurrentUser, getHouseholdId } from './auth'
import { prisma } from './db'
import { hasModule } from './modules'

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

/**
 * Vereist dat het huishouden de module in zijn pakket heeft. Geeft het
 * huishouden-id, of 402 (niet in pakket) / 401 (niet ingelogd).
 */
export async function requireModule(moduleKey: string): Promise<number | Response> {
  const user = await getCurrentUser()
  if (!user) return unauthorized()
  const household = await prisma.household.findUnique({
    where: { id: user.householdId },
    select: { tier: true },
  })
  if (!hasModule(household?.tier, moduleKey)) {
    return Response.json(
      { error: 'Deze module zit niet in jullie pakket.', module: moduleKey, upgrade: true },
      { status: 402 },
    )
  }
  return user.householdId
}

export const unauthorized = () => Response.json({ error: 'Niet ingelogd' }, { status: 401 })
export const notFound = () => Response.json({ error: 'Niet gevonden' }, { status: 404 })

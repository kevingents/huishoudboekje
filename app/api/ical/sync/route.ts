import { syncHouseholdIcal } from '@/lib/icalSync'
import { requireHousehold } from '@/lib/guard'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/** Haalt de ingestelde iCal-feeds van dit huishouden op en vervangt de gesyncte items. */
export async function POST() {
  const hid = await requireHousehold()
  if (hid instanceof Response) return hid
  const result = await syncHouseholdIcal(hid)
  return Response.json({ synced: result.synced, errors: result.errors })
}

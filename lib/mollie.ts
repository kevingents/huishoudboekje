import { createMollieClient, type MollieClient } from '@mollie/api-client'

/** Mollie-client of null wanneer er geen API-key is ingesteld. */
export function getMollie(): MollieClient | null {
  const apiKey = process.env.MOLLIE_API_KEY
  if (!apiKey) return null
  return createMollieClient({ apiKey })
}

/** Basis-URL voor redirect/webhook; valt terug op de request-origin. */
export function baseUrl(req: Request): string {
  return process.env.NEXT_PUBLIC_BASE_URL || new URL(req.url).origin
}

/** Mollie weigert niet-publieke webhook-URL's (localhost) bij het aanmaken. */
export function isPublic(url: string): boolean {
  return !/localhost|127\.0\.0\.1/.test(url)
}

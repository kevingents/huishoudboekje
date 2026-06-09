import crypto from 'crypto'

/**
 * Verifieert een Svix-webhook-handtekening (zoals Resend die gebruikt) zonder de
 * `svix`-library, met alleen Node-crypto. De handtekening wordt gezet over
 * `${id}.${timestamp}.${rawBody}` met de (base64) signing-secret achter `whsec_`.
 *
 * Belangrijk: geef de RUWE request-body mee (niet opnieuw geparset/gestringify'd),
 * anders klopt de handtekening niet.
 */
export function verifySvixSignature(opts: {
  secret: string // whsec_...
  id: string | null
  timestamp: string | null
  signature: string | null // "v1,<base64> v1,<base64>"
  body: string // ruwe body
  toleranceSec?: number
}): boolean {
  const { secret, id, timestamp, signature, body } = opts
  if (!secret || !id || !timestamp || !signature) return false

  // Replay-bescherming: timestamp binnen de tolerantie (standaard 5 min).
  const tolerance = opts.toleranceSec ?? 5 * 60
  const ts = Number(timestamp)
  if (!Number.isFinite(ts)) return false
  const now = Math.floor(Date.now() / 1000)
  if (Math.abs(now - ts) > tolerance) return false

  const secretBytes = Buffer.from(secret.replace(/^whsec_/, ''), 'base64')
  const signedContent = `${id}.${timestamp}.${body}`
  const expected = crypto.createHmac('sha256', secretBytes).update(signedContent).digest('base64')

  // De header bevat één of meer space-gescheiden "v1,<sig>"-paren.
  const passedSigs = signature.split(' ').map((part) => {
    const idx = part.indexOf(',')
    return idx === -1 ? part : part.slice(idx + 1)
  })

  return passedSigs.some((sig) => {
    try {
      const a = Buffer.from(sig)
      const b = Buffer.from(expected)
      return a.length === b.length && crypto.timingSafeEqual(a, b)
    } catch {
      return false
    }
  })
}

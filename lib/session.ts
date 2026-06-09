/* Edge-veilige sessie-token: een HMAC-ondertekende user-id.
   Gebruikt alleen Web Crypto + btoa, zodat het in de middleware (edge) én in
   Node-route-handlers werkt. Geen secrets in de cookie zelf. */

export const SESSION_COOKIE = 'hhb_session'

const secret = process.env.AUTH_SECRET || 'dev-insecure-secret-please-set-AUTH_SECRET'

async function hmacKey() {
  return crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
}

function base64url(buf: ArrayBuffer): string {
  let bin = ''
  for (const b of new Uint8Array(buf)) bin += String.fromCharCode(b)
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export async function signSession(userId: number | string): Promise<string> {
  const data = String(userId)
  const sig = await crypto.subtle.sign('HMAC', await hmacKey(), new TextEncoder().encode(data))
  return `${data}.${base64url(sig)}`
}

export async function verifySession(token?: string | null): Promise<number | null> {
  if (!token) return null
  const idx = token.lastIndexOf('.')
  if (idx <= 0) return null
  const data = token.slice(0, idx)
  const expected = await signSession(data)
  if (expected !== token) return null
  const id = Number(data)
  return Number.isInteger(id) ? id : null
}

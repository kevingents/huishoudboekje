/* Ondertekend wachtwoord-herstel-token (HMAC via Web Crypto, zoals de sessie
   en uitnodigingen). Stateless: het token bevat het user-id + e-mail + een
   korte vervaltijd. Geldig voor 1 uur. */

const secret = process.env.AUTH_SECRET || 'dev-insecure-secret-please-set-AUTH_SECRET'
const TTL_MS = 60 * 60 * 1000 // 1 uur geldig

export interface ResetPayload {
  userId: number
  email: string
  exp: number
}

async function hmacKey() {
  return crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
}

function b64url(bytes: Uint8Array): string {
  let bin = ''
  for (const b of bytes) bin += String.fromCharCode(b)
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function b64urlDecode(s: string): Uint8Array {
  const pad = s.length % 4 ? '='.repeat(4 - (s.length % 4)) : ''
  const bin = atob(s.replace(/-/g, '+').replace(/_/g, '/') + pad)
  return Uint8Array.from(bin, (c) => c.charCodeAt(0))
}

export async function signReset(data: Omit<ResetPayload, 'exp'>, now: number): Promise<string> {
  const payload: ResetPayload = { ...data, exp: now + TTL_MS }
  const body = b64url(new TextEncoder().encode(JSON.stringify(payload)))
  const sig = await crypto.subtle.sign('HMAC', await hmacKey(), new TextEncoder().encode(body))
  return `${body}.${b64url(new Uint8Array(sig))}`
}

export async function verifyReset(token: string, now: number): Promise<ResetPayload | null> {
  const idx = token.lastIndexOf('.')
  if (idx <= 0) return null
  const body = token.slice(0, idx)
  const sig = await crypto.subtle.sign('HMAC', await hmacKey(), new TextEncoder().encode(body))
  if (b64url(new Uint8Array(sig)) !== token.slice(idx + 1)) return null
  try {
    const payload = JSON.parse(new TextDecoder().decode(b64urlDecode(body))) as ResetPayload
    if (!payload?.exp || payload.exp < now) return null
    return payload
  } catch {
    return null
  }
}

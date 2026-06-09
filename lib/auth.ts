import bcrypt from 'bcryptjs'
import { cookies } from 'next/headers'
import { prisma } from './db'
import { SESSION_COOKIE, verifySession } from './session'

export const sessionCookieOptions = {
  httpOnly: true,
  sameSite: 'lax' as const,
  path: '/',
  maxAge: 60 * 60 * 24 * 30, // 30 dagen
  secure: process.env.NODE_ENV === 'production',
}

export function hashPassword(password: string) {
  return bcrypt.hash(password, 10)
}

export function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash)
}

/** De ingelogde gebruiker, of null. Voor server-componenten en route-handlers. */
export async function getCurrentUser() {
  const token = cookies().get(SESSION_COOKIE)?.value
  const id = await verifySession(token)
  if (!id) return null
  return prisma.user.findUnique({
    where: { id },
    select: { id: true, name: true, email: true, householdId: true, role: true, memberId: true },
  })
}

/** Het huishouden (tenant) van de ingelogde gebruiker, of null. */
export async function getHouseholdId(): Promise<number | null> {
  const user = await getCurrentUser()
  return user?.householdId ?? null
}

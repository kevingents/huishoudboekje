import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { isAdminEmail } from '@/lib/admin'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ user: null })
  return NextResponse.json({
    user: { ...user, isAdmin: isAdminEmail(user.email), isChild: user.role === 'child' },
  })
}

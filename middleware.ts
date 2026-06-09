import { NextResponse, type NextRequest } from 'next/server'
import { verifySession, SESSION_COOKIE } from '@/lib/session'

const PUBLIC_PAGES = ['/inloggen', '/registreren']

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Auth-API's zijn altijd publiek (registreren/inloggen/uitloggen/me).
  if (pathname.startsWith('/api/auth')) return NextResponse.next()

  const userId = await verifySession(req.cookies.get(SESSION_COOKIE)?.value)
  const isApi = pathname.startsWith('/api')
  const isPublicPage = PUBLIC_PAGES.includes(pathname)

  if (userId) {
    // Ingelogd: houd weg van inlog-/registratiepagina's.
    if (isPublicPage) return NextResponse.redirect(new URL('/', req.url))
    return NextResponse.next()
  }

  // Niet ingelogd:
  if (isApi) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })
  if (isPublicPage) return NextResponse.next()

  const url = new URL('/inloggen', req.url)
  return NextResponse.redirect(url)
}

export const config = {
  // Sla Next-internals en statische bestanden over.
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|ics)).*)'],
}

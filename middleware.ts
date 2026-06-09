import { NextResponse, type NextRequest } from 'next/server'
import { verifySession, SESSION_COOKIE } from '@/lib/session'

const PUBLIC_PAGES = [
  '/', // publieke marketing-landing
  '/inloggen',
  '/registreren',
  '/uitnodiging',
  '/wachtwoord-vergeten',
  '/wachtwoord-herstellen',
]

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Publieke API's: auth (registreren/inloggen/uitloggen/me) en de Mollie-webhook
  // (die komt van Mollie zonder sessie-cookie).
  if (
    pathname.startsWith('/api/auth') ||
    pathname === '/api/webhooks/mollie' ||
    pathname.startsWith('/api/cron')
  ) {
    return NextResponse.next()
  }

  const userId = await verifySession(req.cookies.get(SESSION_COOKIE)?.value)
  const isApi = pathname.startsWith('/api')
  const isPublicPage = PUBLIC_PAGES.includes(pathname)

  if (userId) {
    // Ingelogd: stuur weg van de landing/auth-pagina's naar de app.
    if (isPublicPage) return NextResponse.redirect(new URL('/vandaag', req.url))
    return NextResponse.next()
  }

  // Niet ingelogd:
  if (isApi) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })
  if (isPublicPage) return NextResponse.next()

  const url = new URL('/inloggen', req.url)
  return NextResponse.redirect(url)
}

export const config = {
  // Sla Next-internals, statische bestanden en PWA-bestanden (sw.js, manifest) over.
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|sw.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|ics|js|webmanifest)).*)',
  ],
}

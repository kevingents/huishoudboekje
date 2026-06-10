import type { Metadata, Viewport } from 'next'
import './globals.css'
import AppFrame from '@/components/AppFrame'
import PWARegister from '@/components/PWARegister'
import InstallPrompt from '@/components/InstallPrompt'
import { A11yProvider } from '@/components/A11yProvider'

// Past de opgeslagen toegankelijkheidsvoorkeuren toe vóór de eerste paint (geen flikker).
const A11Y_BOOT = `(function(){try{var s=JSON.parse(localStorage.getItem('fam-a11y')||'{}');var m={normaal:1,groot:1.125,extra:1.25};var e=document.documentElement;e.style.setProperty('--font-scale',String(m[s.fontScale]||1));if(s.highContrast)e.classList.add('hc');if(s.reduceMotion)e.classList.add('reduce-motion');var t=s.theme||'systeem';var dark=t==='donker'||(t!=='licht'&&window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches);if(dark)e.classList.add('dark');}catch(e){}})();`

export const metadata: Metadata = {
  title: 'Fam — Gezinsapp',
  description:
    'Fam: het centrale dashboard voor jouw gezin — agenda, boodschappen, voorraad, budget, weer, recepten en AI-suggesties op één plek.',
  manifest: '/manifest.webmanifest',
  appleWebApp: { capable: true, title: 'Fam', statusBarStyle: 'default' },
  icons: { icon: '/icon-192.png', apple: '/icon-192.png' },
}

export const viewport: Viewport = {
  themeColor: '#35B558',
  width: 'device-width',
  initialScale: 1,
  // Geen maximumScale: gebruikers moeten kunnen in-/uitzoomen (WCAG 1.4.4).
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="nl">
      <head>
        {/* Inter via the Google Fonts CDN with a robust system fallback, so the
            app keeps working even without a build-time font download. */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
        <script dangerouslySetInnerHTML={{ __html: A11Y_BOOT }} />
      </head>
      <body className="font-sans">
        <A11yProvider>
          <PWARegister />
          <AppFrame>{children}</AppFrame>
          <InstallPrompt />
        </A11yProvider>
      </body>
    </html>
  )
}

import type { Metadata, Viewport } from 'next'
import './globals.css'
import AppFrame from '@/components/AppFrame'
import PWARegister from '@/components/PWARegister'
import InstallPrompt from '@/components/InstallPrompt'

export const metadata: Metadata = {
  title: 'Huishoudboekje — Gezinsdashboard',
  description:
    'Het centrale dashboard voor jouw gezin: agenda, boodschappen, voorraad, budget, weer, recepten en AI-suggesties op één plek.',
  manifest: '/manifest.webmanifest',
  appleWebApp: { capable: true, title: 'Huishoudboekje', statusBarStyle: 'default' },
  icons: { icon: '/icon-192.png', apple: '/icon-192.png' },
}

export const viewport: Viewport = {
  themeColor: '#35B558',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
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
      </head>
      <body className="font-sans">
        <PWARegister />
        <AppFrame>{children}</AppFrame>
        <InstallPrompt />
      </body>
    </html>
  )
}

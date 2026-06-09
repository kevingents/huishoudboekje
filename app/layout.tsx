import type { Metadata, Viewport } from 'next'
import './globals.css'
import Sidebar from '@/components/Sidebar'
import MobileNav from '@/components/MobileNav'

export const metadata: Metadata = {
  title: 'Huishoudboekje — Gezinsdashboard',
  description:
    'Het centrale dashboard voor jouw gezin: agenda, boodschappen, voorraad, budget, weer, recepten en AI-suggesties op één plek.',
}

export const viewport: Viewport = {
  themeColor: '#F6F8FA',
  width: 'device-width',
  initialScale: 1,
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
        <div className="h-[100dvh] bg-canvas lg:p-6">
          {/* Large rounded white app frame, shared across every route */}
          <div className="mx-auto flex h-full max-w-[1440px] overflow-hidden bg-white shadow-card lg:rounded-[28px]">
            <Sidebar />

            {/* Scrollable content area */}
            <main className="scrollbar-thin flex-1 overflow-y-auto px-4 pb-28 pt-6 sm:px-6 lg:px-8 lg:pb-8">
              <div className="mx-auto max-w-6xl">{children}</div>
            </main>
          </div>

          <MobileNav />
        </div>
      </body>
    </html>
  )
}

import { Toaster } from 'sonner'
import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { NextIntlClientProvider } from 'next-intl'
import { getLocale, getMessages } from 'next-intl/server'

import Navbar from '@/components/layout/Navbar'
import BottomNav from '@/components/layout/BottomNav'
import NotificationProvider from '@/components/providers/NotificationProvider'
import NoDataBanner from '@/components/ui/NoDataBanner'
import SavedRoomsProvider from '@/features/rooms/components/SavedRoomsProvider'
import { BRAND, getSiteUrl } from '@/config/brand'

import './globals.css'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  applicationName: BRAND.name,
  title: {
    default: BRAND.name,
    template: `%s | ${BRAND.name}`,
  },
  description: BRAND.description,
  manifest: '/manifest.json',
  icons: {
    icon: '/icon.svg',
  },
  // iOS reads these metadata fields in addition to manifest.json.
  appleWebApp: {
    capable: true,
    title: BRAND.shortName,
    statusBarStyle: 'default',
  },
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  // Reading the locale here (via the NEXT_LOCALE cookie, see
  // src/i18n/request.ts) makes every route sharing this layout dynamic —
  // an accepted trade-off, see src/app/page.tsx's dropped `revalidate`.
  const locale = await getLocale()
  const messages = await getMessages()
  const noDataMode = process.env.NEXT_PUBLIC_APP_MODE === 'no-data'

  return (
    <html
      lang={locale}
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body
        suppressHydrationWarning
        className="min-h-full flex flex-col bg-white text-gray-900 transition-colors dark:bg-gray-950 dark:text-gray-100"
      >
        <NextIntlClientProvider locale={locale} messages={messages}>
          <NoDataBanner />
          <Navbar />

          <main className="flex-1 pb-16 md:pb-0">
            <SavedRoomsProvider>
              {children}
            </SavedRoomsProvider>
          </main>

          <BottomNav />
          {!noDataMode && <NotificationProvider />}

          <Toaster
            position="top-right"
            richColors
          />
          <Analytics />
        </NextIntlClientProvider>
      </body>
    </html>
  )
}

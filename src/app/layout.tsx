import { Toaster } from 'sonner'
import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { NextIntlClientProvider } from 'next-intl'
import { getLocale, getMessages } from 'next-intl/server'

import Navbar from '@/components/layout/Navbar'
import BottomNav from '@/components/layout/BottomNav'
import NotificationProvider from '@/components/providers/NotificationProvider'
import SavedRoomsProvider from '@/features/rooms/components/SavedRoomsProvider'

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
  title: 'Student Hostel',
  description: 'Find hostel, mess and bachelor rooms easily',
  manifest: '/manifest.json',
  icons: {
    icon: '/icon-192.png',
    apple: '/icon-192.png',
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

  return (
    <html
      lang={locale}
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        {/* Inline theme script — runs before paint to avoid flash */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('theme');if(t==='dark'||(!t&&window.matchMedia('(prefers-color-scheme: dark)').matches)){document.documentElement.classList.add('dark')}}catch(e){}})()`,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col bg-white text-gray-900 transition-colors dark:bg-gray-950 dark:text-gray-100">
        <NextIntlClientProvider locale={locale} messages={messages}>
          <Navbar />

          <main className="flex-1 pb-16 md:pb-0">
            <SavedRoomsProvider>
              {children}
            </SavedRoomsProvider>
          </main>

          <BottomNav />
          <NotificationProvider />

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

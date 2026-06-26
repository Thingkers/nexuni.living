import { Toaster } from 'sonner'
import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'

import Navbar from '@/components/layout/Navbar'
import BottomNav from '@/components/layout/BottomNav'
import NotificationProvider from '@/components/providers/NotificationProvider'

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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <link rel="stylesheet" href="https://cdn-uicons.flaticon.com/2.6.0/uicons-regular-rounded/css/uicons-regular-rounded.css" />
        <link rel="stylesheet" href="https://cdn-uicons.flaticon.com/2.6.0/uicons-regular-straight/css/uicons-regular-straight.css" />
        {/* Inline theme script — runs before paint to avoid flash */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('theme');if(t==='dark'||(!t&&window.matchMedia('(prefers-color-scheme: dark)').matches)){document.documentElement.classList.add('dark')}}catch(e){}})()`,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col bg-white text-gray-900 transition-colors dark:bg-gray-950 dark:text-gray-100">
        <Navbar />

        <main className="flex-1 pb-16 md:pb-0">
          {children}
        </main>

        <BottomNav />
        <NotificationProvider />

        <Toaster
          position="top-right"
          richColors
        />
      </body>
    </html>
  )
}

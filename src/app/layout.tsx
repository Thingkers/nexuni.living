import { Toaster } from 'sonner'
import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'

import Navbar from '@/components/layout/Navbar'
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
  description: 'Find hostel, mess & sublet easily',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-gray-50">
        <Navbar />

        <main className="flex-1">
          {children}
        </main>

        <NotificationProvider />

        <Toaster
          position="top-right"
          richColors
        />
      </body>
    </html>
  )
}
'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { BookOpen, MapPin } from 'lucide-react'

import { supabase } from '@/lib/supabase'
import type { BookListing } from '@/features/books/types'

const CONDITION_LABELS: Record<string, string> = { new: 'New', good: 'Good', fair: 'Fair' }

export default function BookDetailClient({ book }: { book: BookListing }) {
  const [viewerId, setViewerId] = useState<string | null>(null)
  const details = book.listing_book_details

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setViewerId(data.user?.id ?? null))
  }, [])

  const isOwner = viewerId === book.owner_id

  return (
    <main className="page-shell py-8">
      <div className="grid gap-8 lg:grid-cols-2">
        <div className="relative h-80 overflow-hidden rounded-2xl bg-gray-100 dark:bg-gray-700">
          {book.images.length > 0 ? (
            <Image src={book.images[0]} alt={book.title} fill className="object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center">
              <BookOpen className="h-20 w-20 text-gray-300 dark:text-gray-600" aria-hidden />
            </div>
          )}
        </div>

        <div>
          {details?.course_code && (
            <p className="mb-1 text-xs font-bold uppercase tracking-wider text-teal-700 dark:text-teal-400">{details.course_code}</p>
          )}
          <h1 className="mb-2 text-2xl font-semibold text-gray-900 dark:text-white">{book.title}</h1>

          {book.universities?.name && (
            <div className="mb-3 flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400">
              <MapPin className="h-4 w-4 shrink-0" aria-hidden />
              {book.universities.name}
            </div>
          )}

          <p className="mb-4 text-2xl font-bold text-teal-600 dark:text-teal-400">
            ৳{book.price?.toLocaleString('en-US') ?? '—'}
            {details?.negotiable && <span className="ml-2 text-sm font-normal text-gray-400">negotiable</span>}
          </p>

          <div className="mb-4 flex flex-wrap gap-2 text-sm">
            {details?.condition && (
              <span className="rounded-full bg-teal-50 px-3 py-1 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400">
                {CONDITION_LABELS[details.condition]}
              </span>
            )}
            {details?.author && (
              <span className="rounded-full bg-gray-100 px-3 py-1 text-gray-600 dark:bg-gray-700 dark:text-gray-300">By {details.author}</span>
            )}
            {details?.department && (
              <span className="rounded-full bg-gray-100 px-3 py-1 text-gray-600 dark:bg-gray-700 dark:text-gray-300">{details.department}</span>
            )}
            {details?.semester && (
              <span className="rounded-full bg-gray-100 px-3 py-1 text-gray-600 dark:bg-gray-700 dark:text-gray-300">{details.semester}</span>
            )}
          </div>

          {book.description && (
            <p className="mb-6 whitespace-pre-wrap text-sm leading-relaxed text-gray-600 dark:text-gray-400">{book.description}</p>
          )}

          <div className="rounded-2xl border border-gray-100 p-4 dark:border-gray-700">
            <p className="mb-1 text-xs text-gray-400">Seller</p>
            <p className="mb-3 text-sm font-medium text-gray-900 dark:text-white">{book.profiles?.full_name || 'Student'}</p>
            {!isOwner && (
              <Link
                href={`/inbox/${book.owner_id}`}
                className="block w-full rounded-xl bg-teal-600 py-2.5 text-center text-sm font-medium text-white hover:bg-teal-700"
              >
                Message Seller
              </Link>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}

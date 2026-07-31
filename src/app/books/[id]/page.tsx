import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { createAnonServerClient } from '@/lib/supabase/server'
import type { BookListing } from '@/features/books/types'
import BookDetailClient from './BookDetailClient'

async function getBook(id: string): Promise<BookListing | null> {
  const supabase = createAnonServerClient()
  if (!supabase) return null

  const { data } = await supabase
    .from('listings')
    // profiles(full_name) only -- anon lacks SELECT on profiles.email (see
    // information_schema.column_privileges: authenticated has it, anon
    // doesn't), and this page must render for logged-out visitors too.
    .select('id, title, description, price, status, images, owner_id, university_id, created_at, listing_book_details(author, course_code, department, semester, condition, negotiable), universities(name), profiles(full_name)')
    .eq('id', id)
    .eq('listing_type', 'book')
    .maybeSingle()

  return (data ?? null) as unknown as BookListing | null
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params
  const book = await getBook(id)
  return {
    title: book?.title ?? 'Book listing',
    robots: { index: false, follow: false },
  }
}

export default async function BookDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const book = await getBook(id)
  if (!book) notFound()

  return <BookDetailClient book={book} />
}

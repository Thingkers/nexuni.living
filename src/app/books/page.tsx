import type { Metadata } from 'next'

import { createAnonServerClient } from '@/lib/supabase/server'
import BooksBrowser from '@/features/books/components/BooksBrowser'
import type { BookListing } from '@/features/books/types'

export const metadata: Metadata = {
  title: 'Used Books Marketplace',
  robots: { index: false, follow: false },
}

export default async function BooksPage() {
  const supabase = createAnonServerClient()
  if (!supabase) return <BooksBrowser listings={[]} />

  const { data } = await supabase
    .from('listings')
    .select('id, title, description, price, status, images, owner_id, university_id, created_at, listing_book_details(author, course_code, department, semester, condition, negotiable), universities(name)')
    .eq('listing_type', 'book')
    .eq('status', 'active')
    .order('created_at', { ascending: false })

  return <BooksBrowser listings={(data ?? []) as unknown as BookListing[]} />
}

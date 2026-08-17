export type BookCondition = 'new' | 'good' | 'fair'

export type BookListingDetails = {
  author: string | null
  course_code: string | null
  department: string | null
  semester: string | null
  condition: BookCondition | null
  negotiable: boolean
}

export type BookListing = {
  id: string
  title: string
  description: string | null
  price: number | null
  status: 'active' | 'archived'
  images: string[]
  owner_id: string
  university_id: string | null
  created_at: string
  listing_book_details: BookListingDetails | null
  universities: { name: string } | null
  // full_name only: `email` was selected but never rendered, and embedding a
  // column `authenticated` cannot read fails the entire PostgREST request —
  // see src/lib/adminContacts.ts.
  profiles?: { full_name: string | null } | null
}

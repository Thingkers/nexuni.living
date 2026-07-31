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
  profiles?: { full_name: string | null; email: string | null } | null
}

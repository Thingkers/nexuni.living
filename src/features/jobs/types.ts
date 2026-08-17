export type JobType = 'part_time' | 'internship'
export type ApplyMethod = 'link' | 'phone' | 'chat'

export type JobListingDetails = {
  employer: string
  job_type: JobType | null
  salary_min: number | null
  salary_max: number | null
  apply_method: ApplyMethod | null
  apply_value: string | null
}

export type JobListing = {
  id: string
  title: string
  description: string | null
  price: number | null
  status: 'active' | 'archived' | 'pending'
  images: string[]
  owner_id: string
  university_id: string | null
  created_at: string
  listing_job_details: JobListingDetails | null
  universities: { name: string } | null
  // full_name only: `email` was selected but never rendered, and embedding a
  // column `authenticated` cannot read fails the entire PostgREST request —
  // see src/lib/adminContacts.ts.
  profiles?: { full_name: string | null } | null
}

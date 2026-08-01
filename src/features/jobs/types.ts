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
  profiles?: { full_name: string | null; email: string | null } | null
}

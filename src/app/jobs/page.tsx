import type { Metadata } from 'next'

import { createAnonServerClient } from '@/lib/supabase/server'
import JobsBrowser from '@/features/jobs/components/JobsBrowser'
import type { JobListing } from '@/features/jobs/types'

export const metadata: Metadata = {
  title: 'Student Jobs and Internships',
  robots: { index: false, follow: false },
}

export default async function JobsPage() {
  const supabase = createAnonServerClient()
  if (!supabase) return <JobsBrowser listings={[]} />

  const { data } = await supabase
    .from('listings')
    .select('id, title, description, price, status, images, owner_id, university_id, created_at, listing_job_details(employer, job_type, salary_min, salary_max, apply_method, apply_value), universities(name)')
    .eq('listing_type', 'job')
    .eq('status', 'active')
    .order('created_at', { ascending: false })

  return <JobsBrowser listings={(data ?? []) as unknown as JobListing[]} />
}

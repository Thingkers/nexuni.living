import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { createAnonServerClient } from '@/lib/supabase/server'
import type { JobListing } from '@/features/jobs/types'
import JobDetailClient from './JobDetailClient'

async function getJob(id: string): Promise<JobListing | null> {
  const supabase = createAnonServerClient()
  if (!supabase) return null

  const { data } = await supabase
    .from('listings')
    // profiles(full_name) only -- anon lacks SELECT on profiles.email, see
    // docs/module-verticals-roadmap.md Sprint 4's note.
    .select('id, title, description, price, status, images, owner_id, university_id, created_at, listing_job_details(employer, job_type, salary_min, salary_max, apply_method, apply_value), universities(name), profiles(full_name)')
    .eq('id', id)
    .eq('listing_type', 'job')
    .eq('status', 'active')
    .maybeSingle()

  return (data ?? null) as unknown as JobListing | null
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params
  const job = await getJob(id)
  return {
    title: job?.title ?? 'Job listing',
    robots: { index: false, follow: false },
  }
}

export default async function JobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const job = await getJob(id)
  if (!job) notFound()

  return <JobDetailClient job={job} />
}

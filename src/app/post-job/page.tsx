'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

import { supabase } from '@/lib/supabase'
import { uploadContentImages } from '@/lib/uploadContentImages'
import JobForm, { type JobFormValues } from '@/features/jobs/components/JobForm'

export default function PostJobPage() {
  const router = useRouter()
  const [userId, setUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    async function checkUser() {
      const { data: authData } = await supabase.auth.getUser()
      if (!authData.user) { router.push('/auth/login'); return }

      const { data: profile } = await supabase
        .from('profiles')
        .select('verification_status')
        .eq('id', authData.user.id)
        .single()

      if (profile?.verification_status !== 'approved') {
        toast.error('Only verified students can post a job')
        router.push('/jobs')
        return
      }

      setUserId(authData.user.id)
    }
    checkUser()
  }, [router])

  async function handleSubmit(values: JobFormValues, images: File[]) {
    if (!userId) return
    if (!values.title.trim() || !values.employer.trim()) {
      toast.error('Title and employer are required')
      return
    }

    setLoading(true)

    const { data: listing, error } = await supabase
      .from('listings')
      .insert({
        listing_type: 'job',
        owner_id: userId,
        title: values.title,
        description: values.description || null,
        status: 'pending',
        university_id: values.university_id,
        images: [],
      })
      .select()
      .single()

    if (error || !listing) {
      setLoading(false)
      toast.error(error?.message || 'Failed to post job')
      return
    }

    const { error: detailsError } = await supabase
      .from('listing_job_details')
      .insert({
        listing_id: listing.id,
        employer: values.employer,
        job_type: values.job_type,
        salary_min: values.salary_min ? Number(values.salary_min) : null,
        salary_max: values.salary_max ? Number(values.salary_max) : null,
        apply_method: values.apply_method,
        apply_value: values.apply_value || null,
      })

    if (detailsError) {
      setLoading(false)
      toast.error(detailsError.message)
      return
    }

    try {
      if (images.length > 0) {
        const urls = await uploadContentImages('jobs', listing.id, images)
        await supabase.from('listings').update({ images: urls }).eq('id', listing.id)
      }
      toast.success('Job submitted for review')
      router.push('/jobs')
    } catch (err) {
      setLoading(false)
      const message = err instanceof Error ? err.message : 'Image upload failed'
      toast.error(message)
    }
  }

  return (
    <main className="mx-auto max-w-lg px-4 py-8">
      <h1 className="mb-1 text-2xl font-semibold text-gray-900 dark:text-white">Post a Job</h1>
      <p className="mb-6 text-sm text-gray-400">Reviewed by the Jobs team before it goes live.</p>
      <JobForm onSubmit={handleSubmit} submitLabel="Submit for Review" loading={loading} />
    </main>
  )
}

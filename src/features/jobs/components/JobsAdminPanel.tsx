'use client'

import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Archive, CheckCircle2, Pencil, Trash2, XCircle } from 'lucide-react'

import { supabase } from '@/lib/supabase'
import { uploadContentImages } from '@/lib/uploadContentImages'
import JobForm, { type JobFormValues } from '@/features/jobs/components/JobForm'
import type { JobListing } from '@/features/jobs/types'

const STATUS_STYLES: Record<JobListing['status'], string> = {
  active: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  archived: 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400',
}
const STATUS_LABELS: Record<JobListing['status'], string> = { active: 'Active', pending: 'Pending', archived: 'Archived' }

export default function JobsAdminPanel() {
  const [listings, setListings] = useState<JobListing[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [savingId, setSavingId] = useState<string | null>(null)

  async function fetchJobs(): Promise<JobListing[]> {
    const { data } = await supabase
      .from('listings')
      .select('id, title, description, price, status, images, owner_id, university_id, created_at, listing_job_details(employer, job_type, salary_min, salary_max, apply_method, apply_value), universities(name), profiles(full_name, email)')
      .eq('listing_type', 'job')
      .order('created_at', { ascending: false })

    return (data ?? []) as unknown as JobListing[]
  }

  useEffect(() => {
    let active = true

    async function init() {
      const jobs = await fetchJobs()
      if (!active) return
      setListings(jobs)
      setLoading(false)
    }

    init()
    return () => { active = false }
  }, [])

  async function refresh() {
    setListings(await fetchJobs())
  }

  const pending = useMemo(() => listings.filter((l) => l.status === 'pending'), [listings])
  const rest = useMemo(() => listings.filter((l) => l.status !== 'pending'), [listings])

  async function setStatus(listing: JobListing, status: JobListing['status']) {
    const { error } = await supabase.from('listings').update({ status }).eq('id', listing.id)
    if (error) { toast.error(error.message); return }
    await refresh()
  }

  async function remove(listing: JobListing) {
    const confirmed = window.confirm(`Permanently delete "${listing.title}"? This cannot be undone.`)
    if (!confirmed) return

    const { error } = await supabase.from('listings').delete().eq('id', listing.id)
    if (error) { toast.error(error.message); return }
    toast.success('Job deleted')
    await refresh()
  }

  async function saveEdit(listing: JobListing, values: JobFormValues, newImages: File[]) {
    setSavingId(listing.id)

    const { error: listingError } = await supabase
      .from('listings')
      .update({
        title: values.title,
        description: values.description || null,
        university_id: values.university_id,
      })
      .eq('id', listing.id)

    const { error: detailsError } = await supabase
      .from('listing_job_details')
      .update({
        employer: values.employer,
        job_type: values.job_type,
        salary_min: values.salary_min ? Number(values.salary_min) : null,
        salary_max: values.salary_max ? Number(values.salary_max) : null,
        apply_method: values.apply_method,
        apply_value: values.apply_value || null,
      })
      .eq('listing_id', listing.id)

    if (listingError || detailsError) {
      setSavingId(null)
      toast.error(listingError?.message || detailsError?.message || 'Update failed')
      return
    }

    try {
      if (newImages.length > 0) {
        const urls = await uploadContentImages('jobs', listing.id, newImages)
        await supabase.from('listings').update({ images: urls }).eq('id', listing.id)
      }
      toast.success('Job updated')
      setEditingId(null)
      await refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Image upload failed')
    } finally {
      setSavingId(null)
    }
  }

  function renderRow(listing: JobListing) {
    return (
      <div key={listing.id} className="rounded-2xl border border-gray-100 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-medium text-gray-900 dark:text-white">{listing.title}</p>
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[listing.status]}`}>
                {STATUS_LABELS[listing.status]}
              </span>
            </div>
            <p className="mt-0.5 text-xs text-gray-400">
              {listing.profiles?.full_name || 'Unknown poster'} · {listing.listing_job_details?.employer ?? '—'}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setEditingId(editingId === listing.id ? null : listing.id)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-700"
            >
              <Pencil className="h-3.5 w-3.5" aria-hidden /> {editingId === listing.id ? 'Close' : 'Edit'}
            </button>

            {listing.status === 'pending' ? (
              <>
                <button
                  onClick={() => setStatus(listing, 'active')}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-green-200 px-3 py-1.5 text-xs text-green-600 hover:bg-green-50 dark:border-green-800 dark:hover:bg-green-900/20"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" aria-hidden /> Approve
                </button>
                <button
                  onClick={() => setStatus(listing, 'archived')}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-900/20"
                >
                  <XCircle className="h-3.5 w-3.5" aria-hidden /> Reject
                </button>
              </>
            ) : (
              <button
                onClick={() => setStatus(listing, listing.status === 'active' ? 'archived' : 'active')}
                className="inline-flex items-center gap-1.5 rounded-xl border border-teal-200 px-3 py-1.5 text-xs text-teal-600 hover:bg-teal-50 dark:border-teal-800 dark:hover:bg-teal-900/20"
              >
                {listing.status === 'active'
                  ? <><Archive className="h-3.5 w-3.5" aria-hidden /> Archive</>
                  : <><CheckCircle2 className="h-3.5 w-3.5" aria-hidden /> Activate</>}
              </button>
            )}

            <button
              onClick={() => remove(listing)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-red-600 px-3 py-1.5 text-xs text-white hover:bg-red-700"
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden /> Delete
            </button>
          </div>
        </div>

        {editingId === listing.id && (
          <div className="mt-4 border-t border-gray-100 pt-4 dark:border-gray-700">
            <JobForm
              initial={{
                title: listing.title,
                description: listing.description ?? '',
                employer: listing.listing_job_details?.employer ?? '',
                job_type: listing.listing_job_details?.job_type ?? 'part_time',
                salary_min: listing.listing_job_details?.salary_min != null ? String(listing.listing_job_details.salary_min) : '',
                salary_max: listing.listing_job_details?.salary_max != null ? String(listing.listing_job_details.salary_max) : '',
                apply_method: listing.listing_job_details?.apply_method ?? 'link',
                apply_value: listing.listing_job_details?.apply_value ?? '',
                university_id: listing.university_id,
                university: listing.universities?.name ?? '',
              }}
              existingImages={listing.images}
              onSubmit={(values, newImages) => saveEdit(listing, values, newImages)}
              submitLabel="Save Changes"
              loading={savingId === listing.id}
            />
          </div>
        )}
      </div>
    )
  }

  if (loading) {
    return <p className="text-sm text-gray-400">Loading jobs...</p>
  }

  return (
    <div className="flex flex-col gap-6">
      {pending.length > 0 && (
        <div className="flex flex-col gap-3">
          <p className="text-sm font-medium text-amber-600 dark:text-amber-400">
            {pending.length} pending review
          </p>
          {pending.map(renderRow)}
        </div>
      )}

      <div className="flex flex-col gap-3">
        <p className="text-sm text-gray-400">{listings.length} job{listings.length === 1 ? '' : 's'} total</p>
        {rest.map(renderRow)}
      </div>
    </div>
  )
}

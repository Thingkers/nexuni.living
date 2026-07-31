'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { Camera } from 'lucide-react'

import { compressImage } from '@/lib/compressImage'
import { UniversityCombobox } from '@/features/universities/components/UniversityCombobox'
import type { ApplyMethod, JobType } from '@/features/jobs/types'

export type JobFormValues = {
  title: string
  employer: string
  job_type: JobType
  salary_min: string
  salary_max: string
  apply_method: ApplyMethod
  apply_value: string
  description: string
  university_id: string | null
  university: string
}

export const EMPTY_JOB_FORM: JobFormValues = {
  title: '',
  employer: '',
  job_type: 'part_time',
  salary_min: '',
  salary_max: '',
  apply_method: 'link',
  apply_value: '',
  description: '',
  university_id: null,
  university: '',
}

const inputCls =
  'w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none transition-colors focus:border-teal-500 bg-white dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100'

// Shared between /post-job (create) and the Jobs module admin edit panel —
// same field set either way, only the submit behavior differs.
export default function JobForm({
  initial,
  existingImages = [],
  onSubmit,
  submitLabel,
  loading,
}: {
  initial?: Partial<JobFormValues>
  existingImages?: string[]
  onSubmit: (values: JobFormValues, newImages: File[]) => void
  submitLabel: string
  loading: boolean
}) {
  const [form, setForm] = useState<JobFormValues>({ ...EMPTY_JOB_FORM, ...initial })
  const [images, setImages] = useState<File[]>([])
  const [previews, setPreviews] = useState<string[]>([])

  useEffect(() => {
    return () => previews.forEach((url) => URL.revokeObjectURL(url))
  }, [previews])

  function updateField<K extends keyof JobFormValues>(key: K, value: JobFormValues[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []).slice(0, 4)
    previews.forEach((url) => URL.revokeObjectURL(url))
    const compressed = await Promise.all(files.map((f) => compressImage(f)))
    setImages(compressed)
    setPreviews(compressed.map((f) => URL.createObjectURL(f)))
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <label className="mb-1 block text-xs text-gray-500 dark:text-gray-400">Job Title *</label>
        <input
          placeholder="e.g. Campus Ambassador"
          className={inputCls}
          value={form.title}
          maxLength={100}
          onChange={(e) => updateField('title', e.target.value)}
        />
      </div>

      <div>
        <label className="mb-1 block text-xs text-gray-500 dark:text-gray-400">Employer *</label>
        <input
          placeholder="e.g. NexUni Living"
          className={inputCls}
          value={form.employer}
          onChange={(e) => updateField('employer', e.target.value)}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-xs text-gray-500 dark:text-gray-400">Type</label>
          <select className={inputCls} value={form.job_type} onChange={(e) => updateField('job_type', e.target.value as JobType)}>
            <option value="part_time">Part-time</option>
            <option value="internship">Internship</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs text-gray-500 dark:text-gray-400">University</label>
          <UniversityCombobox
            value={form.university_id}
            initialText={form.university}
            className={inputCls}
            onChange={({ id, name, rawText }) => setForm((prev) => ({ ...prev, university_id: id, university: name ?? rawText }))}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-xs text-gray-500 dark:text-gray-400">Salary Min (৳)</label>
          <input type="number" className={inputCls} value={form.salary_min} onChange={(e) => updateField('salary_min', e.target.value)} />
        </div>
        <div>
          <label className="mb-1 block text-xs text-gray-500 dark:text-gray-400">Salary Max (৳)</label>
          <input type="number" className={inputCls} value={form.salary_max} onChange={(e) => updateField('salary_max', e.target.value)} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-xs text-gray-500 dark:text-gray-400">Apply Method</label>
          <select className={inputCls} value={form.apply_method} onChange={(e) => updateField('apply_method', e.target.value as ApplyMethod)}>
            <option value="link">Link</option>
            <option value="phone">Phone</option>
            <option value="chat">Chat</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs text-gray-500 dark:text-gray-400">
            {form.apply_method === 'link' ? 'Application URL' : form.apply_method === 'phone' ? 'Phone Number' : 'Contact'}
          </label>
          <input className={inputCls} value={form.apply_value} onChange={(e) => updateField('apply_value', e.target.value)} />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-xs text-gray-500 dark:text-gray-400">Description</label>
        <textarea
          rows={4}
          className={`resize-none ${inputCls}`}
          value={form.description}
          maxLength={500}
          onChange={(e) => updateField('description', e.target.value)}
        />
      </div>

      <div>
        <label className="mb-2 block text-xs text-gray-500 dark:text-gray-400">Photos (up to 4)</label>
        {existingImages.length > 0 && (
          <div className="mb-2 grid grid-cols-4 gap-2">
            {existingImages.map((src) => (
              <div key={src} className="relative aspect-square overflow-hidden rounded-xl bg-gray-100 dark:bg-gray-700">
                <Image src={src} alt="" fill className="object-cover" />
              </div>
            ))}
          </div>
        )}
        <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-200 p-6 text-center hover:border-teal-400 hover:bg-teal-50 dark:border-gray-700 dark:hover:bg-teal-900/10">
          <input type="file" accept="image/*" multiple className="hidden" onChange={handleImageChange} />
          <Camera className="h-8 w-8 text-gray-400" aria-hidden />
          <span className="mt-2 text-sm font-medium text-gray-700 dark:text-gray-300">
            {previews.length > 0 ? `${previews.length} photo(s) selected` : existingImages.length > 0 ? 'Replace photos' : 'Upload photos'}
          </span>
        </label>
        {previews.length > 0 && (
          <div className="mt-2 grid grid-cols-4 gap-2">
            {previews.map((src, i) => (
              <div key={src} className="relative aspect-square overflow-hidden rounded-xl bg-gray-100">
                <Image src={src} alt={`Preview ${i + 1}`} fill className="object-cover" />
              </div>
            ))}
          </div>
        )}
      </div>

      <button
        onClick={() => onSubmit(form, images)}
        disabled={loading || !form.title.trim() || !form.employer.trim()}
        className="rounded-xl bg-teal-600 py-3 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50"
      >
        {loading ? 'Saving...' : submitLabel}
      </button>
    </div>
  )
}

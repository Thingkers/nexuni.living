'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { Camera } from 'lucide-react'

import { compressImage } from '@/lib/compressImage'
import { UniversityCombobox } from '@/features/universities/components/UniversityCombobox'
import type { BookCondition } from '@/features/books/types'

export type BookFormValues = {
  title: string
  author: string
  course_code: string
  department: string
  semester: string
  condition: BookCondition
  price: string
  negotiable: boolean
  description: string
  university_id: string | null
  university: string
}

export const EMPTY_BOOK_FORM: BookFormValues = {
  title: '',
  author: '',
  course_code: '',
  department: '',
  semester: '',
  condition: 'good',
  price: '',
  negotiable: false,
  description: '',
  university_id: null,
  university: '',
}

const inputCls =
  'w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none transition-colors focus:border-teal-500 bg-white dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100'

// Shared between /post-book (create) and the Books module admin edit panel —
// same field set either way, only the submit behavior differs.
export default function BookForm({
  initial,
  existingImages = [],
  onSubmit,
  submitLabel,
  loading,
}: {
  initial?: Partial<BookFormValues>
  existingImages?: string[]
  onSubmit: (values: BookFormValues, newImages: File[]) => void
  submitLabel: string
  loading: boolean
}) {
  const [form, setForm] = useState<BookFormValues>({ ...EMPTY_BOOK_FORM, ...initial })
  const [images, setImages] = useState<File[]>([])
  const [previews, setPreviews] = useState<string[]>([])

  useEffect(() => {
    return () => previews.forEach((url) => URL.revokeObjectURL(url))
  }, [previews])

  function updateField<K extends keyof BookFormValues>(key: K, value: BookFormValues[K]) {
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
        <label className="mb-1 block text-xs text-gray-500 dark:text-gray-400">Title *</label>
        <input
          placeholder="e.g. Discrete Mathematics, 7th Edition"
          className={inputCls}
          value={form.title}
          maxLength={100}
          onChange={(e) => updateField('title', e.target.value)}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-xs text-gray-500 dark:text-gray-400">Author</label>
          <input className={inputCls} value={form.author} onChange={(e) => updateField('author', e.target.value)} />
        </div>
        <div>
          <label className="mb-1 block text-xs text-gray-500 dark:text-gray-400">Course Code</label>
          <input placeholder="e.g. CSE221" className={inputCls} value={form.course_code} onChange={(e) => updateField('course_code', e.target.value)} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-xs text-gray-500 dark:text-gray-400">Department</label>
          <input className={inputCls} value={form.department} onChange={(e) => updateField('department', e.target.value)} />
        </div>
        <div>
          <label className="mb-1 block text-xs text-gray-500 dark:text-gray-400">Semester</label>
          <input placeholder="e.g. Spring 2026" className={inputCls} value={form.semester} onChange={(e) => updateField('semester', e.target.value)} />
        </div>
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

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-xs text-gray-500 dark:text-gray-400">Condition</label>
          <select className={inputCls} value={form.condition} onChange={(e) => updateField('condition', e.target.value as BookCondition)}>
            <option value="new">New</option>
            <option value="good">Good</option>
            <option value="fair">Fair</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs text-gray-500 dark:text-gray-400">Price (৳) *</label>
          <input type="number" className={inputCls} value={form.price} onChange={(e) => updateField('price', e.target.value)} />
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
        <input type="checkbox" checked={form.negotiable} onChange={(e) => updateField('negotiable', e.target.checked)} />
        Price is negotiable
      </label>

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
        disabled={loading || !form.title.trim() || !form.price}
        className="rounded-xl bg-teal-600 py-3 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50"
      >
        {loading ? 'Saving...' : submitLabel}
      </button>
    </div>
  )
}

'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Archive, CheckCircle2, Pencil, Trash2 } from 'lucide-react'

import { supabase } from '@/lib/supabase'
import { uploadContentImages } from '@/lib/uploadContentImages'
import BookForm, { type BookFormValues } from '@/features/books/components/BookForm'
import type { BookListing } from '@/features/books/types'

export default function BooksAdminPanel() {
  const [listings, setListings] = useState<BookListing[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [savingId, setSavingId] = useState<string | null>(null)

  async function fetchBooks(): Promise<BookListing[]> {
    const { data } = await supabase
      .from('listings')
      .select('id, title, description, price, status, images, owner_id, university_id, created_at, listing_book_details(author, course_code, department, semester, condition, negotiable), universities(name), profiles(full_name, email)')
      .eq('listing_type', 'book')
      .order('created_at', { ascending: false })

    return (data ?? []) as unknown as BookListing[]
  }

  useEffect(() => {
    let active = true

    async function init() {
      const books = await fetchBooks()
      if (!active) return
      setListings(books)
      setLoading(false)
    }

    init()
    return () => { active = false }
  }, [])

  async function refresh() {
    setListings(await fetchBooks())
  }

  async function toggleStatus(listing: BookListing) {
    const nextStatus = listing.status === 'active' ? 'archived' : 'active'
    const { error } = await supabase.from('listings').update({ status: nextStatus }).eq('id', listing.id)
    if (error) { toast.error(error.message); return }
    await refresh()
  }

  async function remove(listing: BookListing) {
    const confirmed = window.confirm(`Permanently delete "${listing.title}"? This cannot be undone.`)
    if (!confirmed) return

    const { error } = await supabase.from('listings').delete().eq('id', listing.id)
    if (error) { toast.error(error.message); return }
    toast.success('Book deleted')
    await refresh()
  }

  async function saveEdit(listing: BookListing, values: BookFormValues, newImages: File[]) {
    setSavingId(listing.id)

    const { error: listingError } = await supabase
      .from('listings')
      .update({
        title: values.title,
        description: values.description || null,
        price: Number(values.price),
        university_id: values.university_id,
      })
      .eq('id', listing.id)

    const { error: detailsError } = await supabase
      .from('listing_book_details')
      .update({
        author: values.author || null,
        course_code: values.course_code || null,
        department: values.department || null,
        semester: values.semester || null,
        condition: values.condition,
        negotiable: values.negotiable,
      })
      .eq('listing_id', listing.id)

    if (listingError || detailsError) {
      setSavingId(null)
      toast.error(listingError?.message || detailsError?.message || 'Update failed')
      return
    }

    try {
      if (newImages.length > 0) {
        const urls = await uploadContentImages('books', listing.id, newImages)
        await supabase.from('listings').update({ images: urls }).eq('id', listing.id)
      }
      toast.success('Book updated')
      setEditingId(null)
      await refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Image upload failed')
    } finally {
      setSavingId(null)
    }
  }

  if (loading) {
    return <p className="text-sm text-gray-400">Loading books...</p>
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-gray-400">{listings.length} book{listings.length === 1 ? '' : 's'} total</p>

      {listings.map((listing) => (
        <div key={listing.id} className="rounded-2xl border border-gray-100 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-medium text-gray-900 dark:text-white">{listing.title}</p>
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                  listing.status === 'active'
                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                    : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
                }`}>
                  {listing.status === 'active' ? 'Active' : 'Archived'}
                </span>
              </div>
              <p className="mt-0.5 text-xs text-gray-400">
                {listing.profiles?.full_name || 'Unknown seller'} · ৳{listing.price?.toLocaleString('en-US') ?? '—'}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setEditingId(editingId === listing.id ? null : listing.id)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-700"
              >
                <Pencil className="h-3.5 w-3.5" aria-hidden /> {editingId === listing.id ? 'Close' : 'Edit'}
              </button>
              <button
                onClick={() => toggleStatus(listing)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-teal-200 px-3 py-1.5 text-xs text-teal-600 hover:bg-teal-50 dark:border-teal-800 dark:hover:bg-teal-900/20"
              >
                {listing.status === 'active'
                  ? <><Archive className="h-3.5 w-3.5" aria-hidden /> Archive</>
                  : <><CheckCircle2 className="h-3.5 w-3.5" aria-hidden /> Activate</>}
              </button>
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
              <BookForm
                initial={{
                  title: listing.title,
                  description: listing.description ?? '',
                  price: listing.price != null ? String(listing.price) : '',
                  author: listing.listing_book_details?.author ?? '',
                  course_code: listing.listing_book_details?.course_code ?? '',
                  department: listing.listing_book_details?.department ?? '',
                  semester: listing.listing_book_details?.semester ?? '',
                  condition: listing.listing_book_details?.condition ?? 'good',
                  negotiable: listing.listing_book_details?.negotiable ?? false,
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
      ))}
    </div>
  )
}

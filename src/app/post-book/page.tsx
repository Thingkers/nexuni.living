'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

import { supabase } from '@/lib/supabase'
import { uploadContentImages } from '@/lib/uploadContentImages'
import BookForm, { type BookFormValues } from '@/features/books/components/BookForm'

export default function PostBookPage() {
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
        toast.error('Only verified students can post a book for sale')
        router.push('/books')
        return
      }

      setUserId(authData.user.id)
    }
    checkUser()
  }, [router])

  async function handleSubmit(values: BookFormValues, images: File[]) {
    if (!userId) return
    if (!values.title.trim() || !values.price) {
      toast.error('Title and price are required')
      return
    }

    setLoading(true)

    const { data: listing, error } = await supabase
      .from('listings')
      .insert({
        listing_type: 'book',
        owner_id: userId,
        title: values.title,
        description: values.description || null,
        price: Number(values.price),
        status: 'active',
        university_id: values.university_id,
        images: [],
      })
      .select()
      .single()

    if (error || !listing) {
      setLoading(false)
      toast.error(error?.message || 'Failed to post book')
      return
    }

    const { error: detailsError } = await supabase
      .from('listing_book_details')
      .insert({
        listing_id: listing.id,
        author: values.author || null,
        course_code: values.course_code || null,
        department: values.department || null,
        semester: values.semester || null,
        condition: values.condition,
        negotiable: values.negotiable,
      })

    if (detailsError) {
      setLoading(false)
      toast.error(detailsError.message)
      return
    }

    try {
      if (images.length > 0) {
        const urls = await uploadContentImages('books', listing.id, images)
        await supabase.from('listings').update({ images: urls }).eq('id', listing.id)
      }
      toast.success('Book posted')
      router.push(`/books/${listing.id}`)
    } catch (err) {
      setLoading(false)
      const message = err instanceof Error ? err.message : 'Image upload failed'
      toast.error(message)
    }
  }

  return (
    <main className="mx-auto max-w-lg px-4 py-8">
      <h1 className="mb-1 text-2xl font-semibold text-gray-900 dark:text-white">Post a Book</h1>
      <p className="mb-6 text-sm text-gray-400">Goes live immediately — no approval needed.</p>
      <BookForm onSubmit={handleSubmit} submitLabel="Post Book ✓" loading={loading} />
    </main>
  )
}

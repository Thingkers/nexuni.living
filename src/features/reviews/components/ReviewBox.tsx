'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'

import { supabase } from '@/lib/supabase'

type Review = {
  id: string
  rating: number
  comment: string | null
  created_at: string
  reviewer_id: string
  profiles?: {
    full_name: string | null
  } | null
}

type Props = {
  roomId: string
  ownerId: string | null
}

export default function ReviewBox({ roomId, ownerId }: Props) {
  const [reviews, setReviews] = useState<Review[]>([])
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [rating, setRating] = useState(5)
  const [comment, setComment] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    async function loadReviews() {
      const [{ data: authData }, { data: reviewData }] = await Promise.all([
        supabase.auth.getUser(),
        supabase
          .from('reviews')
          .select('*, profiles(full_name)')
          .eq('room_id', roomId)
          .order('created_at', { ascending: false }),
      ])

      setCurrentUserId(authData.user?.id ?? null)
      setReviews((reviewData ?? []) as Review[])
      setLoading(false)
    }

    loadReviews()
  }, [roomId])

  const averageRating =
    reviews.length > 0
      ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length
      : 0

  const alreadyReviewed = reviews.some(
    (review) => review.reviewer_id === currentUserId,
  )

  const canReview =
    !!currentUserId && currentUserId !== ownerId && !alreadyReviewed

  async function submitReview() {
    if (!currentUserId) {
      toast.error('Please login to submit a review')
      return
    }

    if (currentUserId === ownerId) {
      toast.error('You cannot review your own listing')
      return
    }

    setSubmitting(true)

    const { data, error } = await supabase
      .from('reviews')
      .insert({
        room_id: roomId,
        reviewer_id: currentUserId,
        rating,
        comment: comment.trim() || null,
      })
      .select('*, profiles(full_name)')
      .single()

    setSubmitting(false)

    if (error) {
      if (error.code === '23505') {
        toast.error('You have already reviewed this listing')
      } else {
        toast.error(error.message)
      }
      return
    }

    setReviews((prev) => [data as Review, ...prev])
    setRating(5)
    setComment('')
    toast.success('Review submitted successfully')
  }

  return (
    <section className="mt-8 rounded-2xl border border-gray-100 bg-white p-4 sm:p-5">
      {/* Header */}
      <div className="mb-5 flex items-start justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Reviews</h2>
          <p className="text-sm text-gray-400">
            {reviews.length === 0
              ? 'No reviews yet'
              : `${averageRating.toFixed(1)} / 5 · ${reviews.length} review${
                  reviews.length > 1 ? 's' : ''
                }`}
          </p>
        </div>

        <div className="shrink-0 text-xl sm:text-2xl">
          {'★'.repeat(Math.round(averageRating || 0))}
          <span className="text-gray-200">
            {'★'.repeat(5 - Math.round(averageRating || 0))}
          </span>
        </div>
      </div>

      {/* Write Review */}
      {canReview && (
        <div className="mb-6 rounded-2xl bg-gray-50 p-3 sm:p-4">
          <p className="mb-2 text-sm font-medium text-gray-700">
            Write a review
          </p>

          {/* Star selector — bigger touch targets on mobile */}
          <div className="mb-3 flex gap-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setRating(star)}
                className={`text-3xl sm:text-2xl touch-manipulation ${
                  star <= rating ? 'text-yellow-400' : 'text-gray-300'
                }`}
              >
                ★
              </button>
            ))}
          </div>

          <textarea
            rows={3}
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            placeholder="Share your experience..."
            className="mb-3 w-full resize-none rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-blue-500"
          />

          <button
            onClick={submitReview}
            disabled={submitting}
            className="w-full sm:w-auto rounded-xl bg-blue-600 px-5 py-3 sm:py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {submitting ? 'Submitting...' : 'Submit Review'}
          </button>
        </div>
      )}

      {/* Reviews list */}
      {loading ? (
        <p className="text-sm text-gray-400">Loading reviews...</p>
      ) : reviews.length === 0 ? (
        <p className="text-sm text-gray-400">
          Be the first student to review this listing.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {reviews.map((review) => (
            <div
              key={review.id}
              className="rounded-2xl border border-gray-100 p-3 sm:p-4"
            >
              <div className="mb-1 flex items-center justify-between gap-2">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {review.profiles?.full_name || 'Student'}
                </p>

                <span className="shrink-0 text-sm text-yellow-400">
                  {'★'.repeat(review.rating)}
                  <span className="text-gray-200">
                    {'★'.repeat(5 - review.rating)}
                  </span>
                </span>
              </div>

              {review.comment && (
                <p className="mt-2 text-sm leading-relaxed text-gray-500">
                  {review.comment}
                </p>
              )}

              <p className="mt-2 text-xs text-gray-400">
                {new Date(review.created_at).toLocaleDateString('en-US')}
              </p>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
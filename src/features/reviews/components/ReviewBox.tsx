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
  profiles?: { full_name: string | null; avatar_url?: string | null } | null
}

type Props = {
  roomId: string
  ownerId: string | null
}

function StarDisplay({ rating, size = 'sm' }: { rating: number; size?: 'sm' | 'lg' }) {
  const cls = size === 'lg' ? 'text-2xl' : 'text-base'
  return (
    <span className={cls}>
      {Array.from({ length: 5 }, (_, i) => (
        <span key={i} className={i < rating ? 'text-yellow-400' : 'text-gray-200 dark:text-gray-600'}>★</span>
      ))}
    </span>
  )
}

function RatingBar({ value, count, total }: { value: number; count: number; total: number }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-3 text-gray-500 dark:text-gray-400">{value}</span>
      <span className="text-yellow-400">★</span>
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-700">
        <div className="h-full rounded-full bg-yellow-400 transition-all" style={{ width: `${pct}%` }} />
      </div>
      <span className="w-6 text-right text-gray-400">{count}</span>
    </div>
  )
}

export default function ReviewBox({ roomId, ownerId }: Props) {
  const [reviews, setReviews] = useState<Review[]>([])
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [rating, setRating] = useState(5)
  const [hoverRating, setHoverRating] = useState(0)
  const [comment, setComment] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [showForm, setShowForm] = useState(false)

  useEffect(() => {
    async function load() {
      const [{ data: auth }, { data: reviewData }] = await Promise.all([
        supabase.auth.getUser(),
        supabase
          .from('reviews')
          .select('*, profiles(full_name, avatar_url)')
          .eq('room_id', roomId)
          .order('created_at', { ascending: false }),
      ])
      setCurrentUserId(auth.user?.id ?? null)
      setReviews((reviewData ?? []) as Review[])
      setLoading(false)
    }
    load()
  }, [roomId])

  const avgRating = reviews.length > 0
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
    : 0

  const ratingCounts = [5, 4, 3, 2, 1].map((v) => ({
    value: v,
    count: reviews.filter((r) => r.rating === v).length,
  }))

  const alreadyReviewed = reviews.some((r) => r.reviewer_id === currentUserId)
  const canReview = !!currentUserId && currentUserId !== ownerId && !alreadyReviewed

  async function submitReview() {
    if (!currentUserId) { toast.error('Please login first'); return }
    setSubmitting(true)

    const { data, error } = await supabase
      .from('reviews')
      .insert({ room_id: roomId, reviewer_id: currentUserId, rating, comment: comment.trim() || null })
      .select('*, profiles(full_name, avatar_url)')
      .single()

    setSubmitting(false)

    if (error) {
      toast.error(error.code === '23505' ? 'You already reviewed this listing' : error.message)
      return
    }

    setReviews((prev) => [data as Review, ...prev])
    setRating(5)
    setComment('')
    setShowForm(false)
    toast.success('Review submitted!')
  }

  const initials = (name: string | null | undefined) =>
    name?.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase() ?? 'U'

  return (
    <section className="mt-8 rounded-2xl border border-gray-100 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
      {/* Header */}
      <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Reviews</h2>
          {reviews.length > 0 ? (
            <div className="mt-1 flex items-center gap-2">
              <StarDisplay rating={Math.round(avgRating)} size="sm" />
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                {avgRating.toFixed(1)}
              </span>
              <span className="text-sm text-gray-400">·</span>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {reviews.length} review{reviews.length !== 1 ? 's' : ''}
              </span>
            </div>
          ) : (
            <p className="mt-1 text-sm text-gray-400 dark:text-gray-500">No reviews yet</p>
          )}
        </div>

        {/* Rating bars */}
        {reviews.length > 0 && (
          <div className="flex w-full flex-col gap-1 sm:w-44">
            {ratingCounts.map((r) => (
              <RatingBar key={r.value} value={r.value} count={r.count} total={reviews.length} />
            ))}
          </div>
        )}
      </div>

      {/* Write review CTA */}
      {canReview && !showForm && (
        <button
          onClick={() => setShowForm(true)}
          className="mb-5 w-full rounded-xl border border-teal-200 py-2.5 text-sm font-medium text-teal-600 hover:bg-teal-50 dark:border-teal-700 dark:hover:bg-teal-900/20"
        >
          ✍️ Write a Review
        </button>
      )}

      {alreadyReviewed && (
        <div className="mb-5 rounded-xl bg-green-50 px-4 py-2.5 text-xs text-green-700 dark:bg-green-900/20 dark:text-green-400">
          ✓ You have already reviewed this listing
        </div>
      )}

      {/* Review form */}
      {showForm && canReview && (
        <div className="mb-6 rounded-2xl border border-teal-100 bg-teal-50 p-4 dark:border-teal-800 dark:bg-teal-900/10">
          <p className="mb-3 text-sm font-semibold text-gray-800 dark:text-gray-200">Your Rating</p>

          {/* Interactive star selector */}
          <div className="mb-4 flex gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onMouseEnter={() => setHoverRating(star)}
                onMouseLeave={() => setHoverRating(0)}
                onClick={() => setRating(star)}
                className={`text-3xl transition-transform hover:scale-110 touch-manipulation ${
                  star <= (hoverRating || rating) ? 'text-yellow-400' : 'text-gray-300 dark:text-gray-600'
                }`}
              >
                ★
              </button>
            ))}
            <span className="ml-2 self-center text-sm text-gray-500 dark:text-gray-400">
              {['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'][hoverRating || rating]}
            </span>
          </div>

          <textarea
            rows={3}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Share your experience with this room..."
            className="mb-3 w-full resize-none rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:border-teal-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-500"
          />

          <div className="flex gap-2">
            <button
              onClick={() => setShowForm(false)}
              className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
            >
              Cancel
            </button>
            <button
              onClick={submitReview}
              disabled={submitting}
              className="flex-1 rounded-xl bg-teal-600 py-2.5 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50"
            >
              {submitting ? 'Submitting...' : 'Submit Review'}
            </button>
          </div>
        </div>
      )}

      {/* Reviews list */}
      {loading ? (
        <div className="flex flex-col gap-3">
          {[1, 2].map((i) => (
            <div key={i} className="animate-pulse rounded-2xl border border-gray-100 p-4 dark:border-gray-700">
              <div className="mb-2 flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-gray-100 dark:bg-gray-700" />
                <div className="h-4 w-32 rounded bg-gray-100 dark:bg-gray-700" />
              </div>
              <div className="h-3 w-full rounded bg-gray-100 dark:bg-gray-700" />
            </div>
          ))}
        </div>
      ) : reviews.length === 0 ? (
        <div className="py-6 text-center">
          <p className="text-3xl">💬</p>
          <p className="mt-2 text-sm text-gray-400 dark:text-gray-500">
            No reviews yet — be the first!
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {reviews.map((review) => (
            <div key={review.id} className="rounded-2xl border border-gray-100 p-4 dark:border-gray-700">
              <div className="mb-2 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-teal-100 text-xs font-semibold text-teal-700 dark:bg-teal-900/40 dark:text-teal-400">
                    {review.profiles?.avatar_url ? (
                      <img src={review.profiles.avatar_url} alt="" className="h-full w-full object-cover" />
                    ) : initials(review.profiles?.full_name)}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {review.profiles?.full_name || 'Student'}
                    </p>
                    <p className="text-[10px] text-gray-400 dark:text-gray-500">
                      {new Date(review.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                  </div>
                </div>
                <StarDisplay rating={review.rating} />
              </div>

              {review.comment && (
                <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-400">
                  {review.comment}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

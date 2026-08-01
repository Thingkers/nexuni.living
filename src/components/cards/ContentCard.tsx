'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { MapPin, type LucideIcon } from 'lucide-react'

export type ContentCardPill = { label: string; tone: 'teal' | 'gray' | 'blue' | 'pink' }
export type ContentCardBadge = { label: string; tone: 'featured' | 'sample' }

const PILL_TONES: Record<ContentCardPill['tone'], string> = {
  teal: 'bg-teal-50 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
  gray: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
  blue: 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400',
  pink: 'bg-pink-50 text-pink-600 dark:bg-pink-900/20 dark:text-pink-400',
}

const BADGE_TONES: Record<ContentCardBadge['tone'], string> = {
  featured: 'bg-teal-500 text-white',
  sample: 'bg-gray-500/90 text-white',
}

export type ContentCardProps = {
  href: string
  images?: string[]
  fallbackIcon: LucideIcon
  imageAlt: string
  eyebrow?: string
  title: string
  summary?: string
  priceLabel?: string
  pills?: ContentCardPill[]
  locationLabel?: string
  badges?: ContentCardBadge[]
  footer?: React.ReactNode
}

// Generic card shell shared by non-room, non-roommate verticals (Books,
// Local Services, Jobs, Transport). Mirrors RoomCard/RoommateCard's visual
// language (rounded-2xl shell, image carousel, pill rows) instead of
// DiscoveryCard's separate slate/rounded-[26px] style, without editing
// either of those two — see docs/module-verticals-roadmap.md Sprint 3.
export default function ContentCard({
  href,
  images = [],
  fallbackIcon: FallbackIcon,
  imageAlt,
  eyebrow,
  title,
  summary,
  priceLabel,
  pills = [],
  locationLabel,
  badges = [],
  footer,
}: ContentCardProps) {
  const [activeImage, setActiveImage] = useState(0)
  const hasImages = images.length > 0

  useEffect(() => {
    if (images.length <= 1) return
    const interval = setInterval(() => {
      setActiveImage((prev) => (prev + 1) % images.length)
    }, 3000)
    return () => clearInterval(interval)
  }, [images.length])

  return (
    <Link
      href={href}
      className="group block overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:border-teal-100 dark:border-gray-700 dark:bg-gray-800 dark:hover:border-teal-700"
    >
      <div className="relative h-44 overflow-hidden bg-gray-100 dark:bg-gray-700">
        {hasImages ? (
          images.map((src, index) => (
            <div
              key={src}
              className={`absolute inset-0 transition-opacity duration-700 ${index === activeImage ? 'opacity-100' : 'opacity-0'}`}
            >
              <Image
                src={src}
                alt={imageAlt}
                fill
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                className="object-cover"
              />
            </div>
          ))
        ) : (
          <div className="flex h-full items-center justify-center">
            <FallbackIcon className="h-14 w-14 text-gray-300 dark:text-gray-600" aria-hidden />
          </div>
        )}

        {images.length > 1 && (
          <div className="absolute bottom-2.5 left-1/2 z-10 flex -translate-x-1/2 gap-1">
            {images.map((_, i) => (
              <span
                key={i}
                className={`h-1.5 rounded-full transition-all duration-300 ${i === activeImage ? 'w-4 bg-white' : 'w-1.5 bg-white/50'}`}
              />
            ))}
          </div>
        )}

        {badges.length > 0 && (
          <div className="absolute right-2.5 top-2.5 flex flex-wrap justify-end gap-1">
            {badges.map((badge, i) => (
              <span key={i} className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase ${BADGE_TONES[badge.tone]}`}>
                {badge.label}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="p-4">
        {eyebrow && (
          <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-teal-700 dark:text-teal-400">{eyebrow}</p>
        )}

        <h3 className="mb-1.5 line-clamp-2 font-semibold text-gray-900 transition-colors group-hover:text-teal-600 dark:text-white dark:group-hover:text-teal-400">
          {title}
        </h3>

        {locationLabel && (
          <div className="mb-2 flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
            <MapPin className="h-3 w-3 shrink-0" aria-hidden />
            <span className="truncate">{locationLabel}</span>
          </div>
        )}

        {pills.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-1.5">
            {pills.map((pill, i) => (
              <span key={i} className={`rounded-full px-2 py-0.5 text-xs font-medium ${PILL_TONES[pill.tone]}`}>
                {pill.label}
              </span>
            ))}
          </div>
        )}

        {summary && (
          <p className="mb-2 line-clamp-2 text-xs leading-relaxed text-gray-400 dark:text-gray-500">{summary}</p>
        )}

        {priceLabel && (
          <p className="text-sm font-bold text-teal-600 dark:text-teal-400">{priceLabel}</p>
        )}
      </div>

      {footer && (
        <div className="border-t border-gray-50 px-4 py-3 dark:border-gray-700">
          {footer}
        </div>
      )}
    </Link>
  )
}

'use client'

import Image from 'next/image'
import Link from 'next/link'
import { ArrowUpRight, MapPin, ShieldCheck, Users } from 'lucide-react'
import { useTranslations } from 'next-intl'

import type { Room } from '@/features/rooms/types/room.types'
import { ROOM_TYPE_MESSAGE_KEYS, isSharedRoom } from '@/features/rooms/types/room.types'

export default function FeaturedRoomCard({ room }: { room: Room }) {
  const t = useTranslations('FeaturedRooms')
  const roomType = useTranslations('RoomType')
  const image = room.images?.[0]
  const available = isSharedRoom(room.type) ? room.available_seats : room.status === 'booked' ? 0 : 1

  return (
    <article className="group min-w-0 overflow-hidden rounded-[26px] border border-white/10 bg-white/[0.06] shadow-[0_22px_60px_rgba(0,0,0,.22)] backdrop-blur-sm transition hover:-translate-y-1 hover:border-teal-300/40">
      <Link href={`/listings/${room.id}`} className="block">
        <div className="relative h-56 overflow-hidden bg-slate-800">
          {image ? (
            <Image
              src={image}
              alt={room.title}
              fill
              className="object-cover transition duration-700 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-slate-500">{t('noImage')}</div>
          )}
          <div className="absolute inset-0 bg-linear-to-t from-[#071c19] via-transparent to-transparent" />
          <span className="absolute left-4 top-4 rounded-full border border-white/20 bg-[#071c19]/80 px-3 py-1.5 text-[9px] font-bold uppercase tracking-[0.14em] text-teal-200 backdrop-blur-xl">
            {roomType(ROOM_TYPE_MESSAGE_KEYS[room.type])}
          </span>
          <span className="absolute bottom-4 left-4 rounded-full border-2 border-white bg-teal-700 px-3 py-1.5 text-xs font-black text-white shadow-xl">
            ৳{room.rent.toLocaleString()} {isSharedRoom(room.type) ? t('perSeat') : t('perMonth')}
          </span>
          <span className="absolute bottom-4 right-4 flex h-9 w-9 items-center justify-center rounded-full bg-white text-slate-950 transition group-hover:rotate-45">
            <ArrowUpRight className="h-4 w-4" />
          </span>
        </div>

        <div className="p-5">
          <div className="flex items-center gap-2 text-[10px] font-semibold text-teal-200">
            <span className="h-1.5 w-1.5 rounded-full bg-teal-300" />
            {available > 0 ? t('availableCount', { count: available }) : t('occupied')}
          </div>
          <h3 className="mt-3 line-clamp-2 text-lg font-semibold leading-6 tracking-[-0.025em] text-white">
            {room.title}
          </h3>
          <p className="mt-3 flex items-center gap-1.5 truncate text-xs text-slate-400">
            <MapPin className="h-3.5 w-3.5 shrink-0 text-teal-300" />
            {room.location_name || t('locationMissing')}
          </p>
          <div className="mt-5 flex items-center justify-between border-t border-white/10 pt-4 text-[10px] text-slate-400">
            <span className="flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5" />
              {room.gender_type === 'any'
                ? t('anyGender')
                : room.gender_type === 'male'
                  ? t('maleOnly')
                  : t('femaleOnly')}
            </span>
            <span className="flex items-center gap-1.5 text-teal-200">
              <ShieldCheck className="h-3.5 w-3.5" />
              {t('directListing')}
            </span>
          </div>
        </div>
      </Link>
    </article>
  )
}

'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { toast } from 'sonner'
import Image from 'next/image'
import {
  Wifi, Zap, Flame, ShowerHead, BookOpen, Shirt, Camera,
  Tag, Plus, Trash2, Power, ArrowUpDown, Snowflake, Sparkles, ShieldCheck, Droplets, Trees,
} from 'lucide-react'
import { compressImage } from '@/lib/compressImage'
import { supabase } from '@/lib/supabase'
import { isSharedRoom } from '@/features/rooms/types/room.types'
import type { RoomType } from '@/features/rooms/types/room.types'

const LocationPicker = dynamic(
  () => import('@/features/map/components/LocationPicker'),
  { ssr: false },
)

const AMENITIES = [
  { key: 'wifi',          Icon: Wifi,        label: 'WiFi' },
  { key: 'electricity',   Icon: Zap,         label: 'Electricity' },
  { key: 'gas',           Icon: Flame,       label: 'Gas' },
  { key: 'attached_bath', Icon: ShowerHead,  label: 'Attached Bath' },
  { key: 'study_table',   Icon: BookOpen,    label: 'Study Table' },
  { key: 'generator',     Icon: Power,       label: 'Generator' },
  { key: 'lift',          Icon: ArrowUpDown, label: 'Lift' },
  { key: 'fridge',        Icon: Snowflake,   label: 'Fridge' },
  { key: 'maid_service',  Icon: Sparkles,    label: 'Maid Service' },
  { key: 'security',      Icon: ShieldCheck, label: 'Security' },
  { key: 'water_filter',  Icon: Droplets,    label: 'Water Filter' },
  { key: 'balcony',       Icon: Trees,       label: 'Balcony' },
] as const

const HOUSE_RULES = ['No Smoking', 'No Drugs', 'No Pets', 'No Male Visitors', 'No Female Visitors']

const inputCls = 'w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:border-teal-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100'

type Landmark = { name: string; time: string }

// The edit form mirrors the `rooms` row plus a few normalized fields
// (house_rules/landmarks default to [], washroom_sharing to ''). Inputs write
// strings even for numeric fields (e.g. rent), so those are typed loosely.
// The index signature lets the AMENITIES list toggle boolean fields by key
// without needing `any` to do the dynamic lookup.
type RoomForm = {
  owner_id?: string
  title?: string
  type?: string
  gender_type?: string
  rent?: string | number
  total_seats?: string | number
  available_seats?: string | number
  location_name?: string
  latitude?: string | number | null
  longitude?: string | number | null
  available_from?: string | null
  description?: string
  status?: string
  electricity_bill?: string | number
  maid_bill?: string | number
  other_bill?: string | number
  other_bill_label?: string
  advance_deposit?: string | number
  rent_inclusive?: boolean
  university_priority?: string
  washroom_sharing?: string | number
  meal_available?: boolean
  house_rules?: string[]
  landmarks?: Landmark[]
  [key: string]: unknown
}

export default function EditListingPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const roomId = params.id

  const [form, setForm] = useState<RoomForm | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showMap, setShowMap] = useState(false)

  const [existingImages, setExistingImages] = useState<string[]>([])
  const [removedImages, setRemovedImages] = useState<string[]>([])
  const [newFiles, setNewFiles] = useState<File[]>([])
  const [newPreviews, setNewPreviews] = useState<string[]>([])

  useEffect(() => {
    async function loadRoom() {
      const [{ data: room, error: roomError }, { data: auth }] =
        await Promise.all([
          supabase.from('rooms').select('*').eq('id', roomId).single(),
          supabase.auth.getUser(),
        ])

      if (roomError || !room) { router.push('/listings'); return }
      if (!auth.user || room.owner_id !== auth.user.id) { router.push(`/listings/${roomId}`); return }

      setExistingImages(room.images ?? [])
      setForm({
        ...room,
        house_rules: room.house_rules ?? [],
        landmarks: room.landmarks ?? [],
        washroom_sharing: room.washroom_sharing ?? '',
      })
      setLoading(false)
    }

    if (roomId) loadRoom()
  }, [roomId, router])

  useEffect(() => {
    return () => newPreviews.forEach((url) => URL.revokeObjectURL(url))
  }, [newPreviews])

  function updateField(key: string, value: unknown) {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev))
  }

  async function handleNewImages(e: React.ChangeEvent<HTMLInputElement>) {
    const visible = existingImages.filter((u) => !removedImages.includes(u))
    const remaining = 4 - visible.length - newFiles.length
    if (remaining <= 0) { toast.error('Maximum 4 images allowed'); return }
    const files = Array.from(e.target.files ?? []).slice(0, remaining)
    const compressed = await Promise.all(files.map((f) => compressImage(f)))
    setNewFiles((prev) => [...prev, ...compressed])
    setNewPreviews((prev) => [...prev, ...compressed.map((f) => URL.createObjectURL(f))])
  }

  function removeNew(index: number) {
    URL.revokeObjectURL(newPreviews[index])
    setNewFiles((prev) => prev.filter((_, i) => i !== index))
    setNewPreviews((prev) => prev.filter((_, i) => i !== index))
  }

  async function handleSave() {
    if (!form) return
    if (!form.title?.trim() || !form.rent || !form.location_name?.trim()) {
      toast.error('Title, rent and location are required')
      return
    }

    setSaving(true)

    try {
      const uploadedUrls: string[] = []
      for (const file of newFiles) {
        const path = `${roomId}/${crypto.randomUUID()}.webp`
        const { error } = await supabase.storage.from('room-images').upload(path, file, { contentType: 'image/webp' })
        if (error) throw new Error(error.message)
        const { data } = supabase.storage.from('room-images').getPublicUrl(path)
        uploadedUrls.push(data.publicUrl)
      }

      const finalImages = [
        ...existingImages.filter((u) => !removedImages.includes(u)),
        ...uploadedUrls,
      ]

      const shared = isSharedRoom(form.type as RoomType)
      const totalSeats = Number(form.total_seats)
      const availableSeats = Math.min(Number(form.available_seats ?? totalSeats), totalSeats)

      const { error: updateError } = await supabase
        .from('rooms')
        .update({
          title: form.title,
          type: form.type,
          gender_type: form.gender_type,
          rent: Number(form.rent),
          total_seats: shared ? totalSeats : 1,
          available_seats: shared ? availableSeats : 1,
          location_name: form.location_name,
          latitude: form.latitude ? Number(form.latitude) : null,
          longitude: form.longitude ? Number(form.longitude) : null,
          available_from: form.available_from,
          description: form.description,
          status: form.status,
          images: finalImages,
          wifi: form.wifi ?? false,
          gas: form.gas ?? false,
          electricity: form.electricity ?? false,
          attached_bath: form.attached_bath ?? false,
          study_table: form.study_table ?? false,
          generator: form.generator ?? false,
          lift: form.lift ?? false,
          fridge: form.fridge ?? false,
          maid_service: form.maid_service ?? false,
          security: form.security ?? false,
          water_filter: form.water_filter ?? false,
          balcony: form.balcony ?? false,
          electricity_bill: form.electricity_bill ? Number(form.electricity_bill) : null,
          maid_bill: form.maid_bill ? Number(form.maid_bill) : null,
          other_bill: form.other_bill ? Number(form.other_bill) : null,
          other_bill_label: form.other_bill_label || null,
          advance_deposit: form.advance_deposit || null,
          rent_inclusive: form.rent_inclusive ?? false,
          university_priority: form.university_priority || null,
          washroom_sharing: form.washroom_sharing ? Number(form.washroom_sharing) : null,
          meal_available: form.meal_available ?? false,
          house_rules: form.house_rules ?? [],
          landmarks: form.landmarks ?? [],
        })
        .eq('id', roomId)

      if (updateError) { toast.error(updateError.message || 'Failed to save'); return }

      toast.success('Listing updated!')
      router.push(`/listings/${roomId}`)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save changes'
      toast.error(message)
    } finally {
      setSaving(false)
    }
  }

  if (loading || !form) {
    return (
      <div className="mx-auto max-w-lg px-4 py-10 animate-pulse">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="mb-3 h-12 rounded-xl bg-gray-100 dark:bg-gray-800" />
        ))}
      </div>
    )
  }

  const shared = isSharedRoom(form.type as RoomType)
  const totalAdditional =
    (Number(form.electricity_bill) || 0) +
    (Number(form.maid_bill) || 0) +
    (Number(form.other_bill) || 0)

  const visibleExisting = existingImages.filter((u) => !removedImages.includes(u))
  const totalImages = visibleExisting.length + newFiles.length

  return (
    <main className="mx-auto max-w-lg px-4 py-8">
      <div className="mb-6 flex items-center gap-3">
        <button onClick={() => router.push(`/listings/${roomId}`)} className="text-sm text-gray-400 hover:text-gray-700 dark:hover:text-gray-300">← Cancel</button>
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Edit Listing</h1>
      </div>

      <div className="flex flex-col gap-4">

        <div>
          <label className="mb-1 block text-xs text-gray-500 dark:text-gray-400">Title *</label>
          <input
            className={inputCls}
            value={form.title ?? ''}
            maxLength={100}
            onChange={(e) => updateField('title', e.target.value)}
          />
          <p className="mt-1 text-right text-xs text-gray-400">{(form.title ?? '').length}/100</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs text-gray-500 dark:text-gray-400">Room Type</label>
            <select className={inputCls} value={form.type ?? 'mess'} onChange={(e) => updateField('type', e.target.value)}>
              <option value="mess">Mess</option>
              <option value="bachelor">Bachelor</option>
              <option value="sublet">Sublet</option>
              <option value="single">Single Room</option>
              <option value="master_bedroom">Master Bedroom</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs text-gray-500 dark:text-gray-400">For</label>
            <select className={inputCls} value={form.gender_type ?? 'male'} onChange={(e) => updateField('gender_type', e.target.value)}>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="any">Any</option>
            </select>
          </div>
        </div>

        {/* Pricing */}
        <div className="rounded-2xl border border-teal-100 bg-teal-50 p-4 dark:border-teal-800 dark:bg-teal-900/20">
          <p className="mb-3 flex items-center gap-1.5 text-xs font-semibold text-teal-700 dark:text-teal-400"><Tag className="h-3.5 w-3.5" /> Pricing</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs text-gray-500 dark:text-gray-400">
                {shared ? 'Rent per Seat *' : 'Total Rent *'} (৳/month)
              </label>
              <input type="number" className={inputCls} value={form.rent ?? ''} onChange={(e) => updateField('rent', e.target.value)} />
            </div>
            <div>
              <label className="mb-1 block text-xs text-gray-500 dark:text-gray-400">Total Seats</label>
              <input
                type="number" min={1}
                disabled={!shared}
                className={`${inputCls} ${!shared ? 'cursor-not-allowed opacity-60' : ''}`}
                value={shared ? (form.total_seats ?? 1) as number | string : 1}
                onChange={(e) => updateField('total_seats', e.target.value)}
              />
            </div>
          </div>
        </div>

        {shared && (
          <div>
            <label className="mb-1 block text-xs text-gray-500 dark:text-gray-400">Available Seats</label>
            <input
              type="number" min={0}
              className={inputCls}
              value={(form.available_seats ?? 0) as number | string}
              onChange={(e) => updateField('available_seats', e.target.value)}
            />
          </div>
        )}

        {/* Advance Deposit + Rent Inclusive */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs text-gray-500 dark:text-gray-400">Advance Deposit (৳)</label>
            <input type="number" placeholder="e.g. 10000" className={inputCls}
              value={form.advance_deposit ?? ''} onChange={(e) => updateField('advance_deposit', e.target.value)} />
          </div>
          <div>
            <label className="mb-1 block text-xs text-gray-500 dark:text-gray-400">University Priority</label>
            <input placeholder="e.g. AIUB, NSU" className={inputCls}
              value={form.university_priority ?? ''} onChange={(e) => updateField('university_priority', e.target.value)} />
          </div>
        </div>

        <div className="flex items-center justify-between rounded-xl border border-gray-200 px-4 py-3 dark:border-gray-700">
          <div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Utilities included in rent?</p>
            <p className="text-xs text-gray-400">Water, gas, electricity etc.</p>
          </div>
          <button
            type="button"
            onClick={() => updateField('rent_inclusive', !form.rent_inclusive)}
            className={`relative h-6 w-11 rounded-full transition-colors ${form.rent_inclusive ? 'bg-teal-600' : 'bg-gray-200 dark:bg-gray-700'}`}
          >
            <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${form.rent_inclusive ? 'translate-x-5' : 'translate-x-0.5'}`} />
          </button>
        </div>

        {/* Additional costs */}
        <div>
          <label className="mb-2 block text-xs font-medium text-gray-600 dark:text-gray-400">
            Additional Monthly Costs <span className="font-normal text-gray-400">(optional)</span>
          </label>
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 shrink-0 text-gray-400" />
              <input type="number" placeholder="Electricity bill (৳)" className={`flex-1 ${inputCls}`}
                value={form.electricity_bill ?? ''} onChange={(e) => updateField('electricity_bill', e.target.value)} />
            </div>
            <div className="flex items-center gap-2">
              <Shirt className="h-4 w-4 shrink-0 text-gray-400" />
              <input type="number" placeholder="Maid/বুয়া bill (৳)" className={`flex-1 ${inputCls}`}
                value={form.maid_bill ?? ''} onChange={(e) => updateField('maid_bill', e.target.value)} />
            </div>
            <div className="flex items-center gap-2">
              <Plus className="h-4 w-4 shrink-0 text-gray-400" />
              <input type="number" placeholder="Other cost (৳)" className={`w-28 ${inputCls}`}
                value={form.other_bill ?? ''} onChange={(e) => updateField('other_bill', e.target.value)} />
              <input placeholder="Label (e.g. Internet)" className={`flex-1 ${inputCls}`}
                value={form.other_bill_label ?? ''} onChange={(e) => updateField('other_bill_label', e.target.value)} />
            </div>
          </div>
          {form.rent && totalAdditional > 0 && (
            <p className="mt-2 rounded-xl bg-gray-50 px-3 py-2 text-xs text-gray-600 dark:bg-gray-800 dark:text-gray-400">
              Total per {shared ? 'seat' : 'room'}: ৳{(Number(form.rent) + totalAdditional).toLocaleString('en-US')}/month
            </p>
          )}
        </div>

        <div>
          <label className="mb-1 block text-xs text-gray-500 dark:text-gray-400">Location *</label>
          <input className={inputCls} value={form.location_name ?? ''} onChange={(e) => updateField('location_name', e.target.value)} />
        </div>

        {/* Map */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <label className="text-xs text-gray-500 dark:text-gray-400">
              Map Location {form.latitude && form.longitude && <span className="text-green-600">✓ Set</span>}
            </label>
            <button type="button" onClick={() => setShowMap((p) => !p)} className="text-xs text-teal-600 hover:text-teal-700">
              {showMap ? 'Hide Map' : 'Pick on Map'}
            </button>
          </div>
          {showMap && (
            <div className="overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-700">
              <LocationPicker
                latitude={form.latitude ? Number(form.latitude) : null}
                longitude={form.longitude ? Number(form.longitude) : null}
                onChange={(lat, lng) => { updateField('latitude', lat); updateField('longitude', lng) }}
              />
            </div>
          )}
          {form.latitude && form.longitude && (
            <p className="mt-1.5 text-xs text-gray-400">
              📍 {Number(form.latitude).toFixed(5)}, {Number(form.longitude).toFixed(5)}
              <button type="button" onClick={() => { updateField('latitude', null); updateField('longitude', null) }}
                className="ml-2 text-red-400 hover:text-red-600">Remove</button>
            </p>
          )}
        </div>

        <div>
          <label className="mb-1 block text-xs text-gray-500 dark:text-gray-400">Available From</label>
          <input type="date" className={inputCls}
            value={form.available_from?.split('T')[0] ?? ''}
            onChange={(e) => updateField('available_from', e.target.value)} />
        </div>

        <div>
          <label className="mb-1 block text-xs text-gray-500 dark:text-gray-400">Current Status</label>
          <select className={inputCls} value={form.status ?? 'open'} onChange={(e) => updateField('status', e.target.value)}>
            <option value="open">Open</option>
            <option value="partial">Partially Available</option>
            <option value="booked">Fully Booked</option>
            <option value="closed">Closed</option>
          </select>
        </div>

        {/* Facilities */}
        <div>
          <label className="mb-2 block text-xs font-medium text-gray-600 dark:text-gray-400">Facilities</label>
          <div className="grid grid-cols-3 gap-2">
            {AMENITIES.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => updateField(item.key, !form[item.key])}
                className={`flex flex-col items-center gap-2 rounded-xl border p-4 transition-colors ${
                  form[item.key]
                    ? 'border-teal-500 bg-teal-50 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400'
                    : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400'
                }`}
              >
                <item.Icon className="h-6 w-6" strokeWidth={1.5} />
                <span className="text-xs font-medium">{item.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Washroom sharing — shown when Attached Bath is selected */}
        {Boolean(form.attached_bath) && (
          <div>
            <label className="mb-1 block text-xs text-gray-500 dark:text-gray-400">Washroom shared with how many people?</label>
            <select className={inputCls} value={form.washroom_sharing ?? ''} onChange={(e) => updateField('washroom_sharing', e.target.value)}>
              <option value="">Select</option>
              <option value="1">Private (1 person)</option>
              <option value="2">2 people</option>
              <option value="3">3 people</option>
              <option value="4">4 people</option>
              <option value="5">5+ people</option>
            </select>
          </div>
        )}

        {/* Meal System — mess only */}
        {form.type === 'mess' && (
          <div className="flex items-center justify-between rounded-xl border border-gray-200 px-4 py-3 dark:border-gray-700">
            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Meal system available?</p>
              <p className="text-xs text-gray-400">Breakfast / lunch / dinner provided</p>
            </div>
            <button
              type="button"
              onClick={() => updateField('meal_available', !form.meal_available)}
              className={`relative h-6 w-11 rounded-full transition-colors ${form.meal_available ? 'bg-teal-600' : 'bg-gray-200 dark:bg-gray-700'}`}
            >
              <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${form.meal_available ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </button>
          </div>
        )}

        {/* House Rules */}
        <div>
          <label className="mb-2 block text-xs font-medium text-gray-600 dark:text-gray-400">House Rules <span className="font-normal text-gray-400">(optional)</span></label>
          <div className="flex flex-wrap gap-2">
            {HOUSE_RULES.map((rule) => {
              const active = (form.house_rules ?? []).includes(rule)
              return (
                <button
                  key={rule}
                  type="button"
                  onClick={() => updateField('house_rules', active
                    ? (form.house_rules ?? []).filter((r: string) => r !== rule)
                    : [...(form.house_rules ?? []), rule]
                  )}
                  className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${active ? 'border-red-400 bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400' : 'border-gray-200 text-gray-500 hover:border-gray-300 dark:border-gray-700 dark:text-gray-400'}`}
                >
                  {active ? '✓ ' : ''}{rule}
                </button>
              )
            })}
          </div>
        </div>

        {/* Nearby Landmarks */}
        <div>
          <label className="mb-2 block text-xs font-medium text-gray-600 dark:text-gray-400">Nearby Landmarks <span className="font-normal text-gray-400">(optional)</span></label>
          <div className="flex flex-col gap-2">
            {(form.landmarks ?? []).map((lm: Landmark, idx: number) => (
              <div key={idx} className="flex items-center gap-2">
                <input
                  placeholder="e.g. AIUB main gate"
                  className={`flex-1 ${inputCls}`}
                  value={lm.name}
                  onChange={(e) => {
                    const updated = [...(form.landmarks ?? [])]
                    updated[idx] = { ...updated[idx], name: e.target.value }
                    updateField('landmarks', updated)
                  }}
                />
                <input
                  placeholder="e.g. 5 min"
                  className={`w-24 ${inputCls}`}
                  value={lm.time}
                  onChange={(e) => {
                    const updated = [...(form.landmarks ?? [])]
                    updated[idx] = { ...updated[idx], time: e.target.value }
                    updateField('landmarks', updated)
                  }}
                />
                <button
                  type="button"
                  onClick={() => updateField('landmarks', (form.landmarks ?? []).filter((_: Landmark, i: number) => i !== idx))}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-gray-200 text-gray-400 hover:border-red-300 hover:text-red-500 dark:border-gray-700"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => updateField('landmarks', [...(form.landmarks ?? []), { name: '', time: '' }])}
              className="flex items-center gap-2 rounded-xl border border-dashed border-gray-300 px-3 py-2 text-xs text-gray-500 hover:border-teal-400 hover:text-teal-600 dark:border-gray-700"
            >
              <Plus className="h-3.5 w-3.5" /> Add landmark
            </button>
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs text-gray-500 dark:text-gray-400">Description</label>
          <textarea
            rows={4}
            className={`resize-none ${inputCls}`}
            value={form.description ?? ''}
            maxLength={1000}
            onChange={(e) => updateField('description', e.target.value)}
          />
          <p className={`mt-1 text-right text-xs ${(form.description ?? '').length >= 950 ? 'text-orange-500' : 'text-gray-400'}`}>
            {(form.description ?? '').length}/1000
          </p>
        </div>

        {/* Images */}
        <div>
          <label className="mb-2 block text-xs text-gray-500 dark:text-gray-400">
            Room Photos ({totalImages}/4)
          </label>

          {visibleExisting.length > 0 && (
            <div className="mb-3 grid grid-cols-4 gap-2">
              {visibleExisting.map((url) => (
                <div key={url} className="relative aspect-square overflow-hidden rounded-xl bg-gray-100">
                  <Image src={url} alt="Room" fill className="object-cover" />
                  <button
                    type="button"
                    onClick={() => setRemovedImages((prev) => [...prev, url])}
                    className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-white text-xs text-red-500 shadow"
                  >×</button>
                </div>
              ))}
            </div>
          )}

          {newPreviews.length > 0 && (
            <div className="mb-3 grid grid-cols-4 gap-2">
              {newPreviews.map((src, index) => (
                <div key={src} className="relative aspect-square overflow-hidden rounded-xl bg-gray-100">
                  <Image src={src} alt={`New ${index + 1}`} fill className="object-cover" />
                  <span className="absolute left-1 top-1 rounded bg-teal-600 px-1 text-[9px] text-white">New</span>
                  <button type="button" onClick={() => removeNew(index)}
                    className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-white text-xs text-red-500 shadow">×</button>
                </div>
              ))}
            </div>
          )}

          {totalImages < 4 && (
            <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-200 px-4 py-5 text-center hover:border-teal-400 hover:bg-teal-50 dark:border-gray-700 dark:hover:bg-teal-900/10">
              <Camera className="h-6 w-6 text-gray-400" />
              <span className="mt-1 text-xs font-medium text-gray-600 dark:text-gray-300">
                Add photos ({4 - totalImages} remaining)
              </span>
              <input type="file" accept="image/*" multiple className="hidden" onChange={handleNewImages} />
            </label>
          )}
        </div>

        <div className="flex gap-3 pt-2">
          <button
            onClick={() => router.push(`/listings/${roomId}`)}
            className="flex-1 rounded-xl border border-gray-200 py-3 text-sm text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 rounded-xl bg-teal-600 py-3 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </main>
  )
}
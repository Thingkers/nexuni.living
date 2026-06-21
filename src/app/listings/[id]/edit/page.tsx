'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { supabase } from '@/lib/supabase'
import { isSharedRoom } from '@/features/rooms/types/room.types'

const LocationPicker = dynamic(
  () => import('@/features/map/components/LocationPicker'),
  { ssr: false },
)

const AMENITIES = [
  { key: 'wifi',          icon: '📶', label: 'WiFi' },
  { key: 'electricity',   icon: '💡', label: 'Electricity' },
  { key: 'gas',           icon: '🔥', label: 'Gas' },
  { key: 'ac',            icon: '❄️', label: 'AC' },
  { key: 'attached_bath', icon: '🚿', label: 'Attached Bath' },
  { key: 'study_table',   icon: '📚', label: 'Study Table' },
  { key: 'parking',       icon: '🅿️', label: 'Parking' },
  { key: 'laundry',       icon: '👕', label: 'Laundry' },
  { key: 'cctv',          icon: '📷', label: 'CCTV' },
]

const inputCls = 'w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100'

export default function EditListingPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const roomId = params.id

  const [form, setForm] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [imageFiles, setImageFiles] = useState<File[]>([])
  const [imagePreviews, setImagePreviews] = useState<string[]>([])
  const [showMap, setShowMap] = useState(false)

  useEffect(() => {
    async function loadRoom() {
      const [{ data: room, error: roomError }, { data: auth }] =
        await Promise.all([
          supabase.from('rooms').select('*').eq('id', roomId).single(),
          supabase.auth.getUser(),
        ])

      if (roomError || !room) { router.push('/listings'); return }
      if (!auth.user || room.owner_id !== auth.user.id) { router.push(`/listings/${roomId}`); return }

      setForm(room)
      setLoading(false)
    }

    if (roomId) loadRoom()
  }, [roomId, router])

  function updateField(key: string, value: any) {
    setForm((prev: any) => ({ ...prev, [key]: value }))
  }

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []).slice(0, 4)
    setImageFiles(files)
    setImagePreviews(files.map((f) => URL.createObjectURL(f)))
  }

  function removeImage(index: number) {
    setImageFiles((prev) => prev.filter((_, i) => i !== index))
    setImagePreviews((prev) => prev.filter((_, i) => i !== index))
  }

  async function uploadImages(id: string) {
    const urls: string[] = []
    for (const file of imageFiles) {
      const ext = file.name.split('.').pop()
      const path = `${id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
      const { error } = await supabase.storage.from('room-images').upload(path, file)
      if (error) throw error
      const { data } = supabase.storage.from('room-images').getPublicUrl(path)
      urls.push(data.publicUrl)
    }
    return urls
  }

  async function handleSave() {
    if (!form.title?.trim() || !form.rent || !form.location_name?.trim()) {
      setError('Title, rent and location are required')
      return
    }

    setSaving(true)
    setError('')

    try {
      let uploadedImages = form.images ?? []
      if (imageFiles.length > 0) uploadedImages = await uploadImages(roomId)

      const totalSeats = Number(form.total_seats)
      const availableSeats = Math.min(Number(form.available_seats), totalSeats)

      const { error: updateError } = await supabase
        .from('rooms')
        .update({
          title: form.title,
          type: form.type,
          gender_type: form.gender_type,
          rent: Number(form.rent),
          total_seats: totalSeats,
          available_seats: availableSeats,
          location_name: form.location_name,
          latitude: form.latitude ? Number(form.latitude) : null,
          longitude: form.longitude ? Number(form.longitude) : null,
          available_from: form.available_from,
          description: form.description,
          status: form.status,
          images: uploadedImages,
          // amenities
          wifi: form.wifi ?? false,
          gas: form.gas ?? false,
          electricity: form.electricity ?? false,
          ac: form.ac ?? false,
          attached_bath: form.attached_bath ?? false,
          study_table: form.study_table ?? false,
          parking: form.parking ?? false,
          laundry: form.laundry ?? false,
          cctv: form.cctv ?? false,
          // additional costs
          electricity_bill: form.electricity_bill ? Number(form.electricity_bill) : null,
          maid_bill: form.maid_bill ? Number(form.maid_bill) : null,
          other_bill: form.other_bill ? Number(form.other_bill) : null,
          other_bill_label: form.other_bill_label || null,
        })
        .eq('id', roomId)

      if (updateError) { setError(updateError.message || 'Failed to save'); return }

      router.push(`/listings/${roomId}`)
    } catch (err: any) {
      setError(err.message || 'Failed to save changes')
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

  const shared = isSharedRoom(form.type)
  const totalAdditional =
    (Number(form.electricity_bill) || 0) +
    (Number(form.maid_bill) || 0) +
    (Number(form.other_bill) || 0)

  return (
    <main className="mx-auto max-w-lg px-4 py-8">
      <h1 className="mb-6 text-2xl font-semibold text-gray-900 dark:text-white">Edit Listing</h1>

      {error && (
        <div className="mb-4 rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
          {error}
        </div>
      )}

      <div className="flex flex-col gap-4">

        <div>
          <label className="mb-1 block text-xs text-gray-500 dark:text-gray-400">Title *</label>
          <input className={inputCls} value={form.title ?? ''} onChange={(e) => updateField('title', e.target.value)} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs text-gray-500 dark:text-gray-400">Room Type</label>
            <select className={inputCls} value={form.type ?? 'mess'} onChange={(e) => updateField('type', e.target.value)}>
              <option value="mess">🍳 Mess</option>
              <option value="bachelor">🛋 Bachelor</option>
              <option value="sublet">🔑 Sublet</option>
              <option value="single">🛏 Single Room</option>
              <option value="master_bedroom">🏠 Master Bedroom</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs text-gray-500 dark:text-gray-400">For</label>
            <select className={inputCls} value={form.gender_type ?? 'male'} onChange={(e) => updateField('gender_type', e.target.value)}>
              <option value="male">👨 Male</option>
              <option value="female">👩 Female</option>
              <option value="any">👥 Any</option>
            </select>
          </div>
        </div>

        {/* Pricing */}
        <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900/20">
          <p className="mb-3 text-xs font-semibold text-blue-700 dark:text-blue-400">💰 Pricing</p>
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
                type="number"
                min={1}
                disabled={!shared}
                className={`${inputCls} ${!shared ? 'cursor-not-allowed opacity-60' : ''}`}
                value={shared ? (form.total_seats ?? 1) : 1}
                onChange={(e) => updateField('total_seats', e.target.value)}
              />
            </div>
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs text-gray-500 dark:text-gray-400">Available Seats</label>
          <input
            type="number" min={0}
            className={inputCls}
            value={form.available_seats ?? 0}
            onChange={(e) => updateField('available_seats', e.target.value)}
          />
        </div>

        {/* Additional costs */}
        <div>
          <label className="mb-2 block text-xs font-medium text-gray-600 dark:text-gray-400">
            Additional Monthly Costs <span className="font-normal text-gray-400">(optional)</span>
          </label>
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <span className="w-5 text-center">💡</span>
              <input type="number" placeholder="Electricity bill (৳)" className={`flex-1 ${inputCls}`}
                value={form.electricity_bill ?? ''} onChange={(e) => updateField('electricity_bill', e.target.value)} />
            </div>
            <div className="flex items-center gap-2">
              <span className="w-5 text-center">🧹</span>
              <input type="number" placeholder="Maid/বুয়া bill (৳)" className={`flex-1 ${inputCls}`}
                value={form.maid_bill ?? ''} onChange={(e) => updateField('maid_bill', e.target.value)} />
            </div>
            <div className="flex items-center gap-2">
              <span className="w-5 text-center">➕</span>
              <input type="number" placeholder="Other cost (৳)" className={`w-28 ${inputCls}`}
                value={form.other_bill ?? ''} onChange={(e) => updateField('other_bill', e.target.value)} />
              <input placeholder="Label (e.g. Internet)" className={`flex-1 ${inputCls}`}
                value={form.other_bill_label ?? ''} onChange={(e) => updateField('other_bill_label', e.target.value)} />
            </div>
          </div>
          {form.rent && totalAdditional > 0 && (
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
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
            <button type="button" onClick={() => setShowMap((p) => !p)} className="text-xs text-blue-600 hover:text-blue-700">
              {showMap ? 'Hide Map' : 'Pick on Map'}
            </button>
          </div>
          {showMap && (
            <div className="overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-700">
              <LocationPicker
                latitude={form.latitude ?? null}
                longitude={form.longitude ?? null}
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
            <option value="booked">Booked</option>
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
                className={`flex flex-col items-center gap-1 rounded-xl border p-3 text-sm transition-colors ${
                  form[item.key]
                    ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                    : 'border-gray-200 text-gray-400 dark:border-gray-700 dark:text-gray-500'
                }`}
              >
                <span className="text-xl">{item.icon}</span>
                <span className="text-xs">{item.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs text-gray-500 dark:text-gray-400">Description</label>
          <textarea rows={4} className={`resize-none ${inputCls}`}
            value={form.description ?? ''}
            onChange={(e) => updateField('description', e.target.value)} />
        </div>

        {/* Images */}
        <div>
          <label className="mb-2 block text-xs text-gray-500 dark:text-gray-400">Replace Images</label>
          <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-200 px-4 py-6 text-center hover:border-blue-400 hover:bg-blue-50 dark:border-gray-700 dark:hover:bg-blue-900/10">
            <span className="mb-1 text-3xl">📷</span>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Upload new images</span>
            <span className="mt-1 text-xs text-gray-400">Selecting new images will replace old ones</span>
            <input type="file" accept="image/*" multiple className="hidden" onChange={handleImageChange} />
          </label>

          {imagePreviews.length > 0 ? (
            <div className="mt-3 grid grid-cols-4 gap-2">
              {imagePreviews.map((preview, index) => (
                <div key={preview} className="relative aspect-square overflow-hidden rounded-xl bg-gray-100">
                  <img src={preview} alt={`Preview ${index + 1}`} className="h-full w-full object-cover" />
                  <button type="button" onClick={() => removeImage(index)}
                    className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-white text-xs text-red-500 shadow">×</button>
                </div>
              ))}
            </div>
          ) : form.images?.length > 0 ? (
            <div className="mt-3 grid grid-cols-4 gap-2">
              {form.images.map((image: string) => (
                <div key={image} className="relative aspect-square overflow-hidden rounded-xl bg-gray-100">
                  <img src={image} alt="Room" className="h-full w-full object-cover" />
                </div>
              ))}
            </div>
          ) : null}
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
            className="flex-1 rounded-xl bg-blue-600 py-3 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </main>
  )
}

'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'

import { supabase } from '@/lib/supabase'

const LocationPicker = dynamic(
  () => import('@/features/map/components/LocationPicker'),
  { ssr: false },
)

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

      if (roomError || !room) {
        router.push('/listings')
        return
      }

      if (!auth.user || room.owner_id !== auth.user.id) {
        router.push(`/listings/${roomId}`)
        return
      }

      setForm(room)
      setLoading(false)
    }

    if (roomId) loadRoom()
  }, [roomId, router])

  function updateField(key: string, value: any) {
    setForm((prev: any) => ({ ...prev, [key]: value }))
  }

  function handleImageChange(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []).slice(0, 4)
    setImageFiles(files)
    setImagePreviews(files.map((file) => URL.createObjectURL(file)))
  }

  function removeImage(index: number) {
    setImageFiles((prev) => prev.filter((_, i) => i !== index))
    setImagePreviews((prev) => prev.filter((_, i) => i !== index))
  }

  async function uploadImages(roomId: string) {
    const imageUrls: string[] = []

    for (const file of imageFiles) {
      const fileExt = file.name.split('.').pop()
      const fileName = `${roomId}/${Date.now()}-${Math.random()
        .toString(36)
        .slice(2)}.${fileExt}`

      const { error: uploadError } = await supabase.storage
        .from('room-images')
        .upload(fileName, file)

      if (uploadError) throw uploadError

      const { data } = supabase.storage
        .from('room-images')
        .getPublicUrl(fileName)

      imageUrls.push(data.publicUrl)
    }

    return imageUrls
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

      if (imageFiles.length > 0) {
        uploadedImages = await uploadImages(roomId)
      }

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
          wifi: form.wifi,
          gas: form.gas,
          electricity: form.electricity,
          description: form.description,
          status: form.status,
          images: uploadedImages,
        })
        .eq('id', roomId)

      if (updateError) {
        setError(updateError.message || 'Failed to save changes')
        return
      }

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
        {[...Array(8)].map((_, index) => (
          <div key={index} className="mb-3 h-12 rounded-xl bg-gray-100" />
        ))}
      </div>
    )
  }

  const inputClass =
    'w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-blue-500'

  return (
    <main className="mx-auto max-w-lg px-4 py-8">
      <h1 className="mb-6 text-2xl font-semibold text-gray-900">
        Edit Listing
      </h1>

      {error && (
        <div className="mb-4 rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-600">
          {error}
        </div>
      )}

      <div className="flex flex-col gap-4">
        <div>
          <label className="mb-1 block text-xs text-gray-500">Title *</label>
          <input
            className={inputClass}
            value={form.title ?? ''}
            onChange={(e) => updateField('title', e.target.value)}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs text-gray-500">Type</label>
            <select
              className={inputClass}
              value={form.type ?? 'mess'}
              onChange={(e) => updateField('type', e.target.value)}
            >
              <option value="mess">Mess</option>
              <option value="bachelor">Bachelor</option>
              <option value="sublet">Sublet</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs text-gray-500">For</label>
            <select
              className={inputClass}
              value={form.gender_type ?? 'male'}
              onChange={(e) => updateField('gender_type', e.target.value)}
            >
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="any">Any</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs text-gray-500">Monthly Rent *</label>
            <input
              type="number"
              className={inputClass}
              value={form.rent ?? ''}
              onChange={(e) => updateField('rent', e.target.value)}
            />
          </div>

          <div>
            <label className="mb-1 block text-xs text-gray-500">Total Seats</label>
            <input
              type="number"
              min={1}
              className={inputClass}
              value={form.total_seats ?? 1}
              onChange={(e) => updateField('total_seats', e.target.value)}
            />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs text-gray-500">Available Seats</label>
          <input
            type="number"
            min={0}
            className={inputClass}
            value={form.available_seats ?? 0}
            onChange={(e) => updateField('available_seats', e.target.value)}
          />
        </div>

        <div>
          <label className="mb-1 block text-xs text-gray-500">Location *</label>
          <input
            className={inputClass}
            value={form.location_name ?? ''}
            onChange={(e) => updateField('location_name', e.target.value)}
          />
        </div>

        {/* MAP LOCATION PICKER */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <label className="text-xs text-gray-500">
              Map Location{' '}
              {form.latitude && form.longitude && (
                <span className="ml-1 text-green-600">✓ Set</span>
              )}
            </label>
            <button
              type="button"
              onClick={() => setShowMap((prev) => !prev)}
              className="text-xs text-blue-600 hover:text-blue-700"
            >
              {showMap ? 'Hide Map' : 'Pick on Map'}
            </button>
          </div>

          {showMap && (
            <div className="rounded-2xl overflow-hidden border border-gray-200">
              <LocationPicker
                latitude={form.latitude ?? null}
                longitude={form.longitude ?? null}
                onChange={(lat, lng) => {
                  updateField('latitude', lat)
                  updateField('longitude', lng)
                }}
              />
            </div>
          )}

          {form.latitude && form.longitude && (
            <p className="mt-1.5 text-xs text-gray-400">
              📍 {Number(form.latitude).toFixed(5)}, {Number(form.longitude).toFixed(5)}
              <button
                type="button"
                onClick={() => {
                  updateField('latitude', null)
                  updateField('longitude', null)
                }}
                className="ml-2 text-red-400 hover:text-red-600"
              >
                Remove
              </button>
            </p>
          )}
        </div>

        <div>
          <label className="mb-1 block text-xs text-gray-500">Available From</label>
          <input
            type="date"
            className={inputClass}
            value={form.available_from?.split('T')[0] ?? ''}
            onChange={(e) => updateField('available_from', e.target.value)}
          />
        </div>

        <div>
          <label className="mb-1 block text-xs text-gray-500">Current Status</label>
          <select
            className={inputClass}
            value={form.status ?? 'open'}
            onChange={(e) => updateField('status', e.target.value)}
          >
            <option value="open">Open</option>
            <option value="partial">Partially Available</option>
            <option value="booked">Booked</option>
            <option value="closed">Closed</option>
          </select>
        </div>

        <div>
          <label className="mb-2 block text-xs text-gray-500">Amenities</label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { key: 'wifi', icon: '📶', label: 'WiFi' },
              { key: 'gas', icon: '🔥', label: 'Gas' },
              { key: 'electricity', icon: '💡', label: 'Electricity' },
            ].map((amenity) => (
              <button
                key={amenity.key}
                type="button"
                onClick={() => updateField(amenity.key, !form[amenity.key])}
                className={`flex flex-col items-center gap-1 rounded-xl border p-3 text-sm transition-colors ${
                  form[amenity.key]
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-200 text-gray-400'
                }`}
              >
                <span className="text-xl">{amenity.icon}</span>
                <span className="text-xs">{amenity.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs text-gray-500">Description</label>
          <textarea
            rows={4}
            className="w-full resize-none rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-blue-500"
            value={form.description ?? ''}
            onChange={(e) => updateField('description', e.target.value)}
          />
        </div>

        <div>
          <label className="mb-2 block text-xs text-gray-500">Replace Images</label>

          <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-200 px-4 py-6 text-center hover:border-blue-400 hover:bg-blue-50">
            <span className="mb-1 text-3xl">📷</span>
            <span className="text-sm font-medium text-gray-700">Upload new images</span>
            <span className="mt-1 text-xs text-gray-400">
              Selecting new images will replace old images
            </span>
            <input
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleImageChange}
            />
          </label>

          {imagePreviews.length > 0 ? (
            <div className="mt-3 grid grid-cols-4 gap-2">
              {imagePreviews.map((preview, index) => (
                <div key={preview} className="relative aspect-square overflow-hidden rounded-xl bg-gray-100">
                  <img src={preview} alt={`Preview ${index + 1}`} className="h-full w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removeImage(index)}
                    className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-white text-xs text-red-500 shadow"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          ) : form.images?.length > 0 ? (
            <div className="mt-3 grid grid-cols-4 gap-2">
              {form.images.map((image: string) => (
                <div key={image} className="relative aspect-square overflow-hidden rounded-xl bg-gray-100">
                  <img src={image} alt="Current room" className="h-full w-full object-cover" />
                </div>
              ))}
            </div>
          ) : null}
        </div>

        <div className="flex gap-3 pt-2">
          <button
            onClick={() => router.push(`/listings/${roomId}`)}
            className="flex-1 rounded-xl border border-gray-200 py-3 text-sm text-gray-600 hover:bg-gray-50"
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

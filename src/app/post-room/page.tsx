'use client'

import dynamic from 'next/dynamic'
import { toast } from 'sonner'
import { useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'

import { supabase } from '@/lib/supabase'

const LocationPicker = dynamic(
  () => import('@/features/map/components/LocationPicker'),
  { ssr: false },
)

const INITIAL_FORM = {
  title: '',
  type: 'mess',
  gender_type: 'male',
  rent: '',
  total_seats: '1',
  location_name: '',
  available_from: '',
  wifi: false,
  gas: false,
  electricity: false,
  description: '',
  latitude: '',
  longitude: '',
}

export default function PostRoomPage() {
  const router = useRouter()

  const [form, setForm] = useState(INITIAL_FORM)
  const [userId, setUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [step, setStep] = useState(1)

  const [images, setImages] = useState<File[]>([])
  const [previews, setPreviews] = useState<string[]>([])
  const [findingLocation, setFindingLocation] = useState(false)

  useEffect(() => {
    async function checkUser() {
      const { data } = await supabase.auth.getUser()

      if (!data.user) {
        router.push('/auth/login')
        return
      }

      setUserId(data.user.id)
    }

    checkUser()
  }, [router])

  useEffect(() => {
    return () => {
      previews.forEach((url) => URL.revokeObjectURL(url))
    }
  }, [previews])

  function updateField(key: string, value: any) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function handleImageChange(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []).slice(0, 4)

    previews.forEach((url) => URL.revokeObjectURL(url))

    setImages(files)
    setPreviews(files.map((file) => URL.createObjectURL(file)))
  }

  function removeImage(index: number) {
    URL.revokeObjectURL(previews[index])

    setImages((prev) =>
      prev.filter((_, currentIndex) => currentIndex !== index),
    )
    setPreviews((prev) =>
      prev.filter((_, currentIndex) => currentIndex !== index),
    )
  }

  async function findLocationOnMap() {
    if (!form.location_name.trim()) {
      setErrors((prev) => ({
        ...prev,
        location_name: 'Please enter a location first',
      }))
      return
    }

    setFindingLocation(true)

    try {
      const searchQuery = `${form.location_name}, Bangladesh`

      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          searchQuery,
        )}&limit=1`,
      )

      const results = await response.json()

      if (!results || results.length === 0) {
        toast.error('Location not found. Try a more specific address.')
        return
      }

      const lat = results[0].lat
      const lng = results[0].lon

      updateField('latitude', lat)
      updateField('longitude', lng)
      toast.success('Location found on map')
    } catch {
      toast.error('Failed to find location. Please try again.')
    } finally {
      setFindingLocation(false)
    }
  }

  function validateStepOne() {
    const nextErrors: Record<string, string> = {}

    if (!form.title.trim()) nextErrors.title = 'Title is required'
    if (!form.rent) nextErrors.rent = 'Rent is required'
    if (!form.location_name.trim()) {
      nextErrors.location_name = 'Location is required'
    }
    if (!form.available_from) {
      nextErrors.available_from = 'Available date is required'
    }

    setErrors(nextErrors)

    return Object.keys(nextErrors).length === 0
  }

  async function uploadRoomImages(roomId: string) {
    const uploadedUrls: string[] = []

    for (const image of images) {
      const fileExtension = image.name.split('.').pop()
      const fileName = `${crypto.randomUUID()}.${fileExtension}`
      const filePath = `${roomId}/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('room-images')
        .upload(filePath, image)

      if (uploadError) {
        throw new Error(uploadError.message)
      }

      const { data } = supabase.storage
        .from('room-images')
        .getPublicUrl(filePath)

      uploadedUrls.push(data.publicUrl)
    }

    return uploadedUrls
  }

  async function handleSubmit() {
    if (!userId) {
      router.push('/auth/login')
      return
    }

    setLoading(true)

    const { data: room, error } = await supabase
      .from('rooms')
      .insert({
        title: form.title,
        type: form.type,
        gender_type: form.gender_type,
        rent: Number(form.rent),
        total_seats: Number(form.total_seats),
        available_seats: Number(form.total_seats),
        location_name: form.location_name,
        available_from: form.available_from,
        wifi: form.wifi,
        gas: form.gas,
        electricity: form.electricity,
        description: form.description,
        latitude: form.latitude ? Number(form.latitude) : null,
        longitude: form.longitude ? Number(form.longitude) : null,
        owner_id: userId,
        status: 'open',
        images: [],
      })
      .select()
      .single()

    if (error || !room) {
      setLoading(false)
      toast.error(error?.message || 'Failed to create listing')
      return
    }

    try {
      if (images.length > 0) {
        const imageUrls = await uploadRoomImages(room.id)

        const { error: updateError } = await supabase
          .from('rooms')
          .update({ images: imageUrls })
          .eq('id', room.id)

        if (updateError) {
          throw new Error(updateError.message)
        }
      }

      router.push(`/listings/${room.id}`)
    } catch (uploadError: any) {
      setLoading(false)
      toast.error(uploadError.message || 'Image upload failed')
    }
  }

  const inputClass = (key: string) =>
    `w-full rounded-xl border px-4 py-3 text-sm outline-none transition-colors ${
      errors[key]
        ? 'border-red-300 focus:border-red-500'
        : 'border-gray-200 focus:border-blue-500'
    }`

  const canSubmit = useMemo(() => !loading, [loading])

  return (
    <main className="mx-auto max-w-lg px-4 py-8">
      <h1 className="mb-1 text-2xl font-semibold text-gray-900">
        Post a Room
      </h1>

      <p className="mb-6 text-sm text-gray-400">Step {step} of 2</p>

      <div className="mb-8 h-1.5 rounded-full bg-gray-100">
        <div
          className="h-full rounded-full bg-blue-600 transition-all"
          style={{ width: step === 1 ? '50%' : '100%' }}
        />
      </div>

      {step === 1 && (
        <div className="flex flex-col gap-4">
          <div>
            <label className="mb-1 block text-xs text-gray-500">Title *</label>
            <input
              placeholder="Example: 2-seat mess room available"
              className={inputClass('title')}
              value={form.title}
              onChange={(e) => updateField('title', e.target.value)}
            />
            {errors.title && (
              <p className="mt-1 text-xs text-red-500">{errors.title}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs text-gray-500">Type *</label>
              <select
                className={inputClass('')}
                value={form.type}
                onChange={(e) => updateField('type', e.target.value)}
              >
                <option value="mess">Mess</option>
                <option value="bachelor">Bachelor</option>
                <option value="sublet">Sublet</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs text-gray-500">For *</label>
              <select
                className={inputClass('')}
                value={form.gender_type}
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
              <label className="mb-1 block text-xs text-gray-500">
                Monthly Rent *
              </label>
              <input
                type="number"
                placeholder="5000"
                className={inputClass('rent')}
                value={form.rent}
                onChange={(e) => updateField('rent', e.target.value)}
              />
              {errors.rent && (
                <p className="mt-1 text-xs text-red-500">{errors.rent}</p>
              )}
            </div>

            <div>
              <label className="mb-1 block text-xs text-gray-500">
                Total Seats *
              </label>
              <select
                className={inputClass('')}
                value={form.total_seats}
                onChange={(e) => updateField('total_seats', e.target.value)}
              >
                {[1, 2, 3, 4, 5].map((number) => (
                  <option key={number} value={number}>
                    {number}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs text-gray-500">
              Location *
            </label>

            <input
              placeholder="Example: Shahbag, Dhaka"
              className={inputClass('location_name')}
              value={form.location_name}
              onChange={(event) =>
                updateField('location_name', event.target.value)
              }
            />

            <button
              type="button"
              onClick={findLocationOnMap}
              disabled={findingLocation}
              className="mt-2 rounded-xl border border-blue-200 px-4 py-2 text-xs font-medium text-blue-600 hover:bg-blue-50 disabled:opacity-50"
            >
              {findingLocation ? 'Finding location...' : 'Find on Map'}
            </button>

            {errors.location_name && (
              <p className="mt-1 text-xs text-red-500">
                {errors.location_name}
              </p>
            )}
          </div>

          <div>
            <label className="mb-2 block text-xs text-gray-500">
              Select Location on Map
            </label>

            <LocationPicker
              latitude={form.latitude ? Number(form.latitude) : null}
              longitude={form.longitude ? Number(form.longitude) : null}
              onChange={(lat, lng) => {
                updateField('latitude', String(lat))
                updateField('longitude', String(lng))
              }}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs text-gray-500">
                Latitude
              </label>

              <input
                type="number"
                step="any"
                placeholder="23.8103"
                className={inputClass('')}
                value={form.latitude}
                onChange={(event) =>
                  updateField('latitude', event.target.value)
                }
              />
            </div>

            <div>
              <label className="mb-1 block text-xs text-gray-500">
                Longitude
              </label>

              <input
                type="number"
                step="any"
                placeholder="90.4125"
                className={inputClass('')}
                value={form.longitude}
                onChange={(event) =>
                  updateField('longitude', event.target.value)
                }
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs text-gray-500">
              Available From *
            </label>
            <input
              type="date"
              className={inputClass('available_from')}
              value={form.available_from}
              onChange={(e) => updateField('available_from', e.target.value)}
            />
            {errors.available_from && (
              <p className="mt-1 text-xs text-red-500">
                {errors.available_from}
              </p>
            )}
          </div>

          <button
            onClick={() => {
              if (validateStepOne()) setStep(2)
            }}
            className="w-full rounded-xl bg-blue-600 py-3 text-sm font-medium text-white hover:bg-blue-700"
          >
            Next Step →
          </button>
        </div>
      )}

      {step === 2 && (
        <div className="flex flex-col gap-4">
          <div>
            <label className="mb-2 block text-xs text-gray-500">
              Amenities
            </label>

            <div className="grid grid-cols-3 gap-2">
              {[
                { key: 'wifi', icon: '📶', label: 'WiFi' },
                { key: 'gas', icon: '🔥', label: 'Gas' },
                { key: 'electricity', icon: '💡', label: 'Electricity' },
              ].map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() =>
                    updateField(
                      item.key,
                      !form[item.key as keyof typeof form],
                    )
                  }
                  className={`flex flex-col items-center gap-1 rounded-xl border p-3 text-sm transition-colors ${
                    form[item.key as keyof typeof form]
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 text-gray-400'
                  }`}
                >
                  <span className="text-xl">{item.icon}</span>
                  <span className="text-xs">{item.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs text-gray-500">
              Description
            </label>
            <textarea
              rows={4}
              placeholder="Write details about the room..."
              className="w-full resize-none rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-blue-500"
              value={form.description}
              onChange={(e) => updateField('description', e.target.value)}
            />
          </div>

          <div>
            <label className="mb-2 block text-xs text-gray-500">
              Room Images
            </label>

            <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-200 p-6 text-center hover:border-blue-400 hover:bg-blue-50">
              <input
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handleImageChange}
              />
              <span className="text-3xl">📷</span>
              <span className="mt-2 text-sm font-medium text-gray-700">
                Upload up to 4 images
              </span>
              <span className="text-xs text-gray-400">JPG, PNG or WEBP</span>
            </label>

            {previews.length > 0 && (
              <div className="mt-3 grid grid-cols-4 gap-2">
                {previews.map((src, index) => (
                  <div
                    key={src}
                    className="relative aspect-square overflow-hidden rounded-xl bg-gray-100"
                  >
                    <Image
                      src={src}
                      alt={`Preview ${index + 1}`}
                      fill
                      className="object-cover"
                    />

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
            )}
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setStep(1)}
              className="flex-1 rounded-xl border border-gray-200 py-3 text-sm text-gray-600 hover:bg-gray-50"
            >
              ← Back
            </button>

            <button
              onClick={handleSubmit}
              disabled={!canSubmit}
              className="flex-1 rounded-xl bg-blue-600 py-3 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Posting...' : 'Post Room ✓'}
            </button>
          </div>
        </div>
      )}
    </main>
  )
}
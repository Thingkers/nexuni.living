'use client'

import { toast } from 'sonner'
import { useEffect, useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { compressImage } from '@/lib/compressImage'
import { supabase } from '@/lib/supabase'
import { isSharedRoom } from '@/features/rooms/types/room.types'

const INITIAL_FORM = {
  title: '',
  type: 'mess',
  gender_type: 'male',
  rent: '',
  total_seats: '2',
  location_name: '',
  available_from: '',
  description: '',
  // Amenities
  wifi: false,
  gas: false,
  electricity: false,
  ac: false,
  attached_bath: false,
  study_table: false,
  parking: false,
  laundry: false,
  cctv: false,
  // Additional costs
  electricity_bill: '',
  maid_bill: '',
  other_bill: '',
  other_bill_label: '',
}

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

const inputCls = (err?: string) =>
  `w-full rounded-xl border px-4 py-3 text-sm outline-none transition-colors bg-white dark:bg-gray-800 dark:text-gray-100 ${
    err
      ? 'border-red-300 focus:border-red-500'
      : 'border-gray-200 focus:border-teal-500 dark:border-gray-700'
  }`

export default function PostRoomPage() {
  const router = useRouter()

  const [form, setForm] = useState(INITIAL_FORM)
  const [userId, setUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [step, setStep] = useState(1)
  const [images, setImages] = useState<File[]>([])
  const [previews, setPreviews] = useState<string[]>([])

  const shared = isSharedRoom(form.type as any)

  useEffect(() => {
    async function checkUser() {
      const { data } = await supabase.auth.getUser()
      if (!data.user) { router.push('/auth/login'); return }
      setUserId(data.user.id)
    }
    checkUser()
  }, [router])

  useEffect(() => {
    // Single / master bedroom = always 1 seat
    if (!shared) updateField('total_seats', '1')
  }, [form.type])

  useEffect(() => {
    return () => previews.forEach((url) => URL.revokeObjectURL(url))
  }, [previews])

  function updateField(key: string, value: any) {
    setForm((prev) => ({ ...prev, [key]: value }))
    if (errors[key]) setErrors((prev) => { const e = { ...prev }; delete e[key]; return e })
  }

  async function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []).slice(0, 4)
    previews.forEach((url) => URL.revokeObjectURL(url))
    const compressed = await Promise.all(files.map((f) => compressImage(f)))
    setImages(compressed)
    setPreviews(compressed.map((f) => URL.createObjectURL(f)))
  }

  function removeImage(index: number) {
    URL.revokeObjectURL(previews[index])
    setImages((prev) => prev.filter((_, i) => i !== index))
    setPreviews((prev) => prev.filter((_, i) => i !== index))
  }

  function validateStep1() {
    const e: Record<string, string> = {}
    if (!form.title.trim()) e.title = 'Title is required'
    if (!form.title.trim() && form.title.trim().length < 5) e.title = 'Title must be at least 5 characters'
    const rent = Number(form.rent)
    if (!form.rent) e.rent = 'Rent is required'
    else if (isNaN(rent) || rent <= 0) e.rent = 'Rent must be a positive number'
    else if (rent < 500) e.rent = 'Rent seems too low (minimum ৳500)'
    else if (rent > 100000) e.rent = 'Rent seems too high (maximum ৳1,00,000)'
    if (!form.location_name.trim()) e.location_name = 'Location is required'
    if (!form.available_from) e.available_from = 'Available date is required'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function uploadRoomImages(roomId: string) {
    const urls: string[] = []
    for (const image of images) {
      const filePath = `${roomId}/${crypto.randomUUID()}.webp`
      const { error } = await supabase.storage.from('room-images').upload(filePath, image, { contentType: 'image/webp' })
      if (error) throw new Error(error.message)
      const { data } = supabase.storage.from('room-images').getPublicUrl(filePath)
      urls.push(data.publicUrl)
    }
    return urls
  }

  async function handleSubmit() {
    if (!userId) { router.push('/auth/login'); return }
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
        description: form.description,
        owner_id: userId,
        status: 'open',
        images: [],
        // amenities
        wifi: form.wifi, gas: form.gas, electricity: form.electricity,
        ac: form.ac, attached_bath: form.attached_bath, study_table: form.study_table,
        parking: form.parking, laundry: form.laundry, cctv: form.cctv,
        // additional costs
        electricity_bill: form.electricity_bill ? Number(form.electricity_bill) : null,
        maid_bill: form.maid_bill ? Number(form.maid_bill) : null,
        other_bill: form.other_bill ? Number(form.other_bill) : null,
        other_bill_label: form.other_bill_label || null,
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
        await supabase.from('rooms').update({ images: imageUrls }).eq('id', room.id)
      }
      router.push(`/listings/${room.id}`)
    } catch (err: any) {
      setLoading(false)
      toast.error(err.message || 'Image upload failed')
    }
  }

  const totalAdditional =
    (Number(form.electricity_bill) || 0) +
    (Number(form.maid_bill) || 0) +
    (Number(form.other_bill) || 0)

  return (
    <main className="mx-auto max-w-lg px-4 py-8">
      <h1 className="mb-1 text-2xl font-semibold text-gray-900 dark:text-white">Post a Room</h1>
      <p className="mb-4 text-sm text-gray-400">Step {step} of 2</p>

      <div className="mb-8 h-1.5 rounded-full bg-gray-100 dark:bg-gray-700">
        <div
          className="h-full rounded-full bg-teal-600 transition-all"
          style={{ width: step === 1 ? '50%' : '100%' }}
        />
      </div>

      {/* ─── STEP 1 ─── */}
      {step === 1 && (
        <div className="flex flex-col gap-4">

          {/* Title */}
          <div>
            <label className="mb-1 block text-xs text-gray-500 dark:text-gray-400">Title *</label>
            <input
              placeholder="e.g. Spacious mess room near university"
              className={inputCls(errors.title)}
              value={form.title}
              maxLength={100}
              onChange={(e) => updateField('title', e.target.value)}
            />
            <div className="mt-1 flex justify-between">
              {errors.title ? <p className="text-xs text-red-500">{errors.title}</p> : <span />}
              <p className="text-xs text-gray-400">{form.title.length}/100</p>
            </div>
          </div>

          {/* Type + Gender */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs text-gray-500 dark:text-gray-400">Room Type *</label>
              <select className={inputCls()} value={form.type} onChange={(e) => updateField('type', e.target.value)}>
                <option value="mess">🍳 Mess</option>
                <option value="bachelor">🛋 Bachelor</option>
                <option value="sublet">🔑 Sublet</option>
                <option value="single">🛏 Single Room</option>
                <option value="master_bedroom">🏠 Master Bedroom</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs text-gray-500 dark:text-gray-400">For *</label>
              <select className={inputCls()} value={form.gender_type} onChange={(e) => updateField('gender_type', e.target.value)}>
                <option value="male">👨 Male</option>
                <option value="female">👩 Female</option>
                <option value="any">👥 Any</option>
              </select>
            </div>
          </div>

          {/* Pricing */}
          <div className="rounded-2xl border border-teal-100 bg-teal-50 p-4 dark:border-teal-800 dark:bg-teal-900/20">
            <p className="mb-3 text-xs font-semibold text-teal-700 dark:text-teal-400">
              💰 Pricing
            </p>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs text-gray-500 dark:text-gray-400">
                  {shared ? 'Rent per Seat *' : 'Total Rent *'} (৳/month)
                </label>
                <input
                  type="number"
                  placeholder={shared ? '3000' : '8000'}
                  className={inputCls(errors.rent)}
                  value={form.rent}
                  onChange={(e) => updateField('rent', e.target.value)}
                />
                {errors.rent && <p className="mt-1 text-xs text-red-500">{errors.rent}</p>}
              </div>

              <div>
                <label className="mb-1 block text-xs text-gray-500 dark:text-gray-400">
                  {shared ? 'Total Seats' : 'Room Count'}
                </label>
                {shared ? (
                  <select className={inputCls()} value={form.total_seats} onChange={(e) => updateField('total_seats', e.target.value)}>
                    {[1, 2, 3, 4, 5, 6].map((n) => (
                      <option key={n} value={n}>{n} {n === 1 ? 'seat' : 'seats'}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    disabled
                    value="1 room"
                    className={`${inputCls()} cursor-not-allowed opacity-60`}
                  />
                )}
              </div>
            </div>

            {shared && form.rent && (
              <p className="mt-2 text-xs text-teal-600 dark:text-teal-400">
                ✨ Tenants will see: ৳{Number(form.rent).toLocaleString('en-US')} per seat/month
              </p>
            )}
          </div>

          {/* Additional Costs */}
          <div>
            <label className="mb-2 block text-xs font-medium text-gray-600 dark:text-gray-400">
              Additional Monthly Costs <span className="font-normal text-gray-400">(optional)</span>
            </label>
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <span className="w-5 text-center">💡</span>
                <input
                  type="number"
                  placeholder="Electricity bill (৳)"
                  className={`flex-1 ${inputCls()}`}
                  value={form.electricity_bill}
                  onChange={(e) => updateField('electricity_bill', e.target.value)}
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="w-5 text-center">🧹</span>
                <input
                  type="number"
                  placeholder="Maid/বুয়া bill (৳)"
                  className={`flex-1 ${inputCls()}`}
                  value={form.maid_bill}
                  onChange={(e) => updateField('maid_bill', e.target.value)}
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="w-5 text-center">➕</span>
                <input
                  type="number"
                  placeholder="Other cost (৳)"
                  className={`w-28 ${inputCls()}`}
                  value={form.other_bill}
                  onChange={(e) => updateField('other_bill', e.target.value)}
                />
                <input
                  placeholder="Label (e.g. Internet)"
                  className={`flex-1 ${inputCls()}`}
                  value={form.other_bill_label}
                  onChange={(e) => updateField('other_bill_label', e.target.value)}
                />
              </div>
            </div>

            {(form.rent && totalAdditional > 0) && (
              <div className="mt-2 rounded-xl bg-gray-50 px-3 py-2 text-xs text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                Total per {shared ? 'seat' : 'room'}: ৳{(Number(form.rent) + totalAdditional).toLocaleString('en-US')}/month
                <span className="ml-1 text-gray-400">(rent + ৳{totalAdditional.toLocaleString('en-US')} costs)</span>
              </div>
            )}
          </div>

          {/* Location */}
          <div>
            <label className="mb-1 block text-xs text-gray-500 dark:text-gray-400">Location *</label>
            <input
              placeholder="e.g. Shahbag, Dhaka"
              className={inputCls(errors.location_name)}
              value={form.location_name}
              onChange={(e) => updateField('location_name', e.target.value)}
            />
            {errors.location_name && <p className="mt-1 text-xs text-red-500">{errors.location_name}</p>}
          </div>

          {/* Available from */}
          <div>
            <label className="mb-1 block text-xs text-gray-500 dark:text-gray-400">Available From *</label>
            <input
              type="date"
              className={inputCls(errors.available_from)}
              value={form.available_from}
              onChange={(e) => updateField('available_from', e.target.value)}
            />
            {errors.available_from && <p className="mt-1 text-xs text-red-500">{errors.available_from}</p>}
          </div>

          <button
            onClick={() => { if (validateStep1()) setStep(2) }}
            className="w-full rounded-xl bg-teal-600 py-3 text-sm font-medium text-white hover:bg-teal-700"
          >
            Next: Facilities & Photos →
          </button>
        </div>
      )}

      {/* ─── STEP 2 ─── */}
      {step === 2 && (
        <div className="flex flex-col gap-5">

          {/* Facilities */}
          <div>
            <label className="mb-2 block text-xs font-medium text-gray-600 dark:text-gray-400">Facilities</label>
            <div className="grid grid-cols-3 gap-2">
              {AMENITIES.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => updateField(item.key, !(form as any)[item.key])}
                  className={`flex flex-col items-center gap-1 rounded-xl border p-3 text-sm transition-colors ${
                    (form as any)[item.key]
                      ? 'border-teal-500 bg-teal-50 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400'
                      : 'border-gray-200 text-gray-400 dark:border-gray-700 dark:text-gray-500'
                  }`}
                >
                  <span className="text-xl">{item.icon}</span>
                  <span className="text-xs">{item.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="mb-1 block text-xs text-gray-500 dark:text-gray-400">Description</label>
            <textarea
              rows={5}
              placeholder={`Describe the room in detail...\n\nE.g. — floor level, nearby landmarks, transport access, house rules, etc.`}
              className={`w-full resize-none ${inputCls()}`}
              value={form.description}
              maxLength={1000}
              onChange={(e) => updateField('description', e.target.value)}
            />
            <p className={`mt-1 text-right text-xs ${form.description.length >= 950 ? 'text-orange-500' : 'text-gray-400'}`}>
              {form.description.length}/1000
            </p>
          </div>

          {/* Images */}
          <div>
            <label className="mb-2 block text-xs text-gray-500 dark:text-gray-400">Room Photos (up to 4)</label>
            <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-200 p-6 text-center hover:border-teal-400 hover:bg-teal-50 dark:border-gray-700 dark:hover:bg-teal-900/10">
              <input type="file" accept="image/*" multiple className="hidden" onChange={handleImageChange} />
              <span className="text-3xl">📷</span>
              <span className="mt-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                {previews.length > 0 ? `${previews.length} photo(s) selected` : 'Upload photos'}
              </span>
              <span className="text-xs text-gray-400">JPG, PNG or WEBP · auto compressed</span>
            </label>

            {previews.length > 0 && (
              <div className="mt-3 grid grid-cols-4 gap-2">
                {previews.map((src, index) => (
                  <div key={src} className="relative aspect-square overflow-hidden rounded-xl bg-gray-100">
                    <Image src={src} alt={`Preview ${index + 1}`} fill className="object-cover" />
                    <button
                      type="button"
                      onClick={() => removeImage(index)}
                      className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-white text-xs text-red-500 shadow"
                    >×</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Summary */}
          <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800">
            <p className="mb-2 text-xs font-semibold text-gray-600 dark:text-gray-400">📋 Listing Summary</p>
            <div className="flex flex-col gap-1 text-xs text-gray-500 dark:text-gray-400">
              <span>📌 {form.title || '—'}</span>
              <span>🏠 {form.type} · {form.gender_type}</span>
              <span>💰 ৳{form.rent || '—'} {shared ? 'per seat' : 'total'}/month</span>
              {totalAdditional > 0 && <span>➕ ৳{totalAdditional.toLocaleString('en-US')} additional costs/month</span>}
              <span>📍 {form.location_name || '—'}</span>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setStep(1)}
              className="flex-1 rounded-xl border border-gray-200 py-3 text-sm text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
            >
              ← Back
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="flex-1 rounded-xl bg-teal-600 py-3 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50"
            >
              {loading ? 'Posting...' : 'Post Room ✓'}
            </button>
          </div>
        </div>
      )}
    </main>
  )
}

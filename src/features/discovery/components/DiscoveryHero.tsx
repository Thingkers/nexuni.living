import Link from 'next/link'
import { ArrowLeft, BookOpen, BriefcaseBusiness, MapPinned } from 'lucide-react'

import type { DiscoveryKind } from '@/features/discovery/types'

const ICONS = {
  book: BookOpen,
  service: MapPinned,
  job: BriefcaseBusiness,
}

export default function DiscoveryHero({
  kind,
  eyebrow,
  title,
  description,
  sampleNotice,
}: {
  kind: DiscoveryKind
  eyebrow: string
  title: string
  description: string
  sampleNotice: string
}) {
  const Icon = ICONS[kind]
  return (
    <header className="relative overflow-hidden bg-[#071c19] py-14 text-white md:py-20">
      <div className="absolute inset-0 opacity-25 [background-image:linear-gradient(rgba(45,212,191,.16)_1px,transparent_1px),linear-gradient(90deg,rgba(45,212,191,.16)_1px,transparent_1px)] [background-size:44px_44px]" />
      <div className="page-shell relative">
        <Link href="/" className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 transition hover:text-white">
          <ArrowLeft className="h-4 w-4" />
          Map hub
        </Link>
        <div className="mt-8 flex flex-col justify-between gap-8 md:flex-row md:items-end">
          <div>
            <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-teal-300">
              <Icon className="h-4 w-4" />
              {eyebrow}
            </p>
            <h1 className="mt-5 max-w-4xl text-4xl font-semibold tracking-[-0.055em] md:text-7xl">{title}</h1>
            <p className="mt-5 max-w-2xl text-sm leading-7 text-slate-300 md:text-base">{description}</p>
          </div>
          <div className="max-w-sm rounded-2xl border border-amber-300/20 bg-amber-300/10 px-4 py-3 text-xs leading-5 text-amber-100">
            {sampleNotice}
          </div>
        </div>
      </div>
    </header>
  )
}

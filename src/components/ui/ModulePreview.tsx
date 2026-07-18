import Link from 'next/link'
import { ArrowLeft, CheckCircle2, Clock3, MapPin, ShieldCheck } from 'lucide-react'
import { getLocale } from 'next-intl/server'

type ModulePreviewProps = {
  eyebrow: string
  eyebrowBn?: string
  title: string
  titleBn?: string
  description: string
  descriptionBn?: string
  phase: string
  capabilities: string[]
  capabilitiesBn?: string[]
  relatedHref?: string
  relatedLabel?: string
  relatedLabelBn?: string
  beta?: boolean
}

export default async function ModulePreview({
  eyebrow,
  eyebrowBn,
  title,
  titleBn,
  description,
  descriptionBn,
  phase,
  capabilities,
  capabilitiesBn,
  relatedHref = '/',
  relatedLabel = 'Return to map hub',
  relatedLabelBn,
  beta = false,
}: ModulePreviewProps) {
  const locale = await getLocale()
  const isBn = locale === 'bn'
  const displayCapabilities = isBn && capabilitiesBn ? capabilitiesBn : capabilities

  return (
    <main className="min-h-[calc(100dvh-4rem)] bg-[#eef3f1] px-4 py-10 text-slate-950 dark:bg-slate-950 dark:text-white">
      <div className="mx-auto max-w-5xl">
        <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-teal-700 dark:text-slate-400">
          <ArrowLeft className="h-4 w-4" />
          {isBn ? 'ম্যাপ হাব' : 'Map hub'}
        </Link>

        <section className="mt-8 overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="bg-[#071c19] p-8 text-white md:p-12">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-teal-300/30 bg-teal-300/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-teal-200">
                {isBn && eyebrowBn ? eyebrowBn : eyebrow}
              </span>
              <span className="rounded-full border border-white/15 px-3 py-1.5 text-[10px] font-semibold text-slate-300">
                {beta ? (isBn ? 'বেটা' : 'Beta') : (isBn ? 'প্রিভিউ' : 'Preview')} · {phase}
              </span>
            </div>
            <h1 className="mt-6 max-w-3xl text-4xl font-semibold tracking-[-0.05em] md:text-6xl">
              {isBn && titleBn ? titleBn : title}
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-slate-300">
              {isBn && descriptionBn ? descriptionBn : description}
            </p>
          </div>

          <div className="grid gap-8 p-7 md:grid-cols-[1.2fr_.8fr] md:p-10">
            <div>
              <h2 className="text-xl font-semibold">{isBn ? 'পরিকল্পিত পোর্টাল কার্যক্রম' : 'Planned portal operations'}</h2>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {displayCapabilities.map((capability) => (
                  <div key={capability} className="flex items-start gap-3 rounded-2xl border border-slate-200 p-4 dark:border-slate-700">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-teal-600 dark:text-teal-400" />
                    <p className="text-sm leading-5 text-slate-600 dark:text-slate-300">{capability}</p>
                  </div>
                ))}
              </div>
            </div>

            <aside className="rounded-3xl bg-slate-100 p-6 dark:bg-slate-800">
              <ShieldCheck className="h-7 w-7 text-teal-700 dark:text-teal-400" />
              <h2 className="mt-4 font-semibold">{isBn ? 'নিরাপদ রোলআউট অবস্থা' : 'Safe rollout state'}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                {isBn
                  ? 'ফিচারটি এখন দেখা যাবে। মডারেশন ও ডেটাবেস নীতি সক্রিয় না হওয়া পর্যন্ত পোস্ট, লেনদেন ও ব্যক্তিগত তথ্যের কার্যক্রম বন্ধ থাকবে।'
                  : 'Discovery is available now. Publishing, transactions and personal-data operations remain disabled until moderation and database policies are activated.'}
              </p>
              <div className="mt-5 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                <Clock3 className="h-4 w-4" />
                {isBn ? 'রোডম্যাপ-নিয়ন্ত্রিত' : 'Roadmap-gated'}
              </div>
              <Link href={relatedHref} className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#071c19] px-4 py-2.5 text-xs font-bold text-white dark:bg-teal-400 dark:text-slate-950">
                <MapPin className="h-4 w-4" />
                {isBn && relatedLabelBn ? relatedLabelBn : relatedLabel}
              </Link>
            </aside>
          </div>
        </section>
      </div>
    </main>
  )
}

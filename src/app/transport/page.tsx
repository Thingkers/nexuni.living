import type { Metadata } from 'next'
import Link from 'next/link'
import ModulePreview from '@/components/ui/ModulePreview'

export const metadata: Metadata = {
  title: 'Transport Guides',
  robots: { index: false, follow: false },
}

export default function TransportPage() {
  return (
    <>
      <ModulePreview
        eyebrow="Transport"
        eyebrowBn="যাতায়াত"
        title="Understand the route before you move."
        titleBn="বাসা নেওয়ার আগে যাতায়াতের পথ বুঝুন।"
        description="Campus-focused bus routes, estimated fares, important stops and moderated community contributions."
        descriptionBn="ক্যাম্পাসকেন্দ্রিক বাস রুট, আনুমানিক ভাড়া, গুরুত্বপূর্ণ স্টপ এবং মডারেটেড কমিউনিটি তথ্য।"
        phase="Months 7–12"
        capabilities={[
          'Origin-to-campus route search',
          'Stops, approximate fares and universities served',
          'Community corrections with moderation',
          'Connections to verified student carpools',
        ]}
        capabilitiesBn={[
          'শুরু স্থান থেকে ক্যাম্পাস পর্যন্ত রুট খোঁজা',
          'স্টপ, আনুমানিক ভাড়া ও সংশ্লিষ্ট বিশ্ববিদ্যালয়',
          'মডারেশনসহ কমিউনিটি সংশোধন',
          'যাচাইকৃত শিক্ষার্থী কারপুলের সংযোগ',
        ]}
        relatedHref="/transport/carpools"
        relatedLabel="Preview carpools"
        relatedLabelBn="কারপুল প্রিভিউ দেখুন"
      />
      <Link href="/transport/carpools" className="sr-only">Carpool preview</Link>
    </>
  )
}

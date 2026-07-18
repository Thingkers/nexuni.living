import type { Metadata } from 'next'
import ModulePreview from '@/components/ui/ModulePreview'

export const metadata: Metadata = {
  title: 'Local Student Services',
  robots: { index: false, follow: false },
}

export default function ServicesPage() {
  return (
    <ModulePreview
      eyebrow="Local services"
      eyebrowBn="স্থানীয় সেবা"
      title="Everything students need near campus."
      titleBn="ক্যাম্পাসের কাছে শিক্ষার্থীদের প্রয়োজনীয় সবকিছু।"
      description="A moderated map directory for printing, laundry, food, pharmacies and other trusted locality-based services."
      descriptionBn="প্রিন্টিং, লন্ড্রি, খাবার, ফার্মেসি ও অন্যান্য বিশ্বস্ত স্থানীয় সেবার মডারেটেড ম্যাপ ডিরেক্টরি।"
      phase="Months 4–6"
      capabilities={[
        'Category and locality map filters',
        'Hours, phone and student price notes',
        'Nearby services on accommodation pages',
        'Moderator-reviewed place suggestions',
      ]}
      capabilitiesBn={[
        'ক্যাটাগরি ও এলাকা অনুযায়ী ম্যাপ ফিল্টার',
        'সময়সূচি, ফোন ও শিক্ষার্থী মূল্য',
        'আবাসন পেজে নিকটবর্তী সেবা',
        'মডারেটর-পর্যালোচিত নতুন স্থানের প্রস্তাব',
      ]}
      relatedHref="/#campuses"
      relatedLabel="Explore campus areas"
      relatedLabelBn="ক্যাম্পাস এলাকা দেখুন"
    />
  )
}

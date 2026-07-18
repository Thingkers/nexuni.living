import type { Metadata } from 'next'
import ModulePreview from '@/components/ui/ModulePreview'

export const metadata: Metadata = {
  title: 'Student Carpools',
  robots: { index: false, follow: false },
}

export default function CarpoolsPage() {
  return (
    <ModulePreview
      eyebrow="Verified community"
      eyebrowBn="যাচাইকৃত কমিউনিটি"
      title="Share regular campus journeys safely."
      titleBn="নিরাপদে নিয়মিত ক্যাম্পাস যাত্রা ভাগ করুন।"
      description="A verified-student board for recurring routes, schedules and available seats using coarse locations and in-app messaging."
      descriptionBn="আনুমানিক লোকেশন ও ইন-অ্যাপ মেসেজিং ব্যবহার করে নিয়মিত রুট, সময়সূচি ও খালি আসনের জন্য যাচাইকৃত শিক্ষার্থীদের বোর্ড।"
      phase="Months 7–12"
      capabilities={[
        'Campus and locality route matching',
        'Recurring schedules and available seats',
        'Verified-student-only discovery',
        'Private contact through existing messaging',
      ]}
      capabilitiesBn={[
        'ক্যাম্পাস ও এলাকা অনুযায়ী রুট মিল',
        'নিয়মিত সময়সূচি ও খালি আসন',
        'শুধু যাচাইকৃত শিক্ষার্থীদের জন্য',
        'বিদ্যমান মেসেজিংয়ের মাধ্যমে ব্যক্তিগত যোগাযোগ',
      ]}
      relatedHref="/transport"
      relatedLabel="Transport guide preview"
      relatedLabelBn="যাতায়াত গাইড প্রিভিউ"
    />
  )
}

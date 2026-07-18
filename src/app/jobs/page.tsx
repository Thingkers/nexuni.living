import type { Metadata } from 'next'
import ModulePreview from '@/components/ui/ModulePreview'

export const metadata: Metadata = {
  title: 'Student Jobs and Internships',
  robots: { index: false, follow: false },
}

export default function JobsPage() {
  return (
    <ModulePreview
      eyebrow="Opportunities"
      eyebrowBn="সুযোগ"
      title="Part-time work and internships near students."
      titleBn="শিক্ষার্থীদের কাছাকাছি পার্ট-টাইম কাজ ও ইন্টার্নশিপ।"
      description="Location-aware opportunities from verified organizations, filtered by campus, schedule and application method."
      descriptionBn="যাচাইকৃত প্রতিষ্ঠান থেকে ক্যাম্পাস, সময়সূচি ও আবেদন পদ্ধতি অনুযায়ী লোকেশনভিত্তিক সুযোগ।"
      phase="Months 7–12"
      capabilities={[
        'Part-time and internship filters',
        'Salary, schedule and campus proximity',
        'Verified employer and moderation workflow',
        'Saved opportunities and safe application links',
      ]}
      capabilitiesBn={[
        'পার্ট-টাইম ও ইন্টার্নশিপ ফিল্টার',
        'বেতন, সময়সূচি ও ক্যাম্পাসের দূরত্ব',
        'যাচাইকৃত নিয়োগদাতা ও মডারেশন',
        'সংরক্ষিত সুযোগ ও নিরাপদ আবেদন লিংক',
      ]}
      relatedHref="/roommates"
      relatedLabel="Open student community"
      relatedLabelBn="স্টুডেন্ট কমিউনিটি দেখুন"
    />
  )
}

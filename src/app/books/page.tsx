import type { Metadata } from 'next'
import ModulePreview from '@/components/ui/ModulePreview'

export const metadata: Metadata = {
  title: 'Used Books Marketplace',
  robots: { index: false, follow: false },
}

export default function BooksPage() {
  return (
    <ModulePreview
      eyebrow="Marketplace"
      eyebrowBn="মার্কেটপ্লেস"
      title="Find the right books around your campus."
      titleBn="ক্যাম্পাসের আশেপাশে সঠিক বই খুঁজুন।"
      description="A campus-aware marketplace for used textbooks, course materials and student-to-student pickup."
      descriptionBn="পুরনো পাঠ্যবই, কোর্স সামগ্রী এবং শিক্ষার্থীদের সরাসরি সংগ্রহের জন্য ক্যাম্পাসভিত্তিক মার্কেটপ্লেস।"
      phase="Months 4–6"
      capabilities={[
        'Filter by university, department and course code',
        'Condition, price and negotiable listing details',
        'Campus meetup and seller messaging',
        'Saved books and sold/archive lifecycle',
      ]}
      capabilitiesBn={[
        'বিশ্ববিদ্যালয়, বিভাগ ও কোর্স কোড দিয়ে ফিল্টার',
        'বইয়ের অবস্থা, মূল্য ও দরদামের তথ্য',
        'ক্যাম্পাসে দেখা করা ও বিক্রেতার সাথে মেসেজ',
        'সংরক্ষিত বই এবং বিক্রি/আর্কাইভ অবস্থা',
      ]}
      relatedHref="/listings"
      relatedLabel="Browse live housing"
      relatedLabelBn="লাইভ আবাসন দেখুন"
    />
  )
}

import type { Metadata } from 'next'
import ModulePreview from '@/components/ui/ModulePreview'

export const metadata: Metadata = {
  title: 'Deposits and Payments',
  robots: { index: false, follow: false },
}

export default function PaymentsPage() {
  return (
    <ModulePreview
      eyebrow="Payments"
      eyebrowBn="পেমেন্ট"
      title="Transparent deposit tracking before escrow."
      titleBn="এসক্রোর আগে স্বচ্ছ ডিপোজিট ট্র্যাকিং।"
      description="The first activation will provide a provider-neutral payment ledger. Holding and releasing money remains disabled pending merchant and regulatory approval."
      descriptionBn="প্রথম ধাপে নিরপেক্ষ পেমেন্ট লেজার চালু হবে। মার্চেন্ট ও নিয়ন্ত্রক অনুমোদন না হওয়া পর্যন্ত অর্থ ধরে রাখা বা ছাড়ার সুবিধা বন্ধ থাকবে।"
      phase="Months 7–12"
      capabilities={[
        'Server-created payment intents',
        'Idempotent bKash transaction records',
        'Participant-only payment history',
        'Dispute-ready audit trail',
      ]}
      capabilitiesBn={[
        'সার্ভার থেকে তৈরি পেমেন্ট ইনটেন্ট',
        'আইডেমপোটেন্ট বিকাশ লেনদেন রেকর্ড',
        'শুধু অংশগ্রহণকারীদের পেমেন্ট ইতিহাস',
        'বিরোধ নিষ্পত্তির উপযোগী অডিট ট্রেইল',
      ]}
      relatedHref="/dashboard"
      relatedLabel="Return to dashboard"
      relatedLabelBn="ড্যাশবোর্ডে ফিরুন"
    />
  )
}

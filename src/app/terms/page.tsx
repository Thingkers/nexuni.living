import { BRAND } from '@/config/brand'

export default function TermsPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="mb-2 text-3xl font-bold text-gray-900 dark:text-white">Terms of Service</h1>
      <p className="mb-8 text-sm text-gray-400">Last updated: June 2026</p>

      <div className="space-y-8 text-sm leading-relaxed text-gray-600 dark:text-gray-400">

        <section>
          <h2 className="mb-2 text-base font-semibold text-gray-900 dark:text-white">1. Acceptance of Terms</h2>
          <p>By accessing or using {BRAND.name}, you agree to be bound by these Terms of Service. If you do not agree, please do not use the platform.</p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-gray-900 dark:text-white">2. Eligibility</h2>
          <p>{BRAND.name} is intended for university students and room owners in Bangladesh. You must provide a valid student ID or be a verified room owner to access full features.</p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-gray-900 dark:text-white">3. User Responsibilities</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>You must provide accurate information when creating a listing or booking.</li>
            <li>You must not post false, misleading, or fraudulent listings.</li>
            <li>You are responsible for all activity that occurs under your account.</li>
            <li>You must treat other users with respect in all communications.</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-gray-900 dark:text-white">4. Listings</h2>
          <p>Room owners are solely responsible for the accuracy of their listings. {BRAND.name} does not verify the physical condition of listed properties. We reserve the right to remove any listing that violates our policies.</p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-gray-900 dark:text-white">5. Bookings</h2>
          <p>A booking request does not guarantee accommodation. The final agreement is between the tenant and the room owner. {BRAND.name} is not a party to any rental agreement and accepts no liability for disputes between users.</p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-gray-900 dark:text-white">6. Prohibited Conduct</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>Harassment or abuse of other users.</li>
            <li>Posting spam or irrelevant content.</li>
            <li>Attempting to circumvent the platform to conduct transactions.</li>
            <li>Creating multiple accounts to bypass verification.</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-gray-900 dark:text-white">7. Termination</h2>
          <p>We reserve the right to suspend or terminate accounts that violate these terms, without prior notice.</p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-gray-900 dark:text-white">8. Changes to Terms</h2>
          <p>We may update these terms at any time. Continued use of the platform after changes constitutes acceptance of the new terms.</p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-gray-900 dark:text-white">9. Contact</h2>
          <p>For questions about these terms, please contact us through the platform.</p>
        </section>
      </div>
    </main>
  )
}

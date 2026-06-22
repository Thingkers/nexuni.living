export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="mb-2 text-3xl font-bold text-gray-900 dark:text-white">Privacy Policy</h1>
      <p className="mb-8 text-sm text-gray-400">Last updated: June 2026</p>

      <div className="space-y-8 text-sm leading-relaxed text-gray-600 dark:text-gray-400">

        <section>
          <h2 className="mb-2 text-base font-semibold text-gray-900 dark:text-white">1. Information We Collect</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li><strong className="text-gray-700 dark:text-gray-300">Account info:</strong> Name, email, university, student ID card image.</li>
            <li><strong className="text-gray-700 dark:text-gray-300">Listing info:</strong> Room details, photos, location (latitude/longitude).</li>
            <li><strong className="text-gray-700 dark:text-gray-300">Usage data:</strong> Pages visited, room views, search queries.</li>
            <li><strong className="text-gray-700 dark:text-gray-300">Messages:</strong> Conversations between users on the platform.</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-gray-900 dark:text-white">2. How We Use Your Information</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>To verify student identity and approve accounts.</li>
            <li>To display your listings to other users.</li>
            <li>To send booking and messaging notifications via email.</li>
            <li>To improve the platform based on usage patterns.</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-gray-900 dark:text-white">3. Information Sharing</h2>
          <p>We do not sell your personal information to third parties. Your phone number is only visible to verified users who view your listing. Your student ID card is only visible to platform administrators for verification purposes.</p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-gray-900 dark:text-white">4. Data Storage</h2>
          <p>Your data is stored securely using Supabase (PostgreSQL) with row-level security enabled. Images are stored in Supabase Storage. We use industry-standard security measures to protect your data.</p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-gray-900 dark:text-white">5. Your Rights</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>You can update your profile information at any time.</li>
            <li>You can delete your listings at any time.</li>
            <li>You can request account deletion by contacting us.</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-gray-900 dark:text-white">6. Cookies</h2>
          <p>We use essential cookies only — for authentication sessions. We do not use tracking or advertising cookies.</p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-gray-900 dark:text-white">7. Contact</h2>
          <p>For privacy-related requests, please contact us through the platform.</p>
        </section>
      </div>
    </main>
  )
}

'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

import { supabase } from '@/lib/supabase'
import type { AdminModuleKey } from '@/config/modules'
import BooksAdminPanel from '@/features/books/components/BooksAdminPanel'
import JobsAdminPanel from '@/features/jobs/components/JobsAdminPanel'

const MODULE_LABELS: Record<AdminModuleKey, string> = {
  books: 'Books',
  services: 'Local Services',
  jobs: 'Jobs',
  transport: 'Transport',
}

export default function ModuleAdminGate({ module }: { module: AdminModuleKey }) {
  const router = useRouter()
  const [allowed, setAllowed] = useState<boolean | null>(null)

  useEffect(() => {
    let active = true

    async function check() {
      const { data: authData } = await supabase.auth.getUser()
      if (!authData.user) { router.push('/auth/login'); return }

      const { data, error } = await supabase.rpc('is_module_admin', { p_module: module })
      if (!active) return

      if (error || !data) {
        router.push('/dashboard')
        return
      }

      setAllowed(true)
    }

    check()
    return () => { active = false }
  }, [module, router])

  if (allowed === null) {
    return (
      <div className="page-shell py-10">
        <p className="text-sm text-gray-400">Loading...</p>
      </div>
    )
  }

  return (
    <main className="page-shell py-8">
      <h1 className="mb-6 text-2xl font-semibold text-gray-900 dark:text-white">
        {MODULE_LABELS[module]} admin
      </h1>
      {module === 'books' ? (
        <BooksAdminPanel />
      ) : module === 'jobs' ? (
        <JobsAdminPanel />
      ) : (
        <p className="text-sm text-gray-400">
          Coming soon — this panel will let you manage {MODULE_LABELS[module].toLowerCase()} listings.
        </p>
      )}
    </main>
  )
}

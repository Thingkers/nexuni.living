'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

import useViewerCapabilities from '@/components/auth/useViewerCapabilities'
import { ADMIN_MODULE_KEYS, type AdminModuleKey } from '@/config/modules'

const MODULE_LABELS: Record<AdminModuleKey, string> = {
  books: 'Books',
  services: 'Local Services',
  jobs: 'Jobs',
  transport: 'Transport',
}

// Presentation only — proxy.ts already gates every /admin/* route
// server-side, and each page keeps its own client-side redirect check, so
// this layout never redirects itself. It only decides which nav links to
// show: the full admin section for a global admin, or just their assigned
// module(s) for a module-scoped admin.
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { loading, isAdmin, moduleAdmin } = useViewerCapabilities()
  const pathname = usePathname()

  const links = isAdmin
    ? [
        { href: '/admin/users', label: 'Users' },
        { href: '/admin/rooms', label: 'Rooms' },
        { href: '/admin/reports', label: 'Reports' },
        { href: '/admin/module-admins', label: 'Module Admins' },
        { href: '/dashboard/analytics', label: 'Analytics' },
        ...ADMIN_MODULE_KEYS.map((key) => ({ href: `/admin/${key}`, label: MODULE_LABELS[key] })),
      ]
    : moduleAdmin.map((key) => ({ href: `/admin/${key}`, label: MODULE_LABELS[key] }))

  return (
    <div>
      {!loading && links.length > 0 && (
        <nav className="border-b border-gray-100 bg-white dark:border-gray-800 dark:bg-gray-900">
          <div className="page-shell flex flex-wrap gap-1 py-2">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                  pathname === link.href
                    ? 'bg-teal-600 text-white'
                    : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </nav>
      )}
      {children}
    </div>
  )
}

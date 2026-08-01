import { notFound } from 'next/navigation'

import { ADMIN_MODULE_KEYS, type AdminModuleKey } from '@/config/modules'
import ModuleAdminGate from './ModuleAdminGate'

function isAdminModuleKey(value: string): value is AdminModuleKey {
  return (ADMIN_MODULE_KEYS as readonly string[]).includes(value)
}

export default async function ModuleAdminPage({
  params,
}: {
  params: Promise<{ module: string }>
}) {
  const { module } = await params
  if (!isAdminModuleKey(module)) {
    notFound()
  }

  return <ModuleAdminGate module={module} />
}

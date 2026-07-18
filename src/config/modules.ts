export type ModuleState = 'live' | 'beta' | 'preview' | 'disabled'
export type ModuleKey =
  | 'housing'
  | 'roommates'
  | 'campuses'
  | 'books'
  | 'services'
  | 'jobs'
  | 'transport'
  | 'payments'

export type PortalModule = {
  key: ModuleKey
  href: string
  state: ModuleState
  phase: 'foundation' | 'retention' | 'platform'
  mapLayer: boolean
  public: boolean
}

export const PORTAL_MODULES: readonly PortalModule[] = [
  { key: 'housing', href: '/listings', state: 'live', phase: 'foundation', mapLayer: true, public: true },
  { key: 'roommates', href: '/roommates', state: 'live', phase: 'foundation', mapLayer: true, public: true },
  { key: 'campuses', href: '/#campuses', state: 'live', phase: 'foundation', mapLayer: true, public: true },
  { key: 'books', href: '/books', state: 'preview', phase: 'retention', mapLayer: true, public: true },
  { key: 'services', href: '/services', state: 'preview', phase: 'retention', mapLayer: true, public: true },
  { key: 'jobs', href: '/jobs', state: 'preview', phase: 'platform', mapLayer: true, public: true },
  { key: 'transport', href: '/transport', state: 'preview', phase: 'platform', mapLayer: true, public: true },
  { key: 'payments', href: '/dashboard/payments', state: 'preview', phase: 'platform', mapLayer: false, public: false },
] as const

export function getPortalModule(key: ModuleKey): PortalModule {
  return PORTAL_MODULES.find((module) => module.key === key)!
}

export const BRAND = {
  name: 'nexUni.living',
  shortName: 'nexUni',
  domain: 'nexuni.living',
  url: 'https://nexuni.living',
  description:
    'Find verified student housing, roommates, and campus services across Bangladesh.',
  emailFromName: 'nexUni.living',
} as const

export function getSiteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || BRAND.url).replace(/\/+$/, '')
}

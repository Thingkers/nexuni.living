import type { MetadataRoute } from 'next'
import { getSiteUrl } from '@/config/brand'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin/', '/dashboard/', '/profile/', '/inbox/', '/auth/'],
    },
    sitemap: `${getSiteUrl()}/sitemap.xml`,
  }
}

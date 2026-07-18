'use client'

import { useTranslations } from 'next-intl'

export default function NoDataBanner() {
  const t = useTranslations('System')

  if (process.env.NEXT_PUBLIC_APP_MODE !== 'no-data') return null

  return (
    <div className="bg-amber-50 px-4 py-2 text-center text-xs font-medium text-amber-900 dark:bg-amber-950 dark:text-amber-200">
      {t('noDataMode')}
    </div>
  )
}

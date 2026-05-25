'use client'

import AppToasts from '@/components/ui/AppToasts'
import { useNotification } from '@/hooks/useNotification'

export default function NotificationProvider() {
  const { toasts, dismiss } = useNotification()

  return <AppToasts toasts={toasts} onDismiss={dismiss} />
}
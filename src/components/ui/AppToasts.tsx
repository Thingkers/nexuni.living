'use client'

import Link from 'next/link'

import type { AppToast } from '@/hooks/useNotification'

type Props = {
  toasts: AppToast[]
  onDismiss: (id: string) => void
}

const TYPE_STYLE: Record<AppToast['type'], string> = {
  message: 'border-teal-200 bg-teal-50 text-teal-800',
  booking: 'border-green-200 bg-green-50 text-green-800',
  success: 'border-green-200 bg-green-50 text-green-800',
  error: 'border-red-200 bg-red-50 text-red-800',
}

export default function AppToasts({ toasts, onDismiss }: Props) {
  if (toasts.length === 0) return null

  return (
    <div className="fixed right-4 top-20 z-[200] flex w-[calc(100%-2rem)] max-w-sm flex-col gap-3">
      {toasts.map((toast) => {
        const content = (
          <div
            className={`rounded-2xl border p-4 shadow-sm ${TYPE_STYLE[toast.type]}`}
          >
            <div className="flex items-start gap-3">
              <div className="flex-1">
                <p className="text-sm font-semibold">{toast.title}</p>
                <p className="mt-1 text-xs opacity-80">{toast.body}</p>
              </div>

              <button
                onClick={(event) => {
                  event.preventDefault()
                  onDismiss(toast.id)
                }}
                className="text-sm opacity-60 hover:opacity-100"
              >
                ×
              </button>
            </div>
          </div>
        )

        if (toast.href) {
          return (
            <Link key={toast.id} href={toast.href} onClick={() => onDismiss(toast.id)}>
              {content}
            </Link>
          )
        }

        return <div key={toast.id}>{content}</div>
      })}
    </div>
  )
}
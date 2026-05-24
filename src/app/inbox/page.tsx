'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

import { supabase } from '@/lib/supabase'

type Thread = {
  otherId: string
  otherName: string
  lastMessage: string
  lastTime: string
  roomTitle?: string | null
  unread: number
}

export default function InboxPage() {
  const router = useRouter()

  const [threads, setThreads] = useState<Thread[]>([])
  const [loading, setLoading] = useState(true)
  const [pageError, setPageError] = useState('')

  useEffect(() => {
    async function loadInbox() {
      const { data: authData, error: authError } = await supabase.auth.getUser()

      if (authError || !authData.user) {
        router.push('/auth/login')
        return
      }

      const userId = authData.user.id

      const { data: messages, error } = await supabase
        .from('messages')
        .select(`
          *,
          sender:profiles!messages_sender_id_fkey(id, full_name),
          receiver:profiles!messages_receiver_id_fkey(id, full_name),
          rooms(title)
        `)
        .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
        .order('created_at', { ascending: false })

      if (error) {
        setPageError(error.message)
        setLoading(false)
        return
      }

      const threadMap = new Map<string, Thread>()

      for (const message of messages ?? []) {
        const otherId =
          message.sender_id === userId ? message.receiver_id : message.sender_id

        const other =
          message.sender_id === userId ? message.receiver : message.sender

        const key = [userId, otherId].sort().join('-')

        if (!threadMap.has(key)) {
          threadMap.set(key, {
            otherId,
            otherName: other?.full_name ?? 'Unknown User',
            lastMessage: message.content,
            lastTime: message.created_at,
            roomTitle: message.rooms?.title,
            unread:
              !message.is_read && message.receiver_id === userId ? 1 : 0,
          })
        } else {
          const thread = threadMap.get(key)

          if (thread && !message.is_read && message.receiver_id === userId) {
            thread.unread += 1
          }
        }
      }

      setThreads([...threadMap.values()])
      setLoading(false)
    }

    loadInbox()
  }, [router])

  if (loading) {
    return (
      <div className="mx-auto max-w-lg px-4 py-10 animate-pulse">
        {[...Array(4)].map((_, index) => (
          <div key={index} className="mb-3 h-16 rounded-2xl bg-gray-100" />
        ))}
      </div>
    )
  }

  if (pageError) {
    return (
      <main className="mx-auto max-w-lg px-4 py-10">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
          {pageError}
        </div>
      </main>
    )
  }

  return (
    <main className="mx-auto max-w-lg px-4 py-8">
      <h1 className="mb-6 text-2xl font-semibold text-gray-900">
        Inbox
      </h1>

      {threads.length === 0 ? (
        <div className="py-16 text-center text-gray-400">
          <p className="mb-3 text-4xl">💬</p>
          <p className="text-sm">No messages yet</p>
        </div>
      ) : (
        <div className="flex flex-col gap-1">
          {threads.map((thread) => (
            <Link
              key={thread.otherId}
              href={`/inbox/${thread.otherId}`}
              className="flex items-center gap-3 rounded-2xl p-4 transition-colors hover:bg-gray-50"
            >
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-medium text-blue-700">
                {thread.otherName[0]?.toUpperCase() || 'U'}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <p
                    className={`text-sm ${
                      thread.unread > 0
                        ? 'font-semibold text-gray-900'
                        : 'font-medium text-gray-800'
                    }`}
                  >
                    {thread.otherName}
                  </p>

                  <p className="text-xs text-gray-400">
                    {new Date(thread.lastTime).toLocaleDateString('en-US', {
                      day: 'numeric',
                      month: 'short',
                    })}
                  </p>
                </div>

                <div className="mt-0.5 flex items-center justify-between">
                  <p className="truncate text-xs text-gray-400">
                    {thread.roomTitle && (
                      <span className="text-blue-600">
                        🏠 {thread.roomTitle} ·{' '}
                      </span>
                    )}
                    {thread.lastMessage}
                  </p>

                  {thread.unread > 0 && (
                    <span className="ml-2 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs text-white">
                      {thread.unread}
                    </span>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  )
}
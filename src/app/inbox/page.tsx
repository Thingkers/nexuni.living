'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Search, Check, CheckCheck } from 'lucide-react'
import { supabase } from '@/lib/supabase'

type Thread = {
  otherId: string
  otherName: string
  otherAvatar?: string | null
  lastMessage: string
  lastTime: string
  unread: number
  lastMessageFromMe: boolean
  lastMessageRead: boolean
}

// Minimal shape we need from the realtime INSERT payload on `messages`
type NewMessagePayload = {
  sender_id: string
  receiver_id: string
}

export default function InboxPage() {
  const router = useRouter()
  const [threads, setThreads] = useState<Thread[]>([])
  const [loading, setLoading] = useState(true)
  const [pageError, setPageError] = useState('')
  const [search, setSearch] = useState('')

  const [myId, setMyId] = useState('')

  const filteredThreads = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return threads
    return threads.filter((t) => t.otherName.toLowerCase().includes(q))
  }, [threads, search])

  async function buildThreads(userId: string) {
    const { data: messages, error } = await supabase
      .from('messages')
      .select(`
        *,
        sender:profiles!messages_sender_id_fkey(id, full_name, avatar_url),
        receiver:profiles!messages_receiver_id_fkey(id, full_name, avatar_url)
      `)
      .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
      .order('created_at', { ascending: false })

    if (error) { setPageError(error.message); return }

    const threadMap = new Map<string, Thread>()
    for (const message of messages ?? []) {
      const otherId = message.sender_id === userId ? message.receiver_id : message.sender_id
      const other = message.sender_id === userId ? message.receiver : message.sender
      const key = [userId, otherId].sort().join('-')
      if (!threadMap.has(key)) {
        threadMap.set(key, {
          otherId,
          otherName: other?.full_name ?? 'Unknown',
          otherAvatar: other?.avatar_url ?? null,
          lastMessage: message.content,
          lastTime: message.created_at,
          unread: !message.is_read && message.receiver_id === userId ? 1 : 0,
          lastMessageFromMe: message.sender_id === userId,
          lastMessageRead: !!message.is_read,
        })
      } else {
        const thread = threadMap.get(key)
        if (thread && !message.is_read && message.receiver_id === userId) thread.unread += 1
      }
    }
    setThreads([...threadMap.values()])
  }

  useEffect(() => {
    async function loadInbox() {
      const { data: authData, error: authError } = await supabase.auth.getUser()
      if (authError || !authData.user) { router.push('/auth/login'); return }
      const userId = authData.user.id
      setMyId(userId)
      await buildThreads(userId)
      setLoading(false)
    }
    loadInbox()
  }, [router])

  // Realtime — rebuild thread list when a new message arrives
  useEffect(() => {
    if (!myId) return
    const channel = supabase
      .channel('inbox-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
        const msg = payload.new as NewMessagePayload
        if (msg.sender_id === myId || msg.receiver_id === myId) {
          buildThreads(myId)
        }
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [myId])

  if (loading) {
    return (
      <div className="mx-auto max-w-md px-4 py-6">
        <div className="mb-6 h-7 w-24 rounded-lg bg-gray-100 animate-pulse" />
        {[...Array(4)].map((_, i) => (
          <div key={i} className="mb-2 flex items-center gap-3 p-3">
            <div className="h-12 w-12 rounded-full bg-gray-100 animate-pulse" />
            <div className="flex-1">
              <div className="mb-1.5 h-4 w-1/3 rounded bg-gray-100 animate-pulse" />
              <div className="h-3 w-2/3 rounded bg-gray-100 animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (pageError) {
    return (
      <main className="mx-auto max-w-md px-4 py-10">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">{pageError}</div>
      </main>
    )
  }

  return (
    <main className="mx-auto max-w-md px-0 sm:px-4 py-0 sm:py-6">
      {/* Header */}
      <div className="sticky top-0 z-10 border-b border-gray-100 bg-white px-4 py-4 sm:rounded-t-2xl dark:border-gray-800 dark:bg-gray-900">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">Messages</h1>
        {threads.length > 0 && (
          <p className="text-xs text-gray-400">{threads.length} conversation{threads.length > 1 ? 's' : ''}</p>
        )}
        {threads.length > 0 && (
          <div className="relative mt-3">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" aria-hidden />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search messages"
              className="w-full rounded-full border border-gray-200 bg-gray-50 py-2.5 pl-9 pr-4 text-sm outline-none focus:border-teal-400 focus:bg-white dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-500"
            />
          </div>
        )}
      </div>

      {threads.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-teal-50">
            <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
          </div>
          <p className="text-sm font-medium text-gray-700">No messages yet</p>
          <p className="mt-1 text-xs text-gray-400">Start a conversation from a listing</p>
        </div>
      ) : filteredThreads.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <p className="text-sm text-gray-400">No conversations match &quot;{search}&quot;</p>
        </div>
      ) : (
        <div className="divide-y divide-gray-50 dark:divide-gray-800">
          {filteredThreads.map((thread) => {
            const initials = thread.otherName[0]?.toUpperCase() || 'U'
            const timeStr = new Date(thread.lastTime).toLocaleDateString('en-US', {
              day: 'numeric', month: 'short',
            })

            return (
              <Link
                key={thread.otherId}
                href={`/inbox/${thread.otherId}`}
                className="flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-gray-50 active:bg-gray-100 dark:hover:bg-gray-800 dark:active:bg-gray-700"
              >
                {/* Avatar */}
                <div className="relative shrink-0">
                  <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full bg-linear-to-br from-teal-400 to-teal-600 text-base font-semibold text-white shadow-sm">
                    {thread.otherAvatar ? (
                      <img src={thread.otherAvatar} alt={thread.otherName} className="h-full w-full object-cover" />
                    ) : (
                      initials
                    )}
                  </div>
                  {thread.unread > 0 && (
                    <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-teal-600 text-[10px] font-bold text-white ring-2 ring-white">
                      {thread.unread > 9 ? '9+' : thread.unread}
                    </span>
                  )}
                </div>

                {/* Content */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className={`truncate text-sm ${thread.unread > 0 ? 'font-semibold text-gray-900' : 'font-medium text-gray-800'}`}>
                      {thread.otherName}
                    </p>
                    <p className={`shrink-0 text-[11px] ${thread.unread > 0 ? 'font-medium text-teal-600' : 'text-gray-400'}`}>
                      {timeStr}
                    </p>
                  </div>
                  <p className={`mt-0.5 flex items-center gap-1 truncate text-xs ${thread.unread > 0 ? 'font-medium text-gray-700' : 'text-gray-400'}`}>
                    {thread.lastMessageFromMe && (
                      thread.lastMessageRead
                        ? <CheckCheck className="h-3.5 w-3.5 shrink-0 text-teal-500" aria-hidden />
                        : <Check className="h-3.5 w-3.5 shrink-0 text-gray-400" aria-hidden />
                    )}
                    <span className="truncate">{thread.lastMessage}</span>
                  </p>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </main>
  )
}
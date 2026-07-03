'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { useTypingIndicator } from '@/hooks/useTypingIndicator'

type ChatProfile = {
  id: string
  full_name: string | null
  university: string | null
  avatar_url: string | null
  email?: string | null
}

type Message = {
  id: string
  sender_id: string
  receiver_id: string
  content: string
  is_read: boolean
  created_at: string
}

function getDateLabel(dateStr: string) {
  const date = new Date(dateStr)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  if (date.toDateString() === today.toDateString()) return 'Today'
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday'
  return date.toLocaleDateString('en-US', { day: 'numeric', month: 'long' })
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export default function ChatPage() {
  const params = useParams<{ userId: string }>()
  const router = useRouter()
  const bottomRef = useRef<HTMLDivElement | null>(null)
  // The route param is interpolated into PostgREST .or() filters below —
  // only ever pass through a well-formed uuid (RLS already protects the
  // data; this just stops crafted URLs from producing broken queries).
  const otherUserId = UUID_RE.test(params.userId ?? '') ? params.userId : ''

  const MSG_PAGE_SIZE = 50

  const [myId, setMyId] = useState('')
  const [profile, setProfile] = useState<ChatProfile | null>(null)
  const [otherUser, setOtherUser] = useState<ChatProfile | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [hasOlderMessages, setHasOlderMessages] = useState(false)
  const [loadingOlder, setLoadingOlder] = useState(false)
  const myIdRef = useRef('')

  const { typingUsers, sendTyping } = useTypingIndicator({
    roomId: otherUserId ?? '',
    currentUserId: myId ?? '',
  })

  const lastEmailSentRef = useRef<number>(0)

  useEffect(() => {
    async function loadChat() {
      const { data: authData } = await supabase.auth.getUser()
      if (!authData.user) { router.push('/auth/login'); return }

      const currentUserId = authData.user.id

      if (currentUserId === otherUserId) {
        router.replace('/inbox')
        return
      }

      setMyId(currentUserId)
      myIdRef.current = currentUserId

      const [{ data: profileData }, { data: otherProfileData }] = await Promise.all([
        supabase.from('profiles').select('id, full_name, university, avatar_url').eq('id', currentUserId).single(),
        supabase.from('profiles').select('id, full_name, university, avatar_url, email').eq('id', otherUserId).single(),
      ])

      setProfile(profileData)
      setOtherUser(otherProfileData)

      const { data: messageData } = await supabase
        .from('messages')
        .select('*')
        .or(`and(sender_id.eq.${currentUserId},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${currentUserId})`)
        .order('created_at', { ascending: false })
        .limit(MSG_PAGE_SIZE)

      const ordered = (messageData ?? []).reverse()
      setMessages(ordered)
      setHasOlderMessages(ordered.length === MSG_PAGE_SIZE)

      await supabase.from('messages').update({ is_read: true })
        .eq('sender_id', otherUserId).eq('receiver_id', currentUserId)

      setLoading(false)
    }

    if (otherUserId) loadChat()
  }, [otherUserId, router])

  async function loadOlderMessages() {
    if (!messages.length || loadingOlder) return
    setLoadingOlder(true)
    const oldest = messages[0].created_at

    const { data } = await supabase
      .from('messages')
      .select('*')
      .or(`and(sender_id.eq.${myIdRef.current},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${myIdRef.current})`)
      .lt('created_at', oldest)
      .order('created_at', { ascending: false })
      .limit(MSG_PAGE_SIZE)

    const older = (data ?? []).reverse()
    setMessages((prev) => [...older, ...prev])
    setHasOlderMessages(older.length === MSG_PAGE_SIZE)
    setLoadingOlder(false)
  }

  useEffect(() => {
    if (!myId || !otherUserId) return

    const channel = supabase.channel('chat-messages')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, async (payload) => {
        const msg = payload.new as Message
        const isCurrentChat =
          (msg.sender_id === myId && msg.receiver_id === otherUserId) ||
          (msg.sender_id === otherUserId && msg.receiver_id === myId)
        if (!isCurrentChat) return
        setMessages((prev) => [...prev, msg])
        if (msg.sender_id === otherUserId) {
          await supabase.from('messages').update({ is_read: true }).eq('id', msg.id)
        }
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [myId, otherUserId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function sendMessage() {
    if (!content.trim() || !myId) return
    setSending(true)
    const text = content.trim()
    setContent('')

    const { error } = await supabase.from('messages').insert({
      sender_id: myId,
      receiver_id: otherUserId,
      content: text,
      is_read: false,
    })

    const ONE_HOUR = 60 * 60 * 1000
    if (!error && otherUser?.email && Date.now() - lastEmailSentRef.current > ONE_HOUR) {
      lastEmailSentRef.current = Date.now()
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.access_token) {
        fetch('/api/send-email', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ type: 'new-message', receiverId: otherUserId, message: text }),
        }).catch(() => {}) // best-effort notification — the message itself already sent
      }
    }

    setSending(false)
    if (error) { toast.error(error.message); setContent(text) }
  }

  // Pre-compute which messages need a date-separator label, instead of mutating
  // a `let` variable while mapping inside JSX (which React's compiler flags as
  // an unsafe render-time reassignment).
  const messagesWithDateLabels = useMemo(() => {
  return messages.map((message, index) => {
    const dateLabel = getDateLabel(message.created_at)
    const previousDateLabel = index > 0 ? getDateLabel(messages[index - 1].created_at) : null
    const showDateLabel = dateLabel !== previousDateLabel
    return { message, dateLabel, showDateLabel }
  })
}, [messages])

  if (loading) {
    return (
      <div className="mx-auto flex h-[calc(100vh-64px)] max-w-2xl flex-col">
        <div className="border-b border-gray-100 px-4 py-3">
          <div className="h-5 w-32 rounded bg-gray-100 animate-pulse" />
        </div>
        <div className="flex-1 space-y-3 p-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className={`flex ${i % 2 === 0 ? 'justify-start' : 'justify-end'}`}>
              <div className="h-10 w-48 rounded-2xl bg-gray-100 animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  const myInitials = profile?.full_name?.[0]?.toUpperCase() || 'M'
  const otherInitials = otherUser?.full_name?.[0]?.toUpperCase() || 'U'

  return (
    <div className="mx-auto flex h-[calc(100vh-64px)] max-w-2xl flex-col">

      {/* Header */}
      <div className="flex shrink-0 items-center gap-3 border-b border-gray-100 bg-white px-4 py-3 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <Link
          href="/inbox"
          className="flex h-8 w-8 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800 dark:hover:text-gray-200"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
        </Link>

        <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-linear-to-br from-teal-400 to-teal-600 text-sm font-semibold text-white">
          {otherUser?.avatar_url
            ? <img src={otherUser.avatar_url} alt="" className="h-full w-full object-cover" />
            : otherInitials}
        </div>

        <div className="flex-1">
          <p className="text-sm font-semibold text-gray-900 dark:text-white">{otherUser?.full_name || 'User'}</p>
          {otherUser?.university && <p className="text-xs text-gray-400">{otherUser.university}</p>}
        </div>

        <Link
          href={'/users/' + otherUserId}
          className="rounded-xl border border-gray-200 px-3 py-1.5 text-xs text-gray-500 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
        >
          Profile
        </Link>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto bg-gray-50 px-4 py-4 dark:bg-gray-950">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-teal-50">
              <span className="text-2xl">👋</span>
            </div>
            <p className="text-sm font-medium text-gray-700">Say hello to {otherUser?.full_name}!</p>
            <p className="mt-1 text-xs text-gray-400">Start the conversation</p>
          </div>
        ) : (
          <div className="space-y-1">
            {hasOlderMessages && (
              <div className="mb-3 flex justify-center">
                <button
                  onClick={loadOlderMessages}
                  disabled={loadingOlder}
                  className="rounded-full border border-gray-200 bg-white px-4 py-1.5 text-xs text-gray-500 shadow-sm hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400"
                >
                  {loadingOlder ? 'Loading...' : '↑ Load older messages'}
                </button>
              </div>
            )}
            {messagesWithDateLabels.map(({ message, dateLabel, showDateLabel }) => {
              const isMine = message.sender_id === myId

              return (
                <div key={message.id}>
                  {showDateLabel && (
                    <div className="my-4 flex justify-center">
                      <span className="rounded-full bg-gray-200/70 px-3 py-1 text-[11px] text-gray-500 dark:bg-gray-700/70 dark:text-gray-400">
                        {dateLabel}
                      </span>
                    </div>
                  )}

                  <div className={`flex items-end gap-2 ${isMine ? 'justify-end' : 'justify-start'}`}>
                    {!isMine && (
                      <div className="mb-1 flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full bg-linear-to-br from-teal-400 to-teal-600 text-xs font-semibold text-white">
                        {otherUser?.avatar_url
                          ? <img src={otherUser.avatar_url} alt="" className="h-full w-full object-cover" />
                          : otherInitials}
                      </div>
                    )}

                    <div className={`max-w-[70%] rounded-2xl px-3.5 py-2.5 text-sm shadow-sm ${
                      isMine
                        ? 'rounded-br-sm bg-teal-600 text-white'
                        : 'rounded-bl-sm bg-white text-gray-800 dark:bg-gray-800 dark:text-gray-100'
                    }`}>
                      <p className="leading-relaxed">{message.content}</p>
                      <p className={`mt-1 text-right text-[10px] ${isMine ? 'text-teal-200' : 'text-gray-400'}`}>
                        {new Date(message.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>

                    {isMine && (
                      <div className="mb-1 flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gray-300 text-xs font-semibold text-white">
                        {profile?.avatar_url
                          ? <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" />
                          : myInitials}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}

            {typingUsers.length > 0 && (
              <div className="flex items-end gap-2">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full bg-linear-to-br from-teal-400 to-teal-600 text-xs font-semibold text-white">
                  {otherUser?.avatar_url
                    ? <img src={otherUser.avatar_url} alt="" className="h-full w-full object-cover" />
                    : otherInitials}
                </div>
                <div className="rounded-2xl rounded-bl-sm bg-white px-4 py-3 shadow-sm dark:bg-gray-800">
                  <div className="flex gap-1">
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-400" style={{ animationDelay: '0ms' }} />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-400" style={{ animationDelay: '150ms' }} />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-400" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* Input */}
      <div className="shrink-0 border-t border-gray-100 bg-white px-4 py-3 dark:border-gray-800 dark:bg-gray-900">
        <div className="flex items-center gap-2">
          <input
            value={content}
            onChange={(e) => { setContent(e.target.value); sendTyping(profile?.full_name || 'Someone') }}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
            placeholder="Write a message..."
            className="flex-1 rounded-full border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none focus:border-teal-400 focus:bg-white transition-colors dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-500 dark:focus:bg-gray-800"
          />
          <button
            onClick={sendMessage}
            disabled={sending || !content.trim()}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-teal-600 text-white shadow-sm hover:bg-teal-700 disabled:opacity-40 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
              <line x1="22" y1="2" x2="11" y2="13"/>
              <polygon points="22 2 15 22 11 13 2 9 22 2"/>
            </svg>
          </button>
        </div>
      </div>

    </div>
  )
}
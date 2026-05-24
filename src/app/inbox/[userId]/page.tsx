'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'

import { supabase } from '@/lib/supabase'

export default function ChatPage() {
  const params = useParams<{ userId: string }>()
  const router = useRouter()
  const bottomRef = useRef<HTMLDivElement | null>(null)

  const otherUserId = params.userId

  const [myId, setMyId] = useState('')
  const [otherUser, setOtherUser] = useState<any>(null)
  const [messages, setMessages] = useState<any[]>([])
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)

  useEffect(() => {
    async function loadChat() {
      const { data: authData } = await supabase.auth.getUser()

      if (!authData.user) {
        router.push('/auth/login')
        return
      }

      const currentUserId = authData.user.id
      setMyId(currentUserId)

      const { data: profileData } = await supabase
        .from('profiles')
        .select('id, full_name, university')
        .eq('id', otherUserId)
        .single()

      setOtherUser(profileData)

      const { data: messageData } = await supabase
        .from('messages')
        .select('*')
        .or(
          `and(sender_id.eq.${currentUserId},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${currentUserId})`,
        )
        .order('created_at', { ascending: true })

      setMessages(messageData ?? [])

      await supabase
        .from('messages')
        .update({ is_read: true })
        .eq('sender_id', otherUserId)
        .eq('receiver_id', currentUserId)

      setLoading(false)
    }

    if (otherUserId) loadChat()
  }, [otherUserId, router])

  useEffect(() => {
    if (!myId || !otherUserId) return

    const channel = supabase
      .channel('chat-messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        },
        async (payload) => {
          const newMessage: any = payload.new

          const isCurrentChat =
            (newMessage.sender_id === myId &&
              newMessage.receiver_id === otherUserId) ||
            (newMessage.sender_id === otherUserId &&
              newMessage.receiver_id === myId)

          if (!isCurrentChat) return

          setMessages((prev) => [...prev, newMessage])

          if (newMessage.sender_id === otherUserId) {
            await supabase
              .from('messages')
              .update({ is_read: true })
              .eq('id', newMessage.id)
          }
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
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

    setSending(false)

    if (error) {
      alert(error.message)
      setContent(text)
    }
  }

  if (loading) {
    return <div className="p-10 text-gray-500">Loading chat...</div>
  }

  return (
    <main className="mx-auto flex h-[calc(100vh-80px)] max-w-2xl flex-col px-4 py-6">
      <div className="mb-4 flex items-center gap-3 border-b border-gray-100 pb-4">
        <Link href="/inbox" className="text-sm text-gray-400 hover:text-gray-700">
          ← Inbox
        </Link>

        <div className="ml-auto text-right">
          <p className="text-sm font-semibold text-gray-900">
            {otherUser?.full_name || 'User'}
          </p>
          <p className="text-xs text-gray-400">
            {otherUser?.university || 'University not added'}
          </p>
        </div>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto rounded-2xl bg-gray-50 p-4">
        {messages.length === 0 ? (
          <div className="py-20 text-center text-sm text-gray-400">
            No messages yet. Start the conversation.
          </div>
        ) : (
          messages.map((message) => {
            const isMine = message.sender_id === myId

            return (
              <div
                key={message.id}
                className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm ${
                    isMine
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-gray-700'
                  }`}
                >
                  <p>{message.content}</p>
                  <p
                    className={`mt-1 text-[10px] ${
                      isMine ? 'text-blue-100' : 'text-gray-400'
                    }`}
                  >
                    {new Date(message.created_at).toLocaleTimeString('en-US', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
              </div>
            )
          })
        )}

        <div ref={bottomRef} />
      </div>

      <div className="mt-4 flex gap-2">
        <input
          value={content}
          onChange={(event) => setContent(event.target.value)}
          onKeyDown={(event) => event.key === 'Enter' && sendMessage()}
          placeholder="Write a message..."
          className="flex-1 rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-blue-500"
        />

        <button
          onClick={sendMessage}
          disabled={sending}
          className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {sending ? 'Sending...' : 'Send'}
        </button>
      </div>
    </main>
  )
}
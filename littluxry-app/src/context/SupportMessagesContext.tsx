'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

export type SupportMessageType =
  | 'product_request'
  | 'order_request'
  | 'support'
  | 'general'

export type SupportMessageStatus = 'new' | 'read' | 'archived'

export type SupportMessage = {
  id: string
  type: SupportMessageType
  status: SupportMessageStatus
  name: string
  email: string
  phone?: string
  subject: string
  body: string
  productHint?: string
  orderHint?: string
  createdAt: string
  source: 'storefront-chat'
}

type SupportMessagesContextValue = {
  hydrated: boolean
  messages: SupportMessage[]
  unreadCount: number
  addMessage: (
    input: Omit<SupportMessage, 'id' | 'status' | 'createdAt' | 'source'>,
  ) => SupportMessage
  markRead: (id: string) => void
  markAllRead: () => void
  archive: (id: string) => void
  remove: (id: string) => void
}

const STORAGE_KEY = 'littluxry_support_messages'
const SupportMessagesContext =
  createContext<SupportMessagesContextValue | null>(null)

export function SupportMessagesProvider({ children }: { children: ReactNode }) {
  const [messages, setMessages] = useState<SupportMessage[]>([])
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) setMessages(JSON.parse(raw) as SupportMessage[])
    } catch {
      /* ignore */
    }
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (!hydrated) return
    localStorage.setItem(STORAGE_KEY, JSON.stringify(messages))
  }, [messages, hydrated])

  const addMessage = useCallback(
    (input: Omit<SupportMessage, 'id' | 'status' | 'createdAt' | 'source'>) => {
      const msg: SupportMessage = {
        ...input,
        id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        status: 'new',
        createdAt: new Date().toISOString(),
        source: 'storefront-chat',
      }
      setMessages((prev) => [msg, ...prev])
      return msg
    },
    [],
  )

  const markRead = useCallback((id: string) => {
    setMessages((prev) =>
      prev.map((m) => (m.id === id && m.status === 'new' ? { ...m, status: 'read' } : m)),
    )
  }, [])

  const markAllRead = useCallback(() => {
    setMessages((prev) =>
      prev.map((m) => (m.status === 'new' ? { ...m, status: 'read' } : m)),
    )
  }, [])

  const archive = useCallback((id: string) => {
    setMessages((prev) =>
      prev.map((m) => (m.id === id ? { ...m, status: 'archived' } : m)),
    )
  }, [])

  const remove = useCallback((id: string) => {
    setMessages((prev) => prev.filter((m) => m.id !== id))
  }, [])

  const unreadCount = useMemo(
    () => messages.filter((m) => m.status === 'new').length,
    [messages],
  )

  const value = useMemo(
    () => ({
      hydrated,
      messages,
      unreadCount,
      addMessage,
      markRead,
      markAllRead,
      archive,
      remove,
    }),
    [
      hydrated,
      messages,
      unreadCount,
      addMessage,
      markRead,
      markAllRead,
      archive,
      remove,
    ],
  )

  return (
    <SupportMessagesContext.Provider value={value}>
      {children}
    </SupportMessagesContext.Provider>
  )
}

export function useSupportMessages() {
  const ctx = useContext(SupportMessagesContext)
  if (!ctx) {
    throw new Error('useSupportMessages must be used within SupportMessagesProvider')
  }
  return ctx
}

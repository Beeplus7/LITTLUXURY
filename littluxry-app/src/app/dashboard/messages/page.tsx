'use client'

import { useMemo, useState } from 'react'
import {
  Archive,
  CheckCheck,
  Inbox,
  Mail,
  Package,
  ShoppingBag,
  Trash2,
  LifeBuoy,
} from 'lucide-react'
import {
  useSupportMessages,
  type SupportMessage,
  type SupportMessageType,
} from '@/context/SupportMessagesContext'
import { cn } from '@/lib/cn'
import { useToast } from '@/lib/toast'

type Filter = 'all' | 'new' | SupportMessageType

const TYPE_META: Record<
  SupportMessageType,
  { label: string; icon: typeof Inbox }
> = {
  product_request: { label: 'Product request', icon: Package },
  order_request: { label: 'Order request', icon: ShoppingBag },
  support: { label: 'Support', icon: LifeBuoy },
  general: { label: 'General', icon: Mail },
}

export default function MessagesPage() {
  const { messages, unreadCount, markRead, markAllRead, archive, remove } =
    useSupportMessages()
  const { toast } = useToast()
  const [filter, setFilter] = useState<Filter>('all')
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const visible = useMemo(() => {
    return messages.filter((m) => {
      if (filter === 'all') return m.status !== 'archived'
      if (filter === 'new') return m.status === 'new'
      return m.type === filter && m.status !== 'archived'
    })
  }, [messages, filter])

  const selected =
    visible.find((m) => m.id === selectedId) ||
    messages.find((m) => m.id === selectedId) ||
    null

  function openMessage(m: SupportMessage) {
    setSelectedId(m.id)
    if (m.status === 'new') markRead(m.id)
  }

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="serif text-[28px] tracking-tight lg:text-[32px]">
            Messages
          </h1>
          <p className="mt-1 text-[13px] text-[#8a8a8a]">
            Concierge inbox · product requests, order help, and support
            {unreadCount ? ` · ${unreadCount} new` : ''}
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            markAllRead()
            toast('All marked read')
          }}
          className="inline-flex items-center gap-2 rounded-full border border-[#2a2a2a] px-4 py-2 text-[12px] text-[#e8e6e1]"
        >
          <CheckCheck size={14} />
          Mark all read
        </button>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {(
          [
            ['all', 'All'],
            ['new', 'New'],
            ['product_request', 'Products'],
            ['order_request', 'Orders'],
            ['support', 'Support'],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setFilter(id)}
            className={cn(
              'rounded-full border px-3 py-1 text-[11px] uppercase tracking-wider',
              filter === id
                ? 'border-[#D4AF37]/50 bg-[#D4AF37]/15 text-[#D4AF37]'
                : 'border-[#2a2a2a] text-[#8a8a8a]',
            )}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        <div className="max-h-[70vh] overflow-y-auto rounded-2xl border border-white/10 bg-[#111]">
          {visible.length === 0 ? (
            <div className="grid place-items-center gap-2 px-4 py-16 text-center text-sm text-[#6a6a6a]">
              <Inbox size={22} />
              No messages yet. Storefront chat will land here.
            </div>
          ) : (
            <ul>
              {visible.map((m) => {
                const Meta = TYPE_META[m.type]
                const Icon = Meta.icon
                return (
                  <li key={m.id}>
                    <button
                      type="button"
                      onClick={() => openMessage(m)}
                      className={cn(
                        'flex w-full gap-3 border-b border-white/5 px-3 py-3 text-left transition hover:bg-white/[0.03]',
                        selected?.id === m.id && 'bg-[#D4AF37]/10',
                      )}
                    >
                      <span
                        className={cn(
                          'mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full',
                          m.status === 'new'
                            ? 'bg-[#D4AF37]/20 text-[#D4AF37]'
                            : 'bg-white/5 text-[#8a8a8a]',
                        )}
                      >
                        <Icon size={14} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2">
                          <span className="truncate text-[13px] font-medium text-[#e8e6e1]">
                            {m.name}
                          </span>
                          {m.status === 'new' ? (
                            <span className="h-1.5 w-1.5 rounded-full bg-[#D4AF37]" />
                          ) : null}
                        </span>
                        <span className="mt-0.5 block truncate text-[12px] text-[#8a8a8a]">
                          {m.subject}
                        </span>
                        <span className="mt-1 block text-[10px] uppercase tracking-wider text-[#5a5a5a]">
                          {Meta.label} ·{' '}
                          {new Date(m.createdAt).toLocaleString()}
                        </span>
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        <div className="min-h-[360px] rounded-2xl border border-white/10 bg-[#111] p-5">
          {!selected ? (
            <div className="grid h-full min-h-[320px] place-items-center text-sm text-[#6a6a6a]">
              Select a message to read
            </div>
          ) : (
            <div>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.16em] text-[#D4AF37]">
                    {TYPE_META[selected.type].label}
                  </p>
                  <h2 className="mt-1 text-xl font-medium text-[#e8e6e1]">
                    {selected.subject}
                  </h2>
                  <p className="mt-2 text-sm text-[#8a8a8a]">
                    From {selected.name} ·{' '}
                    <a
                      href={`mailto:${selected.email}`}
                      className="text-[#D4AF37] hover:underline"
                    >
                      {selected.email}
                    </a>
                    {selected.phone ? ` · ${selected.phone}` : ''}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      archive(selected.id)
                      toast('Archived')
                      setSelectedId(null)
                    }}
                    className="inline-flex items-center gap-1.5 rounded-full border border-white/10 px-3 py-1.5 text-[11px] uppercase tracking-wider text-[#b8b0a4]"
                  >
                    <Archive size={12} />
                    Archive
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      remove(selected.id)
                      toast('Deleted')
                      setSelectedId(null)
                    }}
                    className="inline-flex items-center gap-1.5 rounded-full border border-white/10 px-3 py-1.5 text-[11px] uppercase tracking-wider text-[#b8b0a4]"
                  >
                    <Trash2 size={12} />
                    Delete
                  </button>
                </div>
              </div>

              {(selected.productHint || selected.orderHint) && (
                <div className="mt-4 flex flex-wrap gap-2 text-[11px]">
                  {selected.productHint ? (
                    <span className="rounded-full border border-white/10 px-2.5 py-1 text-[#b8b0a4]">
                      Product: {selected.productHint}
                    </span>
                  ) : null}
                  {selected.orderHint ? (
                    <span className="rounded-full border border-white/10 px-2.5 py-1 text-[#b8b0a4]">
                      Order: {selected.orderHint}
                    </span>
                  ) : null}
                </div>
              )}

              <div className="mt-6 rounded-xl border border-white/10 bg-black/40 p-4 text-sm leading-relaxed text-[#e8e6e1]">
                {selected.body}
              </div>

              <a
                href={`mailto:${selected.email}?subject=${encodeURIComponent(`Re: ${selected.subject}`)}`}
                className="mt-5 inline-flex rounded-full bg-[#D4AF37] px-4 py-2.5 text-[12px] font-semibold text-black"
              >
                Reply by email
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

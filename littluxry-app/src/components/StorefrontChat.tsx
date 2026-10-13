'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { MessageCircle, Send, Loader2, X, Sparkles } from 'lucide-react'
import { useProducts } from '@/context/ProductsContext'
import { useSupportMessages } from '@/context/SupportMessagesContext'
import { useToast } from '@/lib/toast'
import {
  buildMessagePayload,
  formatProductRecs,
  interpretStorefrontMessage,
  matchProducts,
  suggestionsFor,
  type ChatMsg,
  type PendingRequest,
} from '@/lib/storefrontChat'
import { cn } from '@/lib/cn'

const HIDDEN_PREFIXES = ['/dashboard', '/admin', '/signin', '/signup', '/auth']

export function StorefrontChat() {
  const pathname = usePathname() || '/'
  const hidden = HIDDEN_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  )
  const { products } = useProducts()
  const { addMessage } = useSupportMessages()
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState('')
  const [thinking, setThinking] = useState(false)
  const [pending, setPending] = useState<PendingRequest | null>(null)
  const [suggestions, setSuggestions] = useState(suggestionsFor(null))
  const [messages, setMessages] = useState<ChatMsg[]>([
    {
      role: 'assistant',
      text: 'Hi — I’m the LITTLUXRY concierge. Ask for products, leave a product request, get order help, or message admin/support.',
    },
  ])
  const endRef = useRef<HTMLDivElement>(null)
  const pendingRef = useRef<PendingRequest | null>(null)
  pendingRef.current = pending

  useEffect(() => {
    if (open) endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, thinking, open])

  if (hidden) return null

  function push(role: ChatMsg['role'], text: string) {
    setMessages((m) => [...m, { role, text }])
  }

  async function handlePrompt(raw: string) {
    const prompt = raw.trim()
    if (!prompt || thinking) return
    push('user', prompt)
    setInput('')
    setThinking(true)
    try {
      await new Promise((r) => setTimeout(r, 220))
      let working = pendingRef.current
      const turn = interpretStorefrontMessage(prompt, working)

      for (const action of turn.actions) {
        if (action.type === 'start_request') {
          working = {
            type: action.requestType,
            productHint:
              action.requestType === 'product_request'
                ? action.seed
                : undefined,
            orderHint:
              action.requestType === 'order_request' ? action.seed : undefined,
          }
        }
        if (action.type === 'set_field' && working) {
          working = { ...working, [action.field]: action.value }
        }
        if (action.type === 'cancel_request') working = null
      }

      pendingRef.current = working
      setPending(working)

      if (turn.reply && !turn.actions.some((a) => a.type === 'recommend')) {
        push('assistant', turn.reply)
      }
      if (turn.suggestions?.length) setSuggestions(turn.suggestions)

      for (const action of turn.actions) {
        if (action.type === 'recommend') {
          push('assistant', formatProductRecs(matchProducts(products, action.query)))
        }
        if (action.type === 'submit_request') {
          const current = pendingRef.current
          if (!current?.email || !current.details) {
            push(
              'assistant',
              'I still need your email and request details before sending.',
            )
          } else {
            const payload = buildMessagePayload(current)
            const saved = addMessage(payload)
            setPending(null)
            pendingRef.current = null
            const kind = payload.type.split('_').join(' ')
            push(
              'assistant',
              `Sent. Admin/support has your ${kind} (ref ${saved.id.slice(-6)}). We’ll reply at ${payload.email}.`,
            )
            toast('Message sent to support')
            setSuggestions(suggestionsFor(null))
          }
        }
        if (action.type === 'cancel_request') {
          setPending(null)
          pendingRef.current = null
          setSuggestions(suggestionsFor(null))
        }
      }
    } finally {
      setThinking(false)
    }
  }

  return (
    <div className="fixed bottom-[72px] right-4 z-[55] md:bottom-6 md:right-6">
      {open ? (
        <div className="mb-3 flex h-[min(560px,70vh)] w-[min(100vw-2rem,380px)] flex-col overflow-hidden rounded-2xl border border-white/10 bg-zinc-950 shadow-2xl">
          <div className="flex items-center justify-between gap-2 border-b border-white/10 bg-black/40 px-3 py-2.5">
            <div className="flex items-center gap-2">
              <span className="grid h-8 w-8 place-items-center rounded-full bg-[#D4AF37]/15 text-[#D4AF37]">
                <Sparkles size={14} />
              </span>
              <div>
                <p className="text-sm font-semibold text-[#f5f0e8]">
                  LITTLUXRY Concierge
                </p>
                <p className="text-[10px] uppercase tracking-[0.14em] text-[#6a655c]">
                  Products · Orders · Support
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="grid h-8 w-8 place-items-center rounded-full text-[#b8b0a4] hover:bg-white/5 hover:text-white"
              aria-label="Close chat"
            >
              <X size={16} />
            </button>
          </div>

          {pending ? (
            <div className="border-b border-[#D4AF37]/20 bg-[#D4AF37]/10 px-3 py-1.5 text-[11px] text-[#D4AF37]">
              Collecting {pending.type.split('_').join(' ')}
              {pending.name ? ` · ${pending.name}` : ''}
              {pending.email ? ` · ${pending.email}` : ''}
            </div>
          ) : null}

          <div className="flex-1 space-y-2.5 overflow-y-auto p-3 text-[13px]">
            {messages.map((m, i) => (
              <div
                key={i}
                className={cn(
                  'whitespace-pre-wrap rounded-2xl px-3 py-2',
                  m.role === 'user'
                    ? 'ml-8 bg-[#D4AF37]/15 text-[#f5f0e8]'
                    : 'mr-6 bg-zinc-900 text-[#b8b0a4]',
                )}
              >
                {m.text.split('\n').map((line, li) => {
                  const shop = line.match(/·\s*(\/shop\/[^\s]+)\s*$/)
                  if (shop) {
                    const href = shop[1]
                    const label = line.replace(/\s*·\s*\/shop\/[^\s]+$/, '')
                    return (
                      <p key={li} className="leading-relaxed">
                        {label}{' '}
                        <Link
                          href={href}
                          className="text-[#D4AF37] underline-offset-2 hover:underline"
                          onClick={() => setOpen(false)}
                        >
                          View
                        </Link>
                      </p>
                    )
                  }
                  return (
                    <p key={li} className="leading-relaxed">
                      {line || '\u00a0'}
                    </p>
                  )
                })}
              </div>
            ))}
            {thinking ? (
              <div className="mr-6 inline-flex items-center gap-2 rounded-2xl bg-zinc-900 px-3 py-2 text-[#6a655c]">
                <Loader2 size={14} className="animate-spin text-[#D4AF37]" />
                One moment…
              </div>
            ) : null}
            <div ref={endRef} />
          </div>

          {suggestions.length ? (
            <div className="flex flex-wrap gap-1.5 border-t border-white/5 px-3 pt-2">
              {suggestions.map((s) => (
                <button
                  key={s}
                  type="button"
                  disabled={thinking}
                  onClick={() => void handlePrompt(s)}
                  className="rounded-full border border-white/10 px-2.5 py-1 text-[10px] text-[#b8b0a4] hover:border-[#D4AF37]/40 hover:text-[#D4AF37] disabled:opacity-50"
                >
                  {s}
                </button>
              ))}
            </div>
          ) : null}

          <form
            className="flex gap-2 p-3"
            onSubmit={(e) => {
              e.preventDefault()
              void handlePrompt(input)
            }}
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={thinking}
              placeholder="Ask about products, orders, support…"
              className="flex-1 rounded-full border border-white/10 bg-black px-3 py-2 text-sm outline-none focus:border-[#D4AF37]/50 disabled:opacity-60"
            />
            <button
              type="submit"
              disabled={thinking || !input.trim()}
              className="grid h-10 w-10 place-items-center rounded-full bg-[#D4AF37] text-black disabled:opacity-50"
            >
              <Send size={16} />
            </button>
          </form>
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="ml-auto flex items-center gap-2 rounded-full bg-[#D4AF37] px-4 py-3 text-[12px] font-semibold uppercase tracking-[0.14em] text-black shadow-lg transition hover:brightness-110"
        aria-label={open ? 'Close concierge chat' : 'Open concierge chat'}
      >
        {open ? <X size={16} /> : <MessageCircle size={16} />}
        <span className="hidden sm:inline">{open ? 'Close' : 'Chat'}</span>
      </button>
    </div>
  )
}

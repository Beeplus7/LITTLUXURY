'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { ShoppingBag, X } from 'lucide-react'
import { useCart } from '@/context/CartContext'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/cn'

const REMIND_AFTER_MS = 3 * 60 * 1000
const EMAIL_KEY = 'littluxry_cart_recovery_email'
const LAST_SHOWN_KEY = 'littluxry_cart_recovery_shown_at'
const CART_TOUCH_KEY = 'littluxry_cart_touched_at'

export function CartRecoveryReminder() {
  const { cartItems, total, subtotal } = useCart()
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [sending, setSending] = useState(false)
  const [note, setNote] = useState('')
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    try {
      const saved = localStorage.getItem(EMAIL_KEY)
      if (saved) setEmail(saved)
    } catch {
      /* ignore */
    }
  }, [])

  useEffect(() => {
    if (!cartItems.length) {
      setOpen(false)
      return
    }
    if (pathname.startsWith('/checkout') || pathname.startsWith('/dashboard')) {
      setOpen(false)
      return
    }

    try {
      localStorage.setItem(CART_TOUCH_KEY, String(Date.now()))
    } catch {
      /* ignore */
    }

    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => {
      try {
        const last = Number(localStorage.getItem(LAST_SHOWN_KEY) || 0)
        if (Date.now() - last < 30 * 60 * 1000) return
        localStorage.setItem(LAST_SHOWN_KEY, String(Date.now()))
      } catch {
        /* ignore */
      }
      setOpen(true)
      setNote('Your bag is waiting — finish with Visa or credit via PayPal.')
    }, REMIND_AFTER_MS)

    return () => {
      if (timer.current) clearTimeout(timer.current)
    }
  }, [cartItems, pathname])

  async function sendReminder() {
    if (!email.includes('@') || !cartItems.length) {
      setNote('Enter your email to get a cart recovery link.')
      return
    }
    setSending(true)
    setNote('')
    try {
      localStorage.setItem(EMAIL_KEY, email.trim().toLowerCase())
      const res = await fetch('/api/cart-recovery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          items: cartItems,
          total,
          source: 'in-app-reminder',
        }),
      })
      const data = (await res.json()) as {
        ok?: boolean
        skipped?: boolean
        error?: string
        hint?: string
      }
      if (!res.ok || !data.ok) {
        throw new Error(data.hint || data.error || 'Could not send reminder')
      }
      setNote(
        data.skipped
          ? 'Reminder already sent recently — check your inbox.'
          : `Recovery email sent to ${email.trim()}.`,
      )
    } catch (e) {
      setNote(e instanceof Error ? e.message : 'Send failed')
    } finally {
      setSending(false)
    }
  }

  if (!open || !cartItems.length) return null

  return (
    <div className="fixed inset-x-3 bottom-3 z-[55] mx-auto max-w-md md:inset-x-auto md:right-5 md:bottom-5">
      <div className="rounded-2xl border border-[#D4AF37]/35 bg-[#111]/95 p-4 shadow-[0_20px_60px_rgba(0,0,0,0.55)] backdrop-blur-xl">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 grid h-9 w-9 place-items-center rounded-full bg-[#D4AF37]/15 text-[#D4AF37]">
              <ShoppingBag size={16} />
            </span>
            <div>
              <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-[#D4AF37]">
                Cart recovery
              </p>
              <p className="mt-1 text-sm text-[#e8e6e1]">
                {cartItems.length} item{cartItems.length === 1 ? '' : 's'} · $
                {subtotal}
              </p>
              <p className="mt-1 text-[12px] text-[#b8b0a4]">
                {note ||
                  'Complete checkout anytime — Visa or credit using PayPal.'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="grid h-8 w-8 place-items-center rounded-full border border-white/10 text-[#b8b0a4]"
            aria-label="Dismiss"
          >
            <X size={14} />
          </button>
        </div>
        <label className="block text-[11px] text-[#b8b0a4]">
          Email for recovery reminder
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@email.com"
            className="mt-1 w-full rounded-xl border border-white/10 bg-black px-3 py-2 text-sm text-white outline-none focus:border-[#D4AF37]/50"
          />
        </label>
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            disabled={sending}
            onClick={() => void sendReminder()}
            className={cn(
              'flex-1 rounded-full border border-white/15 py-2.5 text-[11px] uppercase tracking-wider text-[#e8e6e1] disabled:opacity-60',
            )}
          >
            {sending ? 'Sending…' : 'Email me my bag'}
          </button>
          <Link
            href="/checkout"
            onClick={() => setOpen(false)}
            className="flex-1 rounded-full bg-[#0070BA] py-2.5 text-center text-[11px] font-semibold uppercase tracking-wider text-white"
          >
            Pay with PayPal
          </Link>
        </div>
      </div>
    </div>
  )
}

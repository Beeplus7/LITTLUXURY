'use client'

import { Suspense, useEffect, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Check, Mail } from 'lucide-react'
import { useCart } from '@/context/CartContext'
import { Footer } from '@/components/Footer'

function SuccessInner() {
  const params = useSearchParams()
  const { clearCart, setCartOpen } = useCart()
  const sessionId = params.get('session_id')
  const [emailStatus, setEmailStatus] = useState<
    'sending' | 'sent' | 'skipped' | 'error' | 'idle'
  >('idle')
  const [emailNote, setEmailNote] = useState('')

  useEffect(() => {
    clearCart()
    setCartOpen(false)
  }, [clearCart, setCartOpen])

  useEffect(() => {
    if (!sessionId) return
    let cancelled = false
    setEmailStatus('sending')
    void (async () => {
      try {
        const res = await fetch('/api/checkout/confirm', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId }),
        })
        const data = (await res.json()) as {
          ok?: boolean
          skipped?: boolean
          to?: string
          error?: string
          hint?: string
          stripeReceipt?: boolean
        }
        if (cancelled) return
        if (data.ok) {
          setEmailStatus(data.skipped ? 'skipped' : 'sent')
          setEmailNote(
            data.skipped
              ? 'Confirmation email was already sent.'
              : `Confirmation emailed to ${data.to || 'you'}.`,
          )
          return
        }
        setEmailStatus('error')
        setEmailNote(
          data.hint ||
            data.error ||
            'Could not send branded email. Stripe may still send a receipt.',
        )
      } catch {
        if (!cancelled) {
          setEmailStatus('error')
          setEmailNote(
            'Could not send branded email. Stripe may still send a receipt.',
          )
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [sessionId])

  return (
    <div>
      <section className="mx-auto grid min-h-[60vh] max-w-xl place-items-center px-5 py-16 text-center">
        <div>
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-[#D4AF37] text-black">
            <Check size={28} strokeWidth={2.5} />
          </span>
          <p className="mt-6 text-[11px] uppercase tracking-[0.2em] text-[#D4AF37]">
            Payment confirmed
          </p>
          <h1 className="serif mt-2 text-4xl">Thank you</h1>
          <p className="mt-3 text-sm text-[#b8b0a4]">
            Your Stripe payment went through. We’re sending your order
            confirmation now.
          </p>

          <div className="mx-auto mt-6 flex max-w-sm items-start gap-3 rounded-2xl border border-white/10 bg-zinc-950 px-4 py-3 text-left">
            <Mail size={16} className="mt-0.5 shrink-0 text-[#D4AF37]" />
            <div>
              <p className="text-[12px] font-medium text-white">
                {emailStatus === 'sending'
                  ? 'Sending confirmation…'
                  : emailStatus === 'sent'
                    ? 'Confirmation sent'
                    : emailStatus === 'skipped'
                      ? 'Confirmation already sent'
                      : emailStatus === 'error'
                        ? 'Email notice'
                        : 'Confirmation'}
              </p>
              <p className="mt-1 text-[12px] text-[#b8b0a4]">
                {emailNote ||
                  (sessionId
                    ? 'Preparing your receipt…'
                    : 'Open this page from Stripe to trigger email.')}
              </p>
            </div>
          </div>

          {sessionId ? (
            <p className="mt-3 break-all text-[11px] text-[#6a655c]">
              Ref · {sessionId}
            </p>
          ) : null}
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              href="/shop"
              className="rounded-full bg-[#D4AF37] px-6 py-3 text-[12px] font-semibold uppercase tracking-[0.14em] text-black"
            >
              Continue shopping
            </Link>
            <Link
              href="/"
              className="rounded-full border border-white/15 px-6 py-3 text-[12px] uppercase tracking-[0.14em] text-[#b8b0a4]"
            >
              Home
            </Link>
          </div>
        </div>
      </section>
      <Footer />
    </div>
  )
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="grid min-h-[40vh] place-items-center text-[#b8b0a4]">
          Confirming payment…
        </div>
      }
    >
      <SuccessInner />
    </Suspense>
  )
}

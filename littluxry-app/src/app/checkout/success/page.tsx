'use client'

import { Suspense, useEffect } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Check } from 'lucide-react'
import { useCart } from '@/context/CartContext'
import { Footer } from '@/components/Footer'

function SuccessInner() {
  const params = useSearchParams()
  const { clearCart, setCartOpen } = useCart()
  const sessionId = params.get('session_id')

  useEffect(() => {
    clearCart()
    setCartOpen(false)
  }, [clearCart, setCartOpen])

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
            Your Stripe payment went through. A receipt is on its way to your
            email.
          </p>
          {sessionId ? (
            <p className="mt-2 break-all text-[11px] text-[#6a655c]">
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

'use client'

import { Suspense, useEffect, useState, type FormEvent } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useCart } from '@/context/CartContext'
import { useToast } from '@/lib/toast'
import { Footer } from '@/components/Footer'
import {
  SHIP_REGIONS,
  shipRegionLabel,
  type ShipRegion,
} from '@/lib/shipping'
import { cn } from '@/lib/cn'

function CheckoutInner() {
  const {
    cartItems,
    subtotal,
    shipping,
    total,
    shipRegion,
    setShipRegion,
  } = useCart()
  const { toast } = useToast()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')

  useEffect(() => {
    if (searchParams.get('canceled') === '1') {
      toast('Checkout canceled — your cart is still here')
    }
  }, [searchParams, toast])

  async function payWithStripe(e?: FormEvent) {
    e?.preventDefault()
    if (!cartItems.length) return
    if (!email.trim() || !email.includes('@')) {
      setError('Enter a valid email for your Stripe receipt')
      return
    }
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: cartItems,
          shipRegion,
          shipping,
          email: email.trim(),
          customerName: name.trim(),
        }),
      })
      const data = (await res.json()) as { url?: string; error?: string }
      if (!res.ok || !data.url) {
        throw new Error(data.error || 'Could not start Stripe Checkout')
      }
      window.location.assign(data.url)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Stripe checkout failed'
      setError(msg)
      toast(msg)
      setLoading(false)
    }
  }

  if (cartItems.length === 0) {
    return (
      <div className="grid min-h-[50vh] place-items-center px-5 text-center">
        <div>
          <h1 className="serif text-3xl">Nothing to checkout</h1>
          <Link href="/shop" className="mt-4 inline-block text-[#D4AF37]">
            Shop collection
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div>
      <section className="mx-auto grid max-w-5xl gap-8 px-5 py-12 md:grid-cols-2 md:px-10">
        <div>
          <h1 className="serif text-4xl">Checkout</h1>
          <p className="mt-2 text-sm text-[#b8b0a4]">
            Secure card payment via Stripe. You’ll finish on Stripe’s checkout
            page.
          </p>
          <form className="mt-8 space-y-3" onSubmit={(e) => void payWithStripe(e)}>
            <label className="block text-[12px] text-[#b8b0a4]">
              Full name
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 w-full rounded-xl border border-white/10 bg-black px-3 py-2.5 text-sm text-white outline-none focus:border-[#D4AF37]/50"
              />
            </label>
            <label className="block text-[12px] text-[#b8b0a4]">
              Email (receipt)
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full rounded-xl border border-white/10 bg-black px-3 py-2.5 text-sm text-white outline-none focus:border-[#D4AF37]/50"
              />
            </label>

            <div className="pt-2">
              <p className="text-[12px] text-[#b8b0a4]">
                Ship to (Europe &amp; USA only)
              </p>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {SHIP_REGIONS.map((region) => {
                  const active = shipRegion === region.id
                  return (
                    <button
                      key={region.id}
                      type="button"
                      onClick={() => setShipRegion(region.id as ShipRegion)}
                      className={cn(
                        'rounded-xl border px-3 py-3 text-left text-sm transition',
                        active
                          ? 'border-[#D4AF37] bg-[#D4AF37]/10 text-[#D4AF37]'
                          : 'border-white/15 text-[#b8b0a4]',
                      )}
                    >
                      {region.label}
                    </button>
                  )
                })}
              </div>
            </div>

            {error ? <p className="text-sm text-red-300">{error}</p> : null}

            <button
              type="submit"
              disabled={loading}
              className="mt-4 w-full rounded-full bg-[#635BFF] py-3.5 text-[12px] font-semibold uppercase tracking-[0.16em] text-white disabled:opacity-60"
            >
              {loading ? 'Opening Stripe…' : `Pay $${total} with Stripe`}
            </button>
            <p className="text-center text-[11px] text-[#6a655c]">
              Cards · Apple Pay / Google Pay when available on Stripe Checkout
            </p>
          </form>
        </div>
        <div className="rounded-2xl border border-white/10 bg-zinc-950 p-5">
          <h2 className="text-[12px] uppercase tracking-[0.18em] text-[#b8b0a4]">
            Order summary
          </h2>
          <div className="mt-4 space-y-3">
            {cartItems.map((item) => (
              <div
                key={`${item.productId}-${item.color}-${item.size || ''}`}
                className="flex justify-between text-sm"
              >
                <span>
                  {item.name} × {item.quantity}
                  <span className="block text-[12px] text-[#b8b0a4]">
                    {item.color}
                    {item.size ? ` · ${item.size}` : ''}
                  </span>
                </span>
                <span>${item.price * item.quantity}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 space-y-2 border-t border-white/10 pt-4 text-sm">
            <div className="flex justify-between text-[#b8b0a4]">
              <span>Subtotal</span>
              <span>${subtotal}</span>
            </div>
            <div className="flex justify-between text-[#b8b0a4]">
              <span>Shipping · {shipRegionLabel(shipRegion)}</span>
              <span>{shipping <= 0 ? 'Free' : `$${shipping}`}</span>
            </div>
          </div>
          <div className="mt-4 flex justify-between border-t border-white/10 pt-4">
            <span>Total</span>
            <span className="serif text-2xl text-[#D4AF37]">${total}</span>
          </div>
        </div>
      </section>
      <Footer />
    </div>
  )
}

export default function CheckoutPage() {
  return (
    <Suspense
      fallback={
        <div className="grid min-h-[40vh] place-items-center text-[#b8b0a4]">
          Loading checkout…
        </div>
      }
    >
      <CheckoutInner />
    </Suspense>
  )
}

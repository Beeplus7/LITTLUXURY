'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useCart } from '@/context/CartContext'
import { useToast } from '@/lib/toast'
import { Footer } from '@/components/Footer'
import {
  SHIP_REGIONS,
  shipRegionLabel,
  type ShipRegion,
} from '@/lib/shipping'
import { cn } from '@/lib/cn'

export default function CheckoutPage() {
  const {
    cartItems,
    subtotal,
    shipping,
    total,
    shipRegion,
    setShipRegion,
    clearCart,
  } = useCart()
  const { toast } = useToast()
  const router = useRouter()
  const [loading, setLoading] = useState(false)

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
          <form
            className="mt-8 space-y-3"
            onSubmit={async (e) => {
              e.preventDefault()
              setLoading(true)
              await new Promise((r) => setTimeout(r, 900))
              clearCart()
              toast(`Order placed — shipping to ${shipRegionLabel(shipRegion)}`)
              setLoading(false)
              router.push('/')
            }}
          >
            {['Full name', 'Email', 'Address', 'City', 'Postal code'].map(
              (label) => (
                <label key={label} className="block text-[12px] text-[#b8b0a4]">
                  {label}
                  <input
                    required
                    className="mt-1 w-full rounded-xl border border-white/10 bg-black px-3 py-2.5 text-sm text-white outline-none focus:border-[#D4AF37]/50"
                  />
                </label>
              ),
            )}

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

            <button
              type="submit"
              disabled={loading}
              className="mt-4 w-full rounded-full bg-[#D4AF37] py-3.5 text-[12px] font-semibold uppercase tracking-[0.16em] text-black disabled:opacity-60"
            >
              {loading ? 'Processing…' : `Pay $${total}`}
            </button>
            <button
              type="button"
              onClick={() => toast('Redirecting to PayPal…')}
              className="w-full rounded-full bg-[#0070ba] py-3.5 text-[12px] font-semibold uppercase tracking-[0.16em] text-white"
            >
              PayPal
            </button>
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

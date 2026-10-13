'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useCart } from '@/context/CartContext'
import { useToast } from '@/lib/toast'
import { Footer } from '@/components/Footer'
import Link from 'next/link'

export default function CheckoutPage() {
  const { cartItems, total, clearCart } = useCart()
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
              toast('Order placed — thank you')
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
                key={`${item.productId}-${item.color}`}
                className="flex justify-between text-sm"
              >
                <span>
                  {item.name} × {item.quantity}
                  <span className="block text-[12px] text-[#b8b0a4]">
                    {item.color}
                  </span>
                </span>
                <span>${item.price * item.quantity}</span>
              </div>
            ))}
          </div>
          <div className="mt-6 flex justify-between border-t border-white/10 pt-4">
            <span>Total</span>
            <span className="serif text-2xl text-[#D4AF37]">${total}</span>
          </div>
        </div>
      </section>
      <Footer />
    </div>
  )
}

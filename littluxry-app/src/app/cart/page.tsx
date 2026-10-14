'use client'

import Link from 'next/link'
import { useCart } from '@/context/CartContext'
import { Footer } from '@/components/Footer'
import {
  SHIP_REGIONS,
  shipRegionLabel,
  type ShipRegion,
} from '@/lib/shipping'
import { cn } from '@/lib/cn'

export default function CartPage() {
  const {
    cartItems,
    subtotal,
    shipping,
    total,
    shipRegion,
    setShipRegion,
    updateQuantity,
    removeFromCart,
  } = useCart()

  return (
    <div>
      <section className="mx-auto max-w-3xl px-5 py-12 md:px-10">
        <h1 className="serif text-4xl">Cart</h1>
        {cartItems.length === 0 ? (
          <div className="mt-12 rounded-2xl border border-dashed border-white/15 py-16 text-center text-[#b8b0a4]">
            <p>Your cart is empty.</p>
            <Link href="/shop" className="mt-4 inline-block text-[#D4AF37]">
              Continue shopping
            </Link>
          </div>
        ) : (
          <div className="mt-8 space-y-4">
            {cartItems.map((item) => (
              <div
                key={`${item.productId}-${item.color}-${item.size || ''}`}
                className="flex gap-4 rounded-2xl border border-white/10 p-4"
              >
                <div className="h-24 w-20 overflow-hidden rounded-xl bg-zinc-900">
                  {item.image && !item.image.endsWith('.mp4') ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.image}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : null}
                </div>
                <div className="flex-1">
                  <p className="font-medium">{item.name}</p>
                  <p className="text-sm text-[#b8b0a4]">
                    {item.color}
                    {item.size ? ` · Size ${item.size}` : ''}
                  </p>
                  <p className="mt-1 text-[#D4AF37]">${item.price}</p>
                  <div className="mt-2 flex items-center gap-3 text-sm">
                    <button
                      type="button"
                      onClick={() =>
                        updateQuantity(
                          item.productId,
                          item.color,
                          item.quantity - 1,
                          item.size,
                        )
                      }
                    >
                      −
                    </button>
                    <span>{item.quantity}</span>
                    <button
                      type="button"
                      onClick={() =>
                        updateQuantity(
                          item.productId,
                          item.color,
                          item.quantity + 1,
                          item.size,
                        )
                      }
                    >
                      +
                    </button>
                    <button
                      type="button"
                      className="ml-auto text-[#b8b0a4] underline"
                      onClick={() =>
                        removeFromCart(
                          item.productId,
                          item.color,
                          item.size,
                        )
                      }
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            ))}

            <div>
              <p className="mb-2 text-[11px] uppercase tracking-[0.18em] text-[#b8b0a4]">
                Ship to · Europe &amp; USA only
              </p>
              <div className="grid grid-cols-2 gap-2">
                {SHIP_REGIONS.map((region) => (
                  <button
                    key={region.id}
                    type="button"
                    onClick={() => setShipRegion(region.id as ShipRegion)}
                    className={cn(
                      'rounded-xl border px-3 py-2.5 text-sm transition',
                      shipRegion === region.id
                        ? 'border-[#D4AF37] bg-[#D4AF37]/10 text-[#D4AF37]'
                        : 'border-white/15 text-[#b8b0a4]',
                    )}
                  >
                    {region.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2 border-t border-white/10 pt-6 text-sm">
              <div className="flex justify-between text-[#b8b0a4]">
                <span>Subtotal</span>
                <span>${subtotal}</span>
              </div>
              <div className="flex justify-between text-[#b8b0a4]">
                <span>Shipping · {shipRegionLabel(shipRegion)}</span>
                <span>{shipping <= 0 ? 'Free' : `$${shipping}`}</span>
              </div>
              <div className="flex items-center justify-between pt-2">
                <span className="text-[#b8b0a4]">Total</span>
                <span className="serif text-3xl text-[#D4AF37]">${total}</span>
              </div>
            </div>
            <Link
              href="/checkout"
              className="block rounded-full bg-[#D4AF37] py-3.5 text-center text-[12px] font-semibold uppercase tracking-[0.16em] text-black"
            >
              Checkout
            </Link>
          </div>
        )}
      </section>
      <Footer />
    </div>
  )
}

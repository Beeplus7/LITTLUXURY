'use client'

import Link from 'next/link'
import { X, Minus, Plus } from 'lucide-react'
import { useCart } from '@/context/CartContext'
import { cn } from '@/lib/cn'

export function CartDrawer() {
  const {
    isCartOpen,
    setCartOpen,
    cartItems,
    subtotal,
    shipping,
    total,
    shipRegion,
    updateQuantity,
    removeFromCart,
  } = useCart()

  return (
    <>
      <div
        className={cn(
          'fixed inset-0 z-50 bg-black/50 backdrop-blur-sm transition-opacity',
          isCartOpen ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
        onClick={() => setCartOpen(false)}
      />
      <aside
        className={cn(
          'fixed z-50 flex flex-col border-white/10 bg-[#0a0a0a] transition-transform duration-300',
          'inset-x-0 bottom-0 max-h-[85vh] rounded-t-3xl border-t md:inset-y-0 md:bottom-auto md:left-auto md:right-0 md:h-full md:w-[400px] md:rounded-none md:border-l md:border-t-0',
          isCartOpen
            ? 'translate-y-0 md:translate-x-0'
            : 'translate-y-full md:translate-y-0 md:translate-x-full',
        )}
      >
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <h2 className="serif text-xl">Your bag</h2>
          <button
            type="button"
            onClick={() => setCartOpen(false)}
            className="grid h-9 w-9 place-items-center rounded-full border border-white/10"
          >
            <X size={16} />
          </button>
        </div>
        <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
          {cartItems.length === 0 ? (
            <div className="py-16 text-center text-[#b8b0a4]">
              <p>Your cart is empty.</p>
              <Link
                href="/shop"
                onClick={() => setCartOpen(false)}
                className="mt-4 inline-block text-[#D4AF37] underline"
              >
                Browse the collection
              </Link>
            </div>
          ) : (
            cartItems.map((item) => (
              <div
                key={`${item.productId}-${item.color}-${item.size || ''}`}
                className="flex gap-3 rounded-2xl border border-white/10 p-3"
              >
                <div className="h-20 w-16 overflow-hidden rounded-xl bg-zinc-900">
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
                  <p className="text-sm font-medium">{item.name}</p>
                  <p className="text-[12px] text-[#b8b0a4]">
                    {item.color}
                    {item.size ? ` · Size ${item.size}` : ''}
                  </p>
                  <p className="mt-1 text-[#D4AF37]">${item.price}</p>
                  <div className="mt-2 flex items-center gap-2">
                    <button
                      type="button"
                      className="grid h-7 w-7 place-items-center rounded-full border border-white/15"
                      onClick={() =>
                        updateQuantity(
                          item.productId,
                          item.color,
                          item.quantity - 1,
                          item.size,
                        )
                      }
                    >
                      <Minus size={12} />
                    </button>
                    <span className="w-6 text-center text-sm">{item.quantity}</span>
                    <button
                      type="button"
                      className="grid h-7 w-7 place-items-center rounded-full border border-white/15"
                      onClick={() =>
                        updateQuantity(
                          item.productId,
                          item.color,
                          item.quantity + 1,
                          item.size,
                        )
                      }
                    >
                      <Plus size={12} />
                    </button>
                    <button
                      type="button"
                      className="ml-auto text-[11px] text-[#b8b0a4] underline"
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
            ))
          )}
        </div>
        {cartItems.length > 0 ? (
          <div className="border-t border-white/10 p-5">
            <div className="mb-4 space-y-1.5 text-sm">
              <div className="flex justify-between text-[#b8b0a4]">
                <span>Subtotal</span>
                <span>${subtotal}</span>
              </div>
              <div className="flex justify-between text-[#b8b0a4]">
                <span>
                  Shipping · {shipRegion === 'europe' ? 'Europe' : 'USA'}
                </span>
                <span>{shipping <= 0 ? 'Free' : `$${shipping}`}</span>
              </div>
              <div className="flex justify-between pt-1">
                <span className="text-[#b8b0a4]">Total</span>
                <span className="serif text-xl text-[#D4AF37]">${total}</span>
              </div>
            </div>
            <Link
              href="/checkout"
              onClick={() => setCartOpen(false)}
              className="block rounded-full bg-[#635BFF] py-3 text-center text-[12px] font-semibold uppercase tracking-[0.16em] text-white transition hover:brightness-110"
            >
              Checkout with Stripe
            </Link>
            <Link
              href="/cart"
              onClick={() => setCartOpen(false)}
              className="mt-3 block text-center text-[12px] uppercase tracking-[0.16em] text-[#b8b0a4]"
            >
              View cart
            </Link>
          </div>
        ) : null}
      </aside>
    </>
  )
}

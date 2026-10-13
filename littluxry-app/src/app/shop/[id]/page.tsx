'use client'

import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'
import { ChevronDown, Minus, Plus, Star } from 'lucide-react'
import { VideoHero } from '@/components/VideoHero'
import { Reviews } from '@/components/Reviews'
import { Footer } from '@/components/Footer'
import { useProducts } from '@/context/ProductsContext'
import { useCart } from '@/context/CartContext'
import { useUI } from '@/context/UIContext'
import { useToast } from '@/lib/toast'
import { cn } from '@/lib/cn'

export default function ProductPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const { getProduct } = useProducts()
  const { addToCart } = useCart()
  const { setMenuOpen } = useUI()
  const { toast } = useToast()

  const product = getProduct(params.id)
  const [color, setColor] = useState('')
  const [qty, setQty] = useState(1)
  const [activeImage, setActiveImage] = useState(0)
  const [openDetail, setOpenDetail] = useState(true)

  const selectedColor = useMemo(() => {
    if (!product) return null
    return (
      product.colors.find((c) => c.name === color) ?? product.colors[0] ?? null
    )
  }, [product, color])

  if (!product) {
    return (
      <div className="grid min-h-[60vh] place-items-center px-5 text-center">
        <div>
          <p className="serif text-3xl text-[#D4AF37]">LL</p>
          <h1 className="mt-4 text-2xl">Product not found</h1>
          <Link href="/shop" className="mt-6 inline-block text-[#D4AF37] underline">
            Back to shop
          </Link>
        </div>
      </div>
    )
  }

  const gallery = product.images.filter((i) => !i.endsWith('.mp4'))
  const current = gallery[activeImage] ?? gallery[0]

  function add(buyNow = false) {
    if (!product || !selectedColor) return
    addToCart({
      productId: product.id,
      name: product.name,
      price: product.price,
      color: selectedColor.name,
      quantity: qty,
      image: current,
    })
    toast(`Added ${product.menuLabel} × ${qty}`)
    if (buyNow) router.push('/checkout')
  }

  return (
    <div>
      <div className="mx-auto grid max-w-6xl gap-10 px-5 py-8 md:grid-cols-2 md:px-10 md:py-12">
        <div>
          <div
            className={cn(
              'relative aspect-[4/5] overflow-hidden rounded-2xl bg-gradient-to-br',
              product.gradient,
            )}
          >
            {current ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={current}
                alt={product.name}
                className="h-full w-full object-cover"
              />
            ) : null}
          </div>
          <div className="mt-3 flex gap-2 overflow-x-auto">
            {gallery.map((src, i) => (
              <button
                key={src + i}
                type="button"
                onClick={() => setActiveImage(i)}
                className={cn(
                  'h-16 w-14 shrink-0 overflow-hidden rounded-xl border',
                  i === activeImage
                    ? 'border-[#D4AF37]'
                    : 'border-white/10 opacity-70',
                )}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt="" className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
        </div>

        <div>
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            className="mb-4 text-[11px] uppercase tracking-[0.2em] text-[#D4AF37]"
          >
            ← Side menu · switch product
          </button>
          <div className="flex items-center gap-2 text-sm text-[#b8b0a4]">
            <Star size={14} className="text-[#D4AF37]" fill="currentColor" />
            {product.rating} · {product.reviewCount} reviews
            <span className="ml-auto rounded-full border border-white/10 px-2 py-1 text-[10px] uppercase tracking-[0.16em]">
              In stock
            </span>
          </div>
          <h1 className="serif mt-3 text-[34px] leading-[0.95] md:text-[42px]">
            {product.name}
          </h1>
          <p className="mt-4 max-w-[44ch] text-[14px] leading-relaxed text-[#b8b0a4]">
            {product.description}
          </p>
          <div className="mt-6 flex items-baseline gap-4">
            <span className="serif text-[28px]">${product.price}</span>
            <span className="text-[15px] text-[#b8b0a4] line-through">
              ${product.original}
            </span>
            <span className="rounded-full border border-[#D4AF37]/30 px-2 py-1 text-[11px] uppercase tracking-[0.16em] text-[#D4AF37]">
              Save ${product.original - product.price}
            </span>
          </div>

          <div className="mt-8">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-[11px] uppercase tracking-[0.2em] text-[#b8b0a4]">
                Color:{' '}
                <span className="normal-case tracking-normal text-[13px] font-medium text-white">
                  {selectedColor?.label ?? selectedColor?.name}
                </span>
              </p>
              <span className="text-[11px] text-[#b8b0a4] underline decoration-dotted">
                Size guide
              </span>
            </div>
            <div className="flex flex-wrap gap-3">
              {product.colors.map((c) => {
                const active = (selectedColor?.name ?? '') === c.name
                return (
                  <button
                    key={c.name}
                    type="button"
                    onClick={() => setColor(c.name)}
                    className={cn(
                      'flex h-9 w-9 items-center justify-center rounded-full border-2 transition',
                      active
                        ? 'border-[#D4AF37] shadow-glow'
                        : 'border-white/20',
                    )}
                    style={{ backgroundColor: c.hex }}
                    title={c.label}
                    aria-label={c.label}
                  />
                )
              })}
            </div>
          </div>

          <div className="mt-8 flex items-center gap-4">
            <div className="flex items-center gap-3 rounded-full border border-white/15 px-3 py-2">
              <button
                type="button"
                onClick={() => setQty((q) => Math.max(1, q - 1))}
              >
                <Minus size={14} />
              </button>
              <span className="w-6 text-center text-sm">{qty}</span>
              <button type="button" onClick={() => setQty((q) => q + 1)}>
                <Plus size={14} />
              </button>
            </div>
          </div>

          <div className="mt-6 hidden gap-3 md:flex">
            <button
              type="button"
              onClick={() => add(false)}
              className="flex-1 rounded-full bg-[#D4AF37] py-3.5 text-[12px] font-semibold uppercase tracking-[0.16em] text-black transition hover:brightness-110"
            >
              Add to cart
            </button>
            <button
              type="button"
              onClick={() => add(true)}
              className="flex-1 rounded-full border border-[#0070ba] bg-[#0070ba] py-3.5 text-[12px] font-semibold uppercase tracking-[0.16em] text-white"
            >
              Buy now · PayPal
            </button>
          </div>

          <ul className="mt-8 space-y-2 text-sm text-[#b8b0a4]">
            {product.features.map((f) => (
              <li key={f} className="flex gap-2">
                <span className="text-[#D4AF37]">✦</span> {f}
              </li>
            ))}
          </ul>

          <button
            type="button"
            onClick={() => setOpenDetail((v) => !v)}
            className="mt-8 flex w-full items-center justify-between border-t border-white/10 py-4 text-left"
          >
            <span className="text-[12px] uppercase tracking-[0.18em]">
              Details
            </span>
            <ChevronDown
              size={16}
              className={cn('transition', openDetail && 'rotate-180')}
            />
          </button>
          {openDetail ? (
            <p className="pb-4 text-sm leading-relaxed text-[#b8b0a4]">
              Hand-finished in small batches. Each fringe strand is cut and
              weighed for swing. Ships in signature LL packaging with dust bag.
            </p>
          ) : null}
        </div>
      </div>

      <section className="mx-auto max-w-6xl px-5 py-10 md:px-10">
        <p className="text-[11px] uppercase tracking-[0.2em] text-[#D4AF37]">
          Motion
        </p>
        <h2 className="serif mt-2 text-3xl">
          Fringe Muse in Motion — 5 Colors
        </h2>
        <VideoHero className="mt-6 aspect-video w-full" />
      </section>

      <Reviews />

      <div className="fixed inset-x-0 bottom-[58px] z-30 border-t border-white/10 bg-[#0a0a0a]/95 p-3 backdrop-blur md:hidden">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => add(false)}
            className="flex-1 rounded-full bg-[#D4AF37] py-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-black"
          >
            Add to cart · ${product.price}
          </button>
          <button
            type="button"
            onClick={() => add(true)}
            className="rounded-full bg-[#0070ba] px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-white"
          >
            PayPal
          </button>
        </div>
      </div>

      <Footer />
    </div>
  )
}

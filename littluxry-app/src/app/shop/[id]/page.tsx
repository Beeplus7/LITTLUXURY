'use client'

import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { ChevronDown, Minus, Plus, Star } from 'lucide-react'
import { Reviews } from '@/components/Reviews'
import { Footer } from '@/components/Footer'
import { ProductMedia } from '@/components/ProductMedia'
import { useProducts } from '@/context/ProductsContext'
import { useCart } from '@/context/CartContext'
import { useUI } from '@/context/UIContext'
import { isPublishedProduct, sizesForShopCategory } from '@/data/products'
import { isVideoSrc } from '@/lib/localMediaStore'
import { useToast } from '@/lib/toast'
import { cn } from '@/lib/cn'

export default function ProductPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const { getProduct } = useProducts()
  const { addToCart } = useCart()
  const { setMenuOpen } = useUI()
  const { toast } = useToast()

  const rawProduct = getProduct(params.id)
  const product =
    rawProduct && isPublishedProduct(rawProduct) ? rawProduct : undefined
  const [color, setColor] = useState('')
  const [size, setSize] = useState('')
  const [qty, setQty] = useState(1)
  const [activeImage, setActiveImage] = useState(0)
  const [openDetail, setOpenDetail] = useState(true)

  const selectedColor = useMemo(() => {
    if (!product) return null
    const list = product.colors ?? []
    return list.find((c) => c.name === color) ?? list[0] ?? null
  }, [product, color])

  const sizeOptions = useMemo(() => {
    if (!product || !selectedColor) return [] as string[]
    const forColor = (product.variants ?? [])
      .filter((v) => v.color === selectedColor.name)
      .map((v) => (v.size || '').trim())
      .filter(Boolean)
    const unique = Array.from(new Set(forColor))
    if (unique.length) return unique

    const colorVariants = (product.variants ?? []).filter(
      (v) => v.color === selectedColor.name,
    )
    if (colorVariants.length) return ['OS']

    return sizesForShopCategory(product.shopCategory)
  }, [product, selectedColor])

  const selectedVariant = useMemo(() => {
    if (!product || !selectedColor) return null
    const variants = product.variants ?? []
    return (
      variants.find(
        (v) =>
          v.color === selectedColor.name &&
          (v.size || 'OS') === (size || 'OS'),
      ) ??
      variants.find((v) => v.color === selectedColor.name) ??
      null
    )
  }, [product, selectedColor, size])

  useEffect(() => {
    if (!sizeOptions.length) {
      setSize('')
      return
    }
    setSize((current) =>
      sizeOptions.includes(current) ? current : sizeOptions[0]!,
    )
  }, [sizeOptions])

  const gallery = useMemo(() => {
    if (!product) return [] as string[]
    const items = [...(product.images ?? [])]
    if (product.video && !items.includes(product.video)) {
      items.push(product.video)
    }
    return items.filter(Boolean)
  }, [product])

  useEffect(() => {
    setActiveImage(0)
  }, [product?.id])

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

  const current = gallery[activeImage] ?? gallery[0]
  const cartImage =
    gallery.find((src) => !isVideoSrc(src)) ?? current ?? '/assets/fringe-hero.png'
  const colors = product.colors ?? []
  const features = product.features ?? []
  const displayPrice = selectedVariant?.price ?? product.price
  const compareAt = product.original
  const inStock = (selectedVariant?.stock ?? 1) > 0

  function add(buyNow = false) {
    if (!product || !selectedColor) return
    if (sizeOptions.length && !size) {
      toast('Please choose a size')
      return
    }
    if (!inStock) {
      toast('This size is out of stock')
      return
    }
    addToCart({
      productId: product.id,
      name: product.name,
      price: displayPrice,
      color: selectedColor.name,
      size: size || 'OS',
      quantity: qty,
      image: cartImage,
    })
    toast(
      `Added ${product.menuLabel} · ${selectedColor.name} · ${size || 'OS'} × ${qty}`,
    )
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
              <ProductMedia
                src={current}
                alt={product.name}
                className="h-full w-full"
                autoPlay
              />
            ) : null}
          </div>
          {gallery.length > 1 ? (
            <div className="mt-3 flex gap-2 overflow-x-auto">
              {gallery.map((src, i) => (
                <button
                  key={`${src}-${i}`}
                  type="button"
                  onClick={() => setActiveImage(i)}
                  className={cn(
                    'h-16 w-14 shrink-0 overflow-hidden rounded-xl border',
                    i === activeImage
                      ? 'border-[#D4AF37]'
                      : 'border-white/10 opacity-70',
                  )}
                >
                  <ProductMedia src={src} thumb className="h-full w-full" />
                </button>
              ))}
            </div>
          ) : null}
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
              {inStock ? 'In stock' : 'Sold out'}
            </span>
          </div>
          <h1 className="serif mt-3 text-[34px] leading-[0.95] md:text-[42px]">
            {product.name}
          </h1>
          <p className="mt-4 max-w-[44ch] text-[14px] leading-relaxed text-[#b8b0a4]">
            {product.description}
          </p>
          <div className="mt-6 flex items-baseline gap-4">
            <span className="serif text-[28px]">${displayPrice}</span>
            {compareAt > displayPrice ? (
              <>
                <span className="text-[15px] text-[#b8b0a4] line-through">
                  ${compareAt}
                </span>
                <span className="rounded-full border border-[#D4AF37]/30 px-2 py-1 text-[11px] uppercase tracking-[0.16em] text-[#D4AF37]">
                  Save ${compareAt - displayPrice}
                </span>
              </>
            ) : null}
          </div>

          <div className="mt-8">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-[11px] uppercase tracking-[0.2em] text-[#b8b0a4]">
                Color:{' '}
                <span className="normal-case tracking-normal text-[13px] font-medium text-white">
                  {selectedColor?.label ?? selectedColor?.name}
                </span>
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              {colors.map((c) => {
                const active = (selectedColor?.name ?? '') === c.name
                return (
                  <button
                    key={c.name}
                    type="button"
                    onClick={() => setColor(c.name)}
                    className={cn(
                      'flex h-9 w-9 items-center justify-center rounded-full border-2 transition',
                      active
                        ? 'border-[#D4AF37] shadow-[0_0_20px_rgba(212,175,55,0.35)]'
                        : 'border-white/20',
                    )}
                    style={{ backgroundColor: c.hex }}
                    title={c.label ?? c.name}
                    aria-label={c.label ?? c.name}
                  />
                )
              })}
            </div>
          </div>

          <div className="mt-6">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-[11px] uppercase tracking-[0.2em] text-[#b8b0a4]">
                Size
              </p>
              <span className="text-[11px] text-[#b8b0a4]">
                {sizeOptions.length} option
                {sizeOptions.length === 1 ? '' : 's'} for{' '}
                {selectedColor?.name ?? 'this colour'}
              </span>
            </div>
            <div className="relative">
              <select
                value={size}
                onChange={(e) => setSize(e.target.value)}
                aria-label="Choose size"
                className="w-full appearance-none rounded-xl border border-white/15 bg-black px-4 py-3 pr-10 text-sm text-[#e8e6e1] outline-none focus:border-[#D4AF37]/50"
              >
                {sizeOptions.length === 0 ? (
                  <option value="">No sizes available</option>
                ) : (
                  sizeOptions.map((s) => {
                    const variant = (product.variants ?? []).find(
                      (v) =>
                        v.color === selectedColor?.name &&
                        (v.size || 'OS') === s,
                    )
                    const stock = variant?.stock
                    const label =
                      stock != null && stock <= 0
                        ? `${s} — sold out`
                        : stock != null && stock <= 3
                          ? `${s} — low stock`
                          : s
                    return (
                      <option key={s} value={s} disabled={stock === 0}>
                        {label}
                      </option>
                    )
                  })
                )}
              </select>
              <ChevronDown
                size={16}
                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#b8b0a4]"
              />
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {sizeOptions.map((s) => {
                const variant = (product.variants ?? []).find(
                  (v) =>
                    v.color === selectedColor?.name && (v.size || 'OS') === s,
                )
                const soldOut = variant?.stock === 0
                return (
                  <button
                    key={`chip-${s}`}
                    type="button"
                    disabled={soldOut}
                    onClick={() => setSize(s)}
                    className={cn(
                      'min-w-[2.75rem] rounded-full border px-3 py-1.5 text-[12px] font-medium transition',
                      size === s
                        ? 'border-[#D4AF37] bg-[#D4AF37]/15 text-[#D4AF37]'
                        : 'border-white/15 text-[#b8b0a4] hover:border-white/30',
                      soldOut && 'cursor-not-allowed opacity-40 line-through',
                    )}
                  >
                    {s}
                  </button>
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
              disabled={!inStock || !size}
              className="flex-1 rounded-full bg-[#D4AF37] py-3.5 text-[12px] font-semibold uppercase tracking-[0.16em] text-black transition hover:brightness-110 disabled:opacity-40"
            >
              Add to cart
            </button>
            <button
              type="button"
              onClick={() => add(true)}
              disabled={!inStock || !size}
              className="flex-1 rounded-full border border-[#0070ba] bg-[#0070ba] py-3.5 text-[12px] font-semibold uppercase tracking-[0.16em] text-white disabled:opacity-40"
            >
              Buy now · PayPal
            </button>
          </div>

          <ul className="mt-8 space-y-2 text-sm text-[#b8b0a4]">
            {features.map((f) => (
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
              Hand-finished in small batches. Each piece ships in signature LL
              packaging. Selected colour: {selectedColor?.name}. Size:{' '}
              {size || '—'}.
            </p>
          ) : null}
        </div>
      </div>

      <Reviews />

      <div className="fixed inset-x-0 bottom-[58px] z-30 border-t border-white/10 bg-[#0a0a0a]/95 p-3 backdrop-blur md:hidden">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => add(false)}
            disabled={!inStock || !size}
            className="flex-1 rounded-full bg-[#D4AF37] py-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-black disabled:opacity-40"
          >
            Add to cart · ${displayPrice}
          </button>
          <button
            type="button"
            onClick={() => add(true)}
            disabled={!inStock || !size}
            className="rounded-full bg-[#0070ba] px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-white disabled:opacity-40"
          >
            PayPal
          </button>
        </div>
      </div>

      <Footer />
    </div>
  )
}

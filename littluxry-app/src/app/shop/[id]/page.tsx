'use client'

import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { ChevronDown, Heart, Minus, Plus, Star } from 'lucide-react'
import { Reviews } from '@/components/Reviews'
import { Footer } from '@/components/Footer'
import { ProductGallery } from '@/components/ProductGallery'
import { ProductMedia } from '@/components/ProductMedia'
import { ProductShareButtons } from '@/components/ProductShareButtons'
import { ProductInfoAccordions } from '@/components/ProductInfoAccordions'
import { RelatedProducts } from '@/components/RelatedProducts'
import { useProducts } from '@/context/ProductsContext'
import { useCart } from '@/context/CartContext'
import { useUI } from '@/context/UIContext'
import { useWishlist } from '@/hooks/useWishlist'
import {
  galleryForColor,
  isPublishedProduct,
  primaryImageForColor,
  sizesForShopCategory,
} from '@/data/products'
import { isVideoSrc } from '@/lib/localMediaStore'
import {
  SHIP_REGIONS,
  shippingCostForRegion,
  type ShipRegion,
} from '@/lib/shipping'
import { useToast } from '@/lib/toast'
import { cn } from '@/lib/cn'

export default function ProductPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const { getProduct, products } = useProducts()
  const { addToCart, shipRegion, setShipRegion } = useCart()
  const { setMenuOpen } = useUI()
  const { toast } = useToast()
  const wishlist = useWishlist()

  const rawProduct = getProduct(params.id)
  const product =
    rawProduct && isPublishedProduct(rawProduct) ? rawProduct : undefined
  const [color, setColor] = useState('')
  const [size, setSize] = useState('')
  const [qty, setQty] = useState(1)

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
    return galleryForColor(product, selectedColor?.name)
  }, [product, selectedColor?.name])

  useEffect(() => {
    if (!product) return
    const title =
      product.seoTitle?.trim() ||
      `${product.name} | Litt Luxury`
    document.title = title
    const desc =
      product.seoDescription?.trim() ||
      product.description?.slice(0, 160) ||
      ''
    let meta = document.querySelector('meta[name="description"]')
    if (!meta) {
      meta = document.createElement('meta')
      meta.setAttribute('name', 'description')
      document.head.appendChild(meta)
    }
    meta.setAttribute('content', desc)
  }, [product])

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

  const cartImage =
    (selectedColor
      ? primaryImageForColor(product, selectedColor.name)
      : undefined) ??
    gallery.find((src) => !isVideoSrc(src)) ??
    gallery[0] ??
    '/assets/fringe-hero.png'
  const colors = product.colors ?? []
  const features = product.features ?? []
  const tags = product.tags ?? []
  const displayPrice = selectedVariant?.price ?? product.price
  const compareAt = product.original
  const stock = selectedVariant?.stock
  const inStock = (stock ?? 1) > 0
  const lowStock = stock != null && stock > 0 && stock <= 3
  const wished = wishlist.has(product.id)
  const selectedSku = selectedVariant?.sku || product.sku
  const shipCost = shippingCostForRegion(product, shipRegion)

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
      shippingEurope: product.shippingEurope,
      shippingUsa: product.shippingUsa,
    })
    toast(
      `Added ${product.menuLabel} · ${selectedColor.name} · ${size || 'OS'} × ${qty}`,
    )
    if (buyNow) router.push('/checkout')
  }

  return (
    <div>
      <div className="mx-auto grid max-w-6xl gap-10 px-5 py-8 md:grid-cols-2 md:px-10 md:py-12">
        <ProductGallery
          images={gallery}
          alt={product.name}
          gradient={product.gradient}
          saleBadge={compareAt > displayPrice}
          resetKey={`${product.id}:${selectedColor?.name ?? ''}`}
          initialIndex={0}
        />

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
            <span
              className={cn(
                'ml-auto rounded-full border px-2 py-1 text-[10px] uppercase tracking-[0.16em]',
                inStock
                  ? lowStock
                    ? 'border-amber-400/40 text-amber-300'
                    : 'border-emerald-500/30 text-emerald-400'
                  : 'border-white/10 text-[#b8b0a4]',
              )}
            >
              {!inStock
                ? 'Sold out'
                : lowStock
                  ? `Only ${stock} left`
                  : 'In stock'}
            </span>
          </div>
          {product.brand ? (
            <p className="mt-3 text-[11px] uppercase tracking-[0.2em] text-[#b8b0a4]">
              {product.brand}
            </p>
          ) : null}
          <h1 className="serif mt-2 text-[34px] leading-[0.95] md:text-[42px]">
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
          {product.processingDays != null ? (
            <p className="mt-3 text-[12px] text-[#b8b0a4]">
              Ships in about {product.processingDays} business day
              {product.processingDays === 1 ? '' : 's'}
            </p>
          ) : null}

          <div className="mt-6">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-[11px] uppercase tracking-[0.2em] text-[#b8b0a4]">
                Ship to
              </p>
              <span className="text-[11px] text-[#b8b0a4]">
                Europe &amp; USA only
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {SHIP_REGIONS.map((region) => {
                const cost = shippingCostForRegion(product, region.id)
                const active = shipRegion === region.id
                return (
                  <button
                    key={region.id}
                    type="button"
                    onClick={() => setShipRegion(region.id as ShipRegion)}
                    className={cn(
                      'rounded-xl border px-3 py-3 text-left transition',
                      active
                        ? 'border-[#D4AF37] bg-[#D4AF37]/10'
                        : 'border-white/15 hover:border-white/30',
                    )}
                  >
                    <p className="text-[12px] font-medium text-white">
                      {region.label}
                    </p>
                    <p
                      className={cn(
                        'mt-0.5 text-[13px]',
                        active ? 'text-[#D4AF37]' : 'text-[#b8b0a4]',
                      )}
                    >
                      {cost <= 0 ? 'Free shipping' : `$${cost} shipping`}
                    </p>
                  </button>
                )
              })}
            </div>
            <p className="mt-2 text-[12px] text-[#b8b0a4]">
              Selected: {shipRegion === 'europe' ? 'Europe' : 'USA'} · +$
              {shipCost} at checkout
            </p>
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
                const preview = primaryImageForColor(product, c.name)
                return (
                  <button
                    key={c.name}
                    type="button"
                    onClick={() => setColor(c.name)}
                    className={cn(
                      'relative h-11 w-11 overflow-hidden rounded-full border-2 transition',
                      active
                        ? 'border-[#D4AF37] shadow-[0_0_20px_rgba(212,175,55,0.35)]'
                        : 'border-white/20',
                    )}
                    style={{ backgroundColor: c.hex }}
                    title={c.label ?? c.name}
                    aria-label={c.label ?? c.name}
                    aria-pressed={active}
                  >
                    {preview && !isVideoSrc(preview) ? (
                      <ProductMedia
                        src={preview}
                        thumb
                        className="h-full w-full opacity-90"
                      />
                    ) : null}
                  </button>
                )
              })}
            </div>
            <p className="mt-2 text-[11px] text-[#6a655c]">
              Tap a colour to view that bag in the gallery
            </p>
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
                    const vStock = variant?.stock
                    const label =
                      vStock != null && vStock <= 0
                        ? `${s} — sold out`
                        : vStock != null && vStock <= 3
                          ? `${s} — only ${vStock} left`
                          : s
                    return (
                      <option key={s} value={s} disabled={vStock === 0}>
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
              <button
                type="button"
                onClick={() =>
                  setQty((q) =>
                    stock != null ? Math.min(stock, q + 1) : q + 1,
                  )
                }
              >
                <Plus size={14} />
              </button>
            </div>
            <button
              type="button"
              onClick={() => {
                wishlist.toggle(product.id)
                toast(
                  wished
                    ? 'Removed from wishlist'
                    : 'Saved to wishlist',
                )
              }}
              className={cn(
                'flex items-center gap-2 rounded-full border px-4 py-2.5 text-[11px] uppercase tracking-[0.14em] transition',
                wished
                  ? 'border-[#D4AF37]/50 text-[#D4AF37]'
                  : 'border-white/15 text-[#b8b0a4] hover:border-white/30',
              )}
              aria-pressed={wished}
            >
              <Heart
                size={14}
                fill={wished ? 'currentColor' : 'none'}
              />
              {wished ? 'Saved' : 'Save'}
            </button>
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

          {tags.length ? (
            <div className="mt-6 flex flex-wrap gap-2">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border border-white/10 px-2.5 py-1 text-[11px] text-[#b8b0a4]"
                >
                  {tag}
                </span>
              ))}
            </div>
          ) : null}

          <ProductShareButtons productName={product.name} />

          <ProductInfoAccordions
            product={product}
            selectedSku={selectedSku}
          />
        </div>
      </div>

      <Reviews />

      <RelatedProducts product={product} catalog={products} />

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

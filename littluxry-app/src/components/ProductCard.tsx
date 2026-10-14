'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import type { Product } from '@/data/products'
import { ProductMedia } from '@/components/ProductMedia'
import { useCart } from '@/context/CartContext'
import { isVideoSrc } from '@/lib/localMediaStore'
import { useToast } from '@/lib/toast'
import { cn } from '@/lib/cn'

type Props = {
  product: Product
  className?: string
}

export function ProductCard({ product, className }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)
  const { addToCart } = useCart()
  const { toast } = useToast()

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setVisible(true)
      },
      { threshold: 0.2 },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  const images = product.images ?? []
  const colors = product.colors ?? []
  const image =
    images.find((i) => !isVideoSrc(i)) ?? images[0]

  return (
    <div
      ref={ref}
      className={cn(
        'group relative min-w-[260px] snap-start overflow-hidden rounded-2xl border border-white/10 bg-zinc-950 transition duration-700',
        visible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0',
        className,
      )}
    >
      <Link href={`/shop/${product.id}`} className="block">
        <div
          className={cn(
            'relative aspect-[4/5] bg-gradient-to-br',
            product.gradient || 'from-zinc-900 to-black',
          )}
        >
          {image ? (
            <ProductMedia
              src={image}
              alt={product.name}
              className="h-full w-full opacity-90 transition duration-500 group-hover:scale-105"
            />
          ) : null}
          <div className="absolute bottom-3 left-3 flex gap-1.5">
            {colors.slice(0, 5).map((c) => (
              <span
                key={c.name}
                className="h-3 w-3 rounded-full border border-white/30"
                style={{ backgroundColor: c.hex }}
                title={c.label}
              />
            ))}
          </div>
        </div>
        <div className="p-4">
          <p className="text-[11px] uppercase tracking-[0.18em] text-[#b8b0a4]">
            {(product.shopCategory ?? 'women').replace(/-/g, ' ')}
          </p>
          <h3 className="serif mt-1 text-lg leading-tight">{product.name}</h3>
          <p className="mt-1 text-[12px] text-[#6a655c]">{product.menuLabel}</p>
          <p className="mt-2 text-[#D4AF37]">${product.price}</p>
        </div>
      </Link>
      <button
        type="button"
        onClick={() => {
          addToCart({
            productId: product.id,
            name: product.name,
            price: product.price,
            color: colors[0]?.name ?? 'Default',
            image: image ?? '/assets/fringe-hero.png',
          })
          toast(`Added ${product.menuLabel} to cart`)
        }}
        className="absolute bottom-20 left-4 right-4 translate-y-3 rounded-full bg-[#D4AF37] py-2.5 text-[12px] font-semibold uppercase tracking-[0.14em] text-black opacity-0 transition hover:brightness-110 group-hover:translate-y-0 group-hover:opacity-100"
      >
        Add to cart
      </button>
    </div>
  )
}

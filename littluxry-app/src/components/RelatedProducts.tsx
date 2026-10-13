'use client'

import Link from 'next/link'
import type { Product } from '@/data/products'
import { isPublishedProduct } from '@/data/products'
import { ProductCard } from '@/components/ProductCard'

type Props = {
  product: Product
  catalog: Product[]
}

export function RelatedProducts({ product, catalog }: Props) {
  const related = catalog
    .filter(isPublishedProduct)
    .filter((p) => p.id !== product.id)
    .filter(
      (p) =>
        p.shopCategory === product.shopCategory ||
        p.productLine === product.productLine,
    )
    .slice(0, 4)

  if (!related.length) return null

  return (
    <section className="mx-auto max-w-6xl px-5 py-12 md:px-10">
      <p className="text-[11px] uppercase tracking-[0.2em] text-[#D4AF37]">
        You may also like
      </p>
      <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
        <h2 className="serif text-3xl">Related pieces</h2>
        <Link
          href={`/shop?category=${product.shopCategory}`}
          className="text-[12px] uppercase tracking-[0.16em] text-[#b8b0a4] hover:text-[#D4AF37]"
        >
          View category
        </Link>
      </div>
      <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {related.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>
    </section>
  )
}

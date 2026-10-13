'use client'

import { useMemo } from 'react'
import { useSearchParams } from 'next/navigation'
import { ProductCard } from '@/components/ProductCard'
import { CategoryNav } from '@/components/CategoryNav'
import { Footer } from '@/components/Footer'
import { useProducts } from '@/context/ProductsContext'
import { getCategoryBySlug, SHOP_CATEGORIES } from '@/data/categories'
import { isPublishedProduct } from '@/data/products'
import { Suspense } from 'react'

function ShopContent() {
  const { products } = useProducts()
  const searchParams = useSearchParams()
  const categorySlug = searchParams.get('category')
  const activeCategory = getCategoryBySlug(categorySlug)
  const live = useMemo(
    () => products.filter(isPublishedProduct),
    [products],
  )

  const filtered = useMemo(() => {
    if (!activeCategory) return live
    return live.filter((p) => p.shopCategory === activeCategory.id)
  }, [live, activeCategory])

  const counts = useMemo(() => {
    const map: Record<string, number> = { all: live.length }
    for (const cat of SHOP_CATEGORIES) {
      map[cat.id] = live.filter((p) => p.shopCategory === cat.id).length
    }
    return map
  }, [live])

  return (
    <div>
      <section className="mx-auto max-w-6xl px-5 py-12 md:px-10">
        <p className="text-[11px] uppercase tracking-[0.2em] text-[#D4AF37]">
          Shop
        </p>
        <h1 className="serif mt-2 text-4xl md:text-5xl">
          {activeCategory ? activeCategory.label : 'Collection'}
        </h1>
        <p className="mt-3 max-w-xl text-sm text-[#b8b0a4]">
          {activeCategory
            ? activeCategory.description
            : 'Browse Women, Men, Bags, Dresses, Shoes, Sneakers, Jackets & Accessories.'}
        </p>

        <CategoryNav active={categorySlug} className="mt-8" />

        <p className="mt-4 text-[12px] text-[#6a655c]">
          {filtered.length} piece{filtered.length === 1 ? '' : 's'}
          {activeCategory
            ? ` in ${activeCategory.label}`
            : ` across ${SHOP_CATEGORIES.length} categories`}
          {!activeCategory && counts['women-bags']
            ? ` · ${counts['women-bags']} bags`
            : null}
        </p>

        {filtered.length === 0 ? (
          <div className="mt-16 rounded-2xl border border-dashed border-white/15 py-20 text-center text-[#b8b0a4]">
            No pieces in this category yet.
          </div>
        ) : (
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </section>
      <Footer />
    </div>
  )
}

export default function ShopPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-6xl px-5 py-20 text-[#b8b0a4]">
          Loading shop…
        </div>
      }
    >
      <ShopContent />
    </Suspense>
  )
}

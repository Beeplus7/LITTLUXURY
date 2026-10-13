'use client'

import Link from 'next/link'
import { X } from 'lucide-react'
import { useUI } from '@/context/UIContext'
import { useProducts } from '@/context/ProductsContext'
import { MENU_PRODUCT_ORDER } from '@/data/products'
import { SHOP_CATEGORIES } from '@/data/categories'
import { cn } from '@/lib/cn'

export function SideMenu() {
  const { menuOpen, setMenuOpen } = useUI()
  const { products } = useProducts()

  const ordered = MENU_PRODUCT_ORDER.map((id) =>
    products.find((p) => p.id === id),
  ).filter(Boolean)

  return (
    <>
      <div
        className={cn(
          'fixed inset-0 z-50 bg-black/50 backdrop-blur-sm transition-opacity',
          menuOpen ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
        onClick={() => setMenuOpen(false)}
      />
      <aside
        className={cn(
          'fixed left-0 top-0 z-50 flex h-full w-[min(100%,340px)] flex-col border-r border-white/10 bg-[#0a0a0a] transition-transform duration-300',
          menuOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-5">
          <div>
            <p className="serif text-lg tracking-[0.2em] text-[#D4AF37]">LL</p>
            <p className="text-[11px] uppercase tracking-[0.2em] text-[#b8b0a4]">
              Shop menu
            </p>
          </div>
          <button
            type="button"
            onClick={() => setMenuOpen(false)}
            className="grid h-9 w-9 place-items-center rounded-full border border-white/10"
            aria-label="Close menu"
          >
            <X size={16} />
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <p className="px-4 pb-2 text-[10px] uppercase tracking-[0.2em] text-[#D4AF37]">
            Categories
          </p>
          <Link
            href="/shop"
            onClick={() => setMenuOpen(false)}
            className="mb-1 block rounded-2xl px-4 py-3 text-[14px] transition hover:bg-zinc-900 hover:text-[#D4AF37]"
          >
            All
          </Link>
          {SHOP_CATEGORIES.map((cat) => {
            const count = products.filter((p) => p.shopCategory === cat.id).length
            return (
              <Link
                key={cat.id}
                href={`/shop?category=${cat.slug}`}
                onClick={() => setMenuOpen(false)}
                className="mb-1 flex items-center justify-between rounded-2xl px-4 py-3 transition hover:bg-zinc-900 hover:text-[#D4AF37]"
              >
                <span className="text-[14px]">{cat.label}</span>
                <span className="text-[12px] text-[#b8b0a4]">{count}</span>
              </Link>
            )
          })}

          <div className="my-4 h-px bg-white/10" />
          <p className="px-4 pb-2 text-[10px] uppercase tracking-[0.2em] text-[#D4AF37]">
            Women Bags
          </p>
          {ordered.map((p) =>
            p ? (
              <Link
                key={p.id}
                href={`/shop/${p.id}`}
                onClick={() => setMenuOpen(false)}
                className="mb-1 flex items-center justify-between rounded-2xl px-4 py-3 transition hover:bg-zinc-900 hover:text-[#D4AF37]"
              >
                <span className="text-[14px]">{p.menuLabel}</span>
                <span className="text-[12px] text-[#b8b0a4]">${p.price}</span>
              </Link>
            ) : null,
          )}
          <div className="my-4 h-px bg-white/10" />
          <Link
            href="/shop"
            onClick={() => setMenuOpen(false)}
            className="block rounded-2xl px-4 py-3 text-[13px] uppercase tracking-[0.18em] text-[#D4AF37]"
          >
            View all shop
          </Link>
        </nav>
      </aside>
    </>
  )
}

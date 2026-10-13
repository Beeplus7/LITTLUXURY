'use client'

import Link from 'next/link'
import { SHOP_CATEGORIES } from '@/data/categories'
import { cn } from '@/lib/cn'

type Props = {
  active?: string | null
  className?: string
}

export function CategoryNav({ active, className }: Props) {
  const current = !active || active === 'all' ? 'all' : active

  return (
    <div
      className={cn(
        'flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
        className,
      )}
    >
      <Link
        href="/shop"
        className={cn(
          'shrink-0 rounded-full px-4 py-2 text-[11px] uppercase tracking-[0.14em] transition',
          current === 'all'
            ? 'bg-[#D4AF37] text-black'
            : 'border border-white/10 text-[#b8b0a4] hover:border-[#D4AF37]/40 hover:text-[#D4AF37]',
        )}
      >
        All
      </Link>
      {SHOP_CATEGORIES.map((cat) => (
        <Link
          key={cat.id}
          href={`/shop?category=${cat.slug}`}
          className={cn(
            'shrink-0 rounded-full px-4 py-2 text-[11px] uppercase tracking-[0.14em] transition',
            current === cat.slug
              ? 'bg-[#D4AF37] text-black'
              : 'border border-white/10 text-[#b8b0a4] hover:border-[#D4AF37]/40 hover:text-[#D4AF37]',
          )}
        >
          {cat.label}
        </Link>
      ))}
    </div>
  )
}

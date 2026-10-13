'use client'

import Link from 'next/link'
import { useProducts } from '@/context/ProductsContext'

export default function DashboardOverview() {
  const { products } = useProducts()

  return (
    <div>
      <h1 className="serif text-3xl md:text-4xl">Overview</h1>
      <p className="mt-1 text-sm text-[#b8b0a4]">Store pulse · last 30 days</p>
      <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: 'Sales', value: '$8,420' },
          { label: 'Orders', value: '46' },
          { label: 'Products', value: String(products.length) },
          { label: 'Avg rating', value: '4.8★' },
        ].map((c) => (
          <div
            key={c.label}
            className="rounded-2xl border border-white/10 bg-zinc-950 p-5"
          >
            <p className="text-[11px] uppercase tracking-[0.18em] text-[#b8b0a4]">
              {c.label}
            </p>
            <p className="serif mt-2 text-3xl text-[#D4AF37]">{c.value}</p>
          </div>
        ))}
      </div>
      <div className="mt-8 grid gap-4 md:grid-cols-2">
        <Link
          href="/dashboard/products"
          className="rounded-2xl border border-white/10 bg-zinc-950 p-6 transition hover:border-[#D4AF37]/40"
        >
          <h2 className="font-semibold">Manage products</h2>
          <p className="mt-2 text-sm text-[#b8b0a4]">
            Edit prices, media, and variants.
          </p>
        </Link>
        <Link
          href="/dashboard/ai"
          className="rounded-2xl border border-[#D4AF37]/30 bg-zinc-950 p-6 transition hover:shadow-glow"
        >
          <h2 className="font-semibold text-[#D4AF37]">AI Shop Builder</h2>
          <p className="mt-2 text-sm text-[#b8b0a4]">
            “Create beige variant” → live on shop.
          </p>
        </Link>
      </div>
    </div>
  )
}

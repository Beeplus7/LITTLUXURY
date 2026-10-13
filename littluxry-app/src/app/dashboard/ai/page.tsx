'use client'

import { AIBuilder } from '@/components/AIBuilder'
import { useProducts } from '@/context/ProductsContext'

export default function AIPage() {
  const { products } = useProducts()
  const fringe = products.find((p) => p.category === 'fringe')

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_min(100%,440px)]">
      <div>
        <h1 className="serif text-3xl">AI Shop Builder</h1>
        <p className="mt-2 max-w-xl text-sm text-[#b8b0a4]">
          Upload product photos, paste an external product link to extract title /
          price / images, or chat color variants. Published items update the shop
          instantly.
        </p>
        <div className="mt-6 rounded-2xl border border-white/10 bg-zinc-950 p-5 text-sm text-[#b8b0a4]">
          <p className="text-[11px] uppercase tracking-[0.18em] text-[#D4AF37]">
            Try
          </p>
          <ul className="mt-3 list-disc space-y-1 pl-5">
            <li>Upload images → set title/price → Publish to catalog</li>
            <li>Paste a Farfetch / ASOS / brand PDP URL → Extract</li>
            <li>Create beige variant · Add emerald green variant</li>
          </ul>
        </div>
      </div>
      <div className="min-h-[640px]">
        <AIBuilder productId={fringe?.id} />
      </div>
    </div>
  )
}

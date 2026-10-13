'use client'

import { AdminSectionStub } from '@/components/AdminSectionStub'
import { useProducts } from '@/context/ProductsContext'

export default function VariantsPage() {
  const { products } = useProducts()
  const fringe = products.find((p) => p.category === 'fringe') ?? products[0]

  return (
    <AdminSectionStub
      title="Variants Manager"
      blurb="Color / hex / price / stock / SKU — same builder from your Shop Admin HTML."
    >
      {fringe ? (
        <div>
          <p className="mb-3 text-[12px] font-semibold uppercase tracking-[0.14em] text-[#5a5a5a]">
            Variants Builder — {fringe.variants.length} colors
          </p>
          <ul className="space-y-2">
            {fringe.variants.map((v) => (
              <li
                key={v.id}
                className="flex items-center gap-3 rounded-[12px] border border-[#1a1a1a] bg-[#0f0f0f] px-3 py-2.5 text-[13px]"
              >
                <span
                  className="h-7 w-7 rounded-full ring-1 ring-white/15"
                  style={{ background: v.hex }}
                />
                <span className="flex-1 text-[#e8e6e1]">{v.color}</span>
                <span className="text-[#D4AF37]">${v.price}</span>
                <span className="text-[#7a7a7a]">stock {v.stock}</span>
                <span className="hidden text-[#5a5a5a] sm:inline">{v.sku}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </AdminSectionStub>
  )
}

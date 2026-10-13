'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import type { Product } from '@/data/products'
import { cn } from '@/lib/cn'

type Props = {
  product: Product
  selectedSku?: string
}

export function ProductInfoAccordions({ product, selectedSku }: Props) {
  const [open, setOpen] = useState<string | null>('shipping')

  const sections = [
    {
      id: 'shipping',
      title: 'Shipping & dispatch',
      body:
        product.shippingNote ||
        'Free tracked shipping on orders over $150. Dispatch from our atelier.',
      meta:
        product.processingDays != null
          ? `Usually ships in ${product.processingDays} business day${
              product.processingDays === 1 ? '' : 's'
            }.`
          : null,
    },
    {
      id: 'returns',
      title: 'Returns & exchanges',
      body:
        product.returnsNote ||
        '30-day returns on unused items in original packaging.',
      meta: null,
    },
    {
      id: 'materials',
      title: 'Materials & care',
      body: [product.materials, product.care].filter(Boolean).join('\n\n') ||
        'Premium materials. Wipe with a soft dry cloth. Store in dust bag when not in use.',
      meta: null,
    },
    {
      id: 'details',
      title: 'Product details',
      body: [
        product.brand ? `Brand: ${product.brand}` : null,
        selectedSku ? `SKU: ${selectedSku}` : product.sku ? `SKU: ${product.sku}` : null,
        product.weightGrams
          ? `Weight: ${product.weightGrams}g`
          : null,
        product.barcode ? `Barcode: ${product.barcode}` : null,
        (product.tags ?? []).length
          ? `Tags: ${(product.tags ?? []).join(', ')}`
          : null,
      ]
        .filter(Boolean)
        .join('\n'),
      meta: null,
    },
  ].filter((s) => s.body.trim())

  return (
    <div className="mt-6 border-t border-white/10">
      {sections.map((s) => {
        const isOpen = open === s.id
        return (
          <div key={s.id} className="border-b border-white/10">
            <button
              type="button"
              onClick={() => setOpen(isOpen ? null : s.id)}
              className="flex w-full items-center justify-between py-4 text-left"
            >
              <span className="text-[12px] uppercase tracking-[0.18em]">
                {s.title}
              </span>
              <ChevronDown
                size={16}
                className={cn('transition', isOpen && 'rotate-180')}
              />
            </button>
            {isOpen ? (
              <div className="whitespace-pre-line pb-4 text-sm leading-relaxed text-[#b8b0a4]">
                {s.body}
                {s.meta ? (
                  <p className="mt-2 text-[12px] text-[#D4AF37]">{s.meta}</p>
                ) : null}
              </div>
            ) : null}
          </div>
        )
      })}
    </div>
  )
}

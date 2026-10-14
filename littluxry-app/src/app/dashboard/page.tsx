'use client'

import Link from 'next/link'
import { ArrowUpRight, Plus, RotateCcw, Sparkles } from 'lucide-react'
import { useProducts } from '@/context/ProductsContext'
import { isPublishedProduct } from '@/data/products'
import { DEMO_STATS, useDashboardMock } from '@/hooks/useDashboardMock'
import { useToast } from '@/lib/toast'

export default function DashboardOverview() {
  const { products } = useProducts()
  const { showMock, resetMock, restoreMock } = useDashboardMock()
  const { toast } = useToast()
  const published = products.filter(isPublishedProduct)
  const variantCount = published.reduce(
    (n, p) => n + (p.variants?.length ?? 0),
    0,
  )

  const cards = showMock
    ? [
        {
          label: 'Total Sales',
          value: DEMO_STATS.sales,
          meta: DEMO_STATS.salesMeta,
          trend: DEMO_STATS.salesTrend,
        },
        {
          label: 'Orders',
          value: DEMO_STATS.orders,
          meta: DEMO_STATS.ordersPending,
          trend: DEMO_STATS.ordersTrend,
        },
        {
          label: 'Products',
          value: `${variantCount || products.length} variants`,
          meta: DEMO_STATS.lowStock,
          badge: 'Active',
        },
        {
          label: 'Reviews',
          value: DEMO_STATS.reviews,
          meta: DEMO_STATS.reviewsMeta,
        },
      ]
    : [
        {
          label: 'Total Sales',
          value: '$0',
          meta: 'No live sales yet',
        },
        {
          label: 'Orders',
          value: '0',
          meta: 'Waiting for checkouts',
        },
        {
          label: 'Products',
          value: String(published.length),
          meta: `${variantCount} variants live`,
          badge: published.length ? 'Active' : undefined,
        },
        {
          label: 'Reviews',
          value: '—',
          meta: 'No reviews yet',
        },
      ]

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="serif text-[28px] tracking-tight lg:text-[32px]">
            Overview
          </h1>
          <p className="mt-1 text-[13px] text-[#8a8a8a]">
            Shop Admin ·{' '}
            {showMock ? 'demo mock data on' : 'live / empty stats'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {showMock ? (
            <button
              type="button"
              onClick={() => {
                resetMock()
                toast('Mock data hidden — Overview shows live/empty stats')
              }}
              className="inline-flex items-center gap-1.5 rounded-full border border-white/15 px-4 py-2.5 text-[12px] font-semibold uppercase tracking-[0.12em] text-[#b8b0a4] transition hover:border-[#D4AF37]/40 hover:text-[#D4AF37]"
            >
              <RotateCcw size={14} />
              Reset mock data
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                restoreMock()
                toast('Demo mock data restored')
              }}
              className="inline-flex items-center gap-1.5 rounded-full border border-[#D4AF37]/40 px-4 py-2.5 text-[12px] font-semibold uppercase tracking-[0.12em] text-[#D4AF37] transition hover:bg-[#D4AF37]/10"
            >
              <RotateCcw size={14} />
              Show demo data
            </button>
          )}
          <Link
            href="/dashboard/products?new=1"
            className="inline-flex items-center gap-1.5 rounded-full bg-[#D4AF37] px-4 py-2.5 text-[12px] font-semibold text-black transition hover:bg-[#c9a330]"
          >
            <Plus size={14} />
            Add product
          </Link>
        </div>
      </div>

      {showMock ? (
        <p className="mb-4 rounded-xl border border-[#D4AF37]/25 bg-[#D4AF37]/5 px-3 py-2 text-[12px] text-[#b8b0a4]">
          Demo numbers are on for preview. Use{' '}
          <span className="text-[#D4AF37]">Reset mock data</span> to clear
          fake sales/orders/badges from Overview and the admin menu.
        </p>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((c) => (
          <div
            key={c.label}
            className="rounded-[16px] border border-[#1a1a1a] bg-[#111] p-4"
          >
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#6a6a6a]">
                {c.label}
              </p>
              {'trend' in c && c.trend ? (
                <span className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-emerald-400">
                  <ArrowUpRight size={12} />
                  {c.trend}
                </span>
              ) : null}
              {'badge' in c && c.badge ? (
                <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-400">
                  {c.badge}
                </span>
              ) : null}
            </div>
            <p className="serif mt-2 text-[26px] leading-none text-[#e8e6e1] lg:text-[28px]">
              {c.value}
            </p>
            <p className="mt-2 text-[12px] text-[#7a7a7a]">{c.meta}</p>
          </div>
        ))}
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-2">
        <Link
          href="/dashboard/media"
          className="rounded-[16px] border border-[#1a1a1a] bg-[#111] p-6 transition hover:border-[#D4AF37]/30"
        >
          <h2 className="text-[15px] font-semibold">Media Library</h2>
          <p className="mt-2 text-[13px] text-[#8a8a8a]">
            Upload images & video · AI Enhance assets for the shop.
          </p>
        </Link>
        <Link
          href="/dashboard/ai"
          className="rounded-[16px] border border-[#D4AF37]/30 bg-[#111] p-6 transition hover:border-[#D4AF37]/50"
        >
          <div className="flex items-center gap-2 text-[#D4AF37]">
            <Sparkles size={16} />
            <h2 className="text-[15px] font-semibold">AI Shop Builder</h2>
          </div>
          <p className="mt-2 text-[13px] text-[#8a8a8a]">
            Analyze product links, import variants, upload media.
          </p>
        </Link>
      </div>
    </div>
  )
}

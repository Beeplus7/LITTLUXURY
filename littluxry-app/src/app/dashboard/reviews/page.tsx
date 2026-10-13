'use client'

import { reviewsData } from '@/data/reviews'

export default function DashboardReviewsPage() {
  return (
    <div>
      <h1 className="serif text-3xl">Reviews</h1>
      <p className="mt-1 text-sm text-[#b8b0a4]">
        Managing {reviewsData.length} storefront reviews
      </p>
      <div className="mt-6 space-y-3">
        {reviewsData.slice(0, 12).map((r) => (
          <article
            key={r.id}
            className="rounded-2xl border border-white/10 bg-zinc-950 p-4"
          >
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="font-medium">{r.name}</span>
              <span className="text-[#b8b0a4]">{r.date}</span>
              <span className="text-[#D4AF37]">{r.rating}★</span>
              <span className="ml-auto text-[11px] uppercase tracking-wider text-[#b8b0a4]">
                {r.color}
              </span>
            </div>
            <p className="mt-2 text-sm">{r.title}</p>
            <p className="mt-1 text-[13px] text-[#b8b0a4]">{r.text}</p>
          </article>
        ))}
      </div>
    </div>
  )
}

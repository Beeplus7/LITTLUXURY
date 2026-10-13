'use client'

import { useMemo, useState } from 'react'
import { Star } from 'lucide-react'
import { reviewsData } from '@/data/reviews'

type Props = {
  productColorFilter?: string
}

export function Reviews({ productColorFilter }: Props) {
  const [visible, setVisible] = useState(10)

  const list = useMemo(() => {
    if (!productColorFilter) return reviewsData
    return reviewsData
  }, [productColorFilter])

  const shown = list.slice(0, visible)

  return (
    <section className="mx-auto max-w-5xl px-5 py-16 md:px-10">
      <div className="mb-8 flex items-end justify-between gap-4">
        <div>
          <p className="text-[11px] uppercase tracking-[0.2em] text-[#D4AF37]">
            Verified
          </p>
          <h2 className="serif text-3xl md:text-4xl">50 Reviews</h2>
        </div>
        <p className="text-sm text-[#b8b0a4]">4.8 ★ average</p>
      </div>
      <div className="space-y-4">
        {shown.map((r) => (
          <article
            key={r.id}
            className="rounded-2xl border border-white/10 bg-zinc-950/80 p-5"
          >
            <div className="flex flex-wrap items-center gap-3">
              <p className="font-medium">{r.name}</p>
              <span className="text-[12px] text-[#b8b0a4]">{r.date}</span>
              <span className="rounded-full border border-white/10 px-2 py-0.5 text-[11px] text-[#b8b0a4]">
                {r.color}
              </span>
              <span className="ml-auto flex items-center gap-0.5 text-[#D4AF37]">
                {Array.from({ length: r.rating }).map((_, i) => (
                  <Star key={i} size={12} fill="currentColor" />
                ))}
              </span>
            </div>
            <h3 className="mt-3 text-[15px] font-medium">{r.title}</h3>
            <p className="mt-2 text-[14px] leading-relaxed text-[#b8b0a4]">
              {r.text}
            </p>
          </article>
        ))}
      </div>
      {visible < list.length ? (
        <button
          type="button"
          onClick={() => setVisible((v) => Math.min(v + 10, list.length))}
          className="mt-8 w-full rounded-full border border-[#D4AF37]/40 py-3 text-[12px] uppercase tracking-[0.18em] text-[#D4AF37] transition hover:bg-[#D4AF37] hover:text-black"
        >
          Load more ({Math.min(10, list.length - visible)} of {list.length - visible} left)
        </button>
      ) : null}
    </section>
  )
}

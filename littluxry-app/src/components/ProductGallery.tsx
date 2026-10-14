'use client'

import { useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { ProductMedia } from '@/components/ProductMedia'
import { isVideoSrc } from '@/lib/localMediaStore'
import { cn } from '@/lib/cn'

type Props = {
  images: string[]
  alt: string
  gradient?: string
  saleBadge?: boolean
  /** Reset / jump when product or colour changes */
  resetKey?: string
  initialIndex?: number
}

export function ProductGallery({
  images,
  alt,
  gradient = 'from-zinc-900 to-black',
  saleBadge = false,
  resetKey,
  initialIndex = 0,
}: Props) {
  const [active, setActive] = useState(initialIndex)
  const [broken, setBroken] = useState<Set<string>>(() => new Set())
  const thumbRef = useRef<HTMLDivElement>(null)

  const gallery = images.filter((src) => src && !broken.has(src))
  const safeActive =
    gallery.length === 0 ? 0 : Math.min(active, gallery.length - 1)
  const current = gallery[safeActive]

  useEffect(() => {
    setBroken(new Set())
    setActive(initialIndex)
  }, [resetKey, initialIndex])

  useEffect(() => {
    const el = thumbRef.current
    if (!el) return
    const thumb = el.querySelector<HTMLElement>(`[data-thumb="${safeActive}"]`)
    thumb?.scrollIntoView({
      behavior: 'smooth',
      inline: 'center',
      block: 'nearest',
    })
  }, [safeActive])

  function go(delta: number) {
    if (gallery.length < 2) return
    setActive((i) => {
      const next = (i + delta + gallery.length) % gallery.length
      return next
    })
  }

  function scrollThumbs(dir: -1 | 1) {
    const el = thumbRef.current
    if (!el) return
    el.scrollBy({ left: dir * Math.max(160, el.clientWidth * 0.7), behavior: 'smooth' })
  }

  function markBroken(src: string) {
    setBroken((prev) => {
      if (prev.has(src)) return prev
      const next = new Set(prev)
      next.add(src)
      return next
    })
  }

  if (!gallery.length) {
    return (
      <div
        className={cn(
          'relative aspect-[4/5] overflow-hidden rounded-2xl bg-gradient-to-br',
          gradient,
        )}
      />
    )
  }

  return (
    <div>
      <div
        className={cn(
          'relative aspect-[4/5] overflow-hidden rounded-2xl bg-gradient-to-br',
          gradient,
        )}
      >
        {current ? (
          <ProductMedia
            key={current}
            src={current}
            alt={alt}
            className="h-full w-full"
            autoPlay
            onError={() => markBroken(current)}
          />
        ) : null}

        {saleBadge ? (
          <span className="absolute left-3 top-3 z-10 rounded-full bg-[#D4AF37] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-black">
            Sale
          </span>
        ) : null}

        {gallery.length > 1 ? (
          <>
            <button
              type="button"
              onClick={() => go(-1)}
              className="absolute left-2 top-1/2 z-10 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full border border-white/20 bg-black/55 text-white backdrop-blur hover:bg-black/75"
              aria-label="Previous image"
            >
              <ChevronLeft size={20} />
            </button>
            <button
              type="button"
              onClick={() => go(1)}
              className="absolute right-2 top-1/2 z-10 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full border border-white/20 bg-black/55 text-white backdrop-blur hover:bg-black/75"
              aria-label="Next image"
            >
              <ChevronRight size={20} />
            </button>
            <div className="absolute bottom-3 left-1/2 z-10 -translate-x-1/2 rounded-full bg-black/55 px-2.5 py-1 text-[10px] tracking-wider text-white backdrop-blur">
              {safeActive + 1} / {gallery.length}
            </div>
          </>
        ) : null}
      </div>

      {gallery.length > 1 ? (
        <div className="relative mt-3">
          <button
            type="button"
            onClick={() => scrollThumbs(-1)}
            className="absolute -left-1 top-1/2 z-10 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full border border-white/15 bg-[#0a0a0a] text-[#b8b0a4] shadow hover:text-white md:-left-2"
            aria-label="Scroll thumbnails left"
          >
            <ChevronLeft size={16} />
          </button>
          <div
            ref={thumbRef}
            className="flex gap-2 overflow-x-auto scroll-smooth px-8 pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {gallery.map((src, i) => (
              <button
                key={`${src}-${i}`}
                type="button"
                data-thumb={i}
                onClick={() => setActive(i)}
                className={cn(
                  'h-16 w-14 shrink-0 overflow-hidden rounded-xl border transition',
                  i === safeActive
                    ? 'border-[#D4AF37]'
                    : 'border-white/10 opacity-70 hover:opacity-100',
                )}
                aria-label={`View image ${i + 1}`}
                aria-current={i === safeActive}
              >
                <ProductMedia
                  src={src}
                  thumb
                  className="h-full w-full"
                  onError={() => markBroken(src)}
                />
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => scrollThumbs(1)}
            className="absolute -right-1 top-1/2 z-10 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full border border-white/15 bg-[#0a0a0a] text-[#b8b0a4] shadow hover:text-white md:-right-2"
            aria-label="Scroll thumbnails right"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      ) : null}

      {current && isVideoSrc(current) ? (
        <p className="mt-2 text-[11px] text-[#6a655c]">Playing product video</p>
      ) : null}
    </div>
  )
}

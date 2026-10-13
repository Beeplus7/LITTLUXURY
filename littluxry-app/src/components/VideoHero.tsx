'use client'

import { cn } from '@/lib/cn'

type Props = {
  className?: string
  src?: string
  poster?: string
  rounded?: string
}

export function VideoHero({
  className,
  src = '/assets/video.mp4',
  poster,
  rounded = 'rounded-2xl',
}: Props) {
  return (
    <div
      className={cn(
        'relative overflow-hidden border border-[#D4AF37]/30 bg-zinc-950 shadow-[0_0_60px_rgba(212,175,55,0.18)]',
        rounded,
        className,
      )}
    >
      <div className="pointer-events-none absolute inset-0 z-10 ring-1 ring-inset ring-[#D4AF37]/25" />
      <video
        src={src}
        poster={poster}
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        className="h-full w-full object-cover"
      />
    </div>
  )
}

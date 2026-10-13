'use client'

import { Play } from 'lucide-react'
import { useResolvedMediaUrl } from '@/hooks/useResolvedMediaUrl'
import { isVideoSrc } from '@/lib/localMediaStore'
import { cn } from '@/lib/cn'

type Props = {
  src: string
  alt?: string
  className?: string
  /** compact thumb vs main hero */
  thumb?: boolean
  autoPlay?: boolean
}

export function ProductMedia({
  src,
  alt = '',
  className,
  thumb = false,
  autoPlay = true,
}: Props) {
  const url = useResolvedMediaUrl(src)
  const video = isVideoSrc(src)

  if (!url) {
    return <div className={cn('bg-zinc-900', className)} />
  }

  if (video) {
    return (
      <div className={cn('relative h-full w-full', className)}>
        <video
          src={url}
          muted
          loop={autoPlay}
          autoPlay={autoPlay && !thumb}
          playsInline
          controls={!thumb}
          preload="metadata"
          className="h-full w-full object-cover"
        />
        {thumb ? (
          <span className="pointer-events-none absolute inset-0 grid place-items-center bg-black/25">
            <Play size={14} className="text-white" fill="currentColor" />
          </span>
        ) : null}
      </div>
    )
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={url} alt={alt} className={cn('h-full w-full object-cover', className)} />
  )
}

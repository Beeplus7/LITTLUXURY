'use client'

import { useEffect, useRef } from 'react'
import { Play } from 'lucide-react'
import { useResolvedMediaUrl } from '@/hooks/useResolvedMediaUrl'
import { isLocalMediaRef, isVideoSrc } from '@/lib/localMediaStore'
import { cn } from '@/lib/cn'

type Props = {
  src: string
  alt?: string
  className?: string
  /** compact thumb vs main hero */
  thumb?: boolean
  /** object-fit for stills/video (default cover) */
  fit?: 'cover' | 'contain'
  autoPlay?: boolean
  onError?: () => void
}

export function ProductMedia({
  src,
  alt = '',
  className,
  thumb = false,
  fit = 'cover',
  autoPlay = true,
  onError,
}: Props) {
  const url = useResolvedMediaUrl(src)
  const video = isVideoSrc(src)
  const videoRef = useRef<HTMLVideoElement>(null)
  const fitClass = thumb
    ? 'object-cover'
    : fit === 'contain'
      ? 'object-contain md:object-cover'
      : 'object-cover'

  useEffect(() => {
    if (!url && isLocalMediaRef(src)) onError?.()
  }, [url, src, onError])

  useEffect(() => {
    if (!video || !url || thumb || !autoPlay) return
    const el = videoRef.current
    if (!el) return
    el.muted = true
    const play = () => {
      void el.play().catch(() => {
        /* autoplay blocked — controls still available */
      })
    }
    el.addEventListener('loadeddata', play)
    play()
    return () => el.removeEventListener('loadeddata', play)
  }, [video, url, thumb, autoPlay])

  if (!url) {
    return <div className={cn('bg-zinc-900', className)} aria-hidden />
  }

  if (video) {
    return (
      <div className={cn('relative h-full w-full bg-black', className)}>
        <video
          ref={videoRef}
          key={url}
          src={url}
          muted
          loop={autoPlay}
          autoPlay={autoPlay && !thumb}
          playsInline
          controls={!thumb}
          preload="auto"
          className={cn('h-full w-full bg-black', fitClass)}
          onError={() => onError?.()}
        />
        {thumb ? (
          <span className="pointer-events-none absolute inset-0 grid place-items-center bg-black/35">
            <Play size={14} className="text-white" fill="currentColor" />
          </span>
        ) : null}
      </div>
    )
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      alt={alt}
      className={cn('h-full w-full', fitClass, className)}
      onError={() => onError?.()}
    />
  )
}

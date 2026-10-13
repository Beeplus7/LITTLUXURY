'use client'

import { mediaLibrary } from '@/data/media'

export default function MediaPage() {
  return (
    <div>
      <h1 className="serif text-3xl">Media library</h1>
      <p className="mt-1 text-sm text-[#b8b0a4]">
        Hero video + product stills used across storefront.
      </p>
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {mediaLibrary.map((m) => (
          <div
            key={m.id}
            className="overflow-hidden rounded-2xl border border-white/10 bg-zinc-950"
          >
            <div className="aspect-video bg-black">
              {m.type === 'video' ? (
                <video
                  src={m.src}
                  muted
                  loop
                  playsInline
                  autoPlay
                  preload="metadata"
                  className="h-full w-full object-cover"
                />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={m.src}
                  alt={m.label}
                  className="h-full w-full object-cover"
                />
              )}
            </div>
            <div className="p-4">
              <p className="text-sm font-medium">{m.label}</p>
              <p className="mt-1 text-[11px] uppercase tracking-[0.14em] text-[#b8b0a4]">
                {m.type} · {m.tags.join(' · ')}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

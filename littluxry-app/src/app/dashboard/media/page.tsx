'use client'

import Link from 'next/link'
import { useRef, useState } from 'react'
import { Heart, Play, Plus, Sparkles, Upload } from 'lucide-react'
import { mediaLibrary, type MediaItem } from '@/data/media'
import { readImageAsDataUrl, readVideoAsDataUrl } from '@/lib/readImageFile'
import { useToast } from '@/lib/toast'
import { cn } from '@/lib/cn'

export default function MediaPage() {
  const { toast } = useToast()
  const inputRef = useRef<HTMLInputElement>(null)
  const [items, setItems] = useState<MediaItem[]>(mediaLibrary)
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)

  async function ingestFiles(files: FileList | File[] | null) {
    if (!files?.length) return
    setUploading(true)
    try {
      const next: MediaItem[] = []
      for (const file of Array.from(files).slice(0, 8)) {
        const isVideo = file.type.startsWith('video/')
        const src = isVideo
          ? await readVideoAsDataUrl(file)
          : await readImageAsDataUrl(file)
        next.push({
          id: `upload-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          type: isVideo ? 'video' : 'image',
          src,
          label: file.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' '),
          tags: ['upload'],
          sizeLabel: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
        })
      }
      setItems((prev) => [...next, ...prev])
      toast(`${next.length} file${next.length === 1 ? '' : 's'} uploaded`)
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Upload failed')
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="serif text-[28px] tracking-tight lg:text-[32px]">
            Media Library
          </h1>
          <p className="mt-1 text-[13px] text-[#8a8a8a]">
            Images & video for the shop · from your Shop Admin foundation
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <input
            ref={inputRef}
            type="file"
            accept="image/*,video/mp4,video/webm,video/quicktime"
            multiple
            className="hidden"
            onChange={(e) => void ingestFiles(e.target.files)}
          />
          <button
            type="button"
            disabled={uploading}
            onClick={() => inputRef.current?.click()}
            className="inline-flex items-center gap-2 rounded-full bg-[#D4AF37] px-4 py-2.5 text-[12px] font-semibold text-black transition hover:bg-[#c9a330] disabled:opacity-60"
          >
            <Upload size={14} />
            {uploading ? 'Uploading…' : 'Upload'}
          </button>
          <Link
            href="/dashboard/ai"
            className="inline-flex items-center gap-2 rounded-full border border-[#2a2a2a] bg-[#141414] px-4 py-2.5 text-[12px] font-semibold text-[#e8e6e1] transition hover:border-[#D4AF37]/30"
          >
            <Sparkles size={14} className="text-[#D4AF37]" />
            AI Enhance
          </Link>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {items.map((m) => (
          <article
            key={m.id}
            className="group overflow-hidden rounded-[16px] border border-[#1a1a1a] bg-[#111]"
          >
            <div className="relative aspect-[4/3] bg-black">
              {m.type === 'video' ? (
                <>
                  <video
                    src={m.src}
                    muted
                    playsInline
                    preload="metadata"
                    className="h-full w-full object-cover"
                  />
                  <div className="absolute inset-0 grid place-items-center bg-black/25">
                    <span className="grid h-10 w-10 place-items-center rounded-full bg-white/90 text-black">
                      <Play size={16} fill="currentColor" />
                    </span>
                  </div>
                </>
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={m.src}
                  alt={m.label}
                  className="h-full w-full object-cover transition group-hover:scale-[1.02]"
                />
              )}
              {m.favorite ? (
                <span className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-full bg-black/50 text-[#D4AF37]">
                  <Heart size={13} fill="currentColor" />
                </span>
              ) : null}
            </div>
            <div className="p-3">
              <p className="truncate text-[13.5px] font-medium text-[#e8e6e1]">
                {m.label}
              </p>
              <p className="mt-1 text-[11px] uppercase tracking-[0.12em] text-[#6a6a6a]">
                {m.type} · {m.sizeLabel ?? '—'}
              </p>
            </div>
          </article>
        ))}

        <button
          type="button"
          onDragOver={(e) => {
            e.preventDefault()
            setDragOver(true)
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault()
            setDragOver(false)
            void ingestFiles(e.dataTransfer.files)
          }}
          onClick={() => inputRef.current?.click()}
          className={cn(
            'flex aspect-[4/3] flex-col items-center justify-center gap-2 rounded-[16px] border border-dashed border-[#2a2a2a] bg-[#0f0f0f] text-[#7a7a7a] transition hover:border-[#D4AF37]/40 hover:text-[#c9c9c9]',
            dragOver && 'border-[#D4AF37]/50 bg-[#141414] text-[#D4AF37]',
          )}
        >
          <Plus size={22} />
          <span className="text-[12px]">Drop files or click</span>
        </button>
      </div>
    </div>
  )
}

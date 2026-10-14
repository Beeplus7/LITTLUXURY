'use client'

import Link from 'next/link'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Heart, Play, Plus, Sparkles, Upload } from 'lucide-react'
import { mediaLibrary, type MediaItem } from '@/data/media'
import {
  addUploadedMediaFiles,
  getUserMediaLibrary,
  migrateUserMediaDataUrls,
} from '@/lib/userMediaLibrary'
import { ProductMedia } from '@/components/ProductMedia'
import { useToast } from '@/lib/toast'
import { cn } from '@/lib/cn'

type Filter = 'all' | 'yupoo' | 'core' | 'upload'

const MAX_UPLOAD_BATCH = 24

export default function MediaPage() {
  const { toast } = useToast()
  const inputRef = useRef<HTMLInputElement>(null)
  const [userItems, setUserItems] = useState<MediaItem[]>([])
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [filter, setFilter] = useState<Filter>('all')

  useEffect(() => {
    void (async () => {
      await migrateUserMediaDataUrls()
      setUserItems(getUserMediaLibrary())
    })()
  }, [])

  const items = useMemo(
    () => [...userItems, ...mediaLibrary],
    [userItems],
  )

  const yupooCount = useMemo(
    () => items.filter((m) => m.tags?.includes('yupoo')).length,
    [items],
  )
  const uploadCount = userItems.length

  const visible = useMemo(() => {
    if (filter === 'yupoo') return items.filter((m) => m.tags?.includes('yupoo'))
    if (filter === 'core')
      return items.filter(
        (m) => !m.tags?.includes('yupoo') && !m.tags?.includes('upload'),
      )
    if (filter === 'upload') return userItems
    return items
  }, [items, filter, userItems])

  async function ingestFiles(files: FileList | File[] | null) {
    if (!files?.length) return
    setUploading(true)
    try {
      const created = await addUploadedMediaFiles(Array.from(files), {
        limit: MAX_UPLOAD_BATCH,
      })
      setUserItems(getUserMediaLibrary())
      toast(
        `${created.length} file${created.length === 1 ? '' : 's'} uploaded (saved for product picker)`,
      )
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
            Shop media · {items.length} assets
            {uploadCount ? ` · ${uploadCount} your uploads` : ''}
            {yupooCount ? ` · ${yupooCount} Yupoo imports` : ''}
          </p>
          <p className="mt-1 text-[12px] text-[#6a655c]">
            Upload up to {MAX_UPLOAD_BATCH} files at a time — they appear in Add
            product → From library.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {(
              [
                ['all', 'All'],
                ['upload', 'Your uploads'],
                ['yupoo', 'Yupoo imports'],
                ['core', 'Core'],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setFilter(id)}
                className={cn(
                  'rounded-full border px-3 py-1 text-[11px] uppercase tracking-wider',
                  filter === id
                    ? 'border-[#D4AF37]/50 bg-[#D4AF37]/15 text-[#D4AF37]'
                    : 'border-[#2a2a2a] text-[#8a8a8a]',
                )}
              >
                {label}
              </button>
            ))}
          </div>
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

      <div
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
        className={cn(
          'mb-6 grid place-items-center rounded-2xl border border-dashed px-4 py-10 transition',
          dragOver
            ? 'border-[#D4AF37] bg-[#D4AF37]/10'
            : 'border-[#2a2a2a] bg-[#111]',
        )}
      >
        <div className="text-center">
          <Plus size={22} className="mx-auto text-[#D4AF37]" />
          <p className="mt-2 text-sm text-[#b8b0a4]">
            Drop up to {MAX_UPLOAD_BATCH} images or videos here
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {visible.map((m) => (
          <div
            key={m.id}
            className="group relative overflow-hidden rounded-2xl border border-[#2a2a2a] bg-[#141414]"
          >
            <div className="relative aspect-square">
              <ProductMedia
                src={m.src}
                alt={m.label}
                thumb
                autoPlay={false}
                className="h-full w-full"
              />
              {m.type === 'video' ? (
                <span className="absolute inset-0 grid place-items-center bg-black/25">
                  <Play size={18} className="text-white" fill="currentColor" />
                </span>
              ) : null}
              {m.favorite ? (
                <Heart
                  size={14}
                  className="absolute left-2 top-2 text-[#D4AF37]"
                  fill="currentColor"
                />
              ) : null}
            </div>
            <div className="p-2.5">
              <p className="truncate text-[12px] text-[#e8e6e1]">{m.label}</p>
              <p className="mt-0.5 truncate text-[10px] uppercase tracking-wider text-[#6a655c]">
                {(m.tags || []).join(' · ') || m.type}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

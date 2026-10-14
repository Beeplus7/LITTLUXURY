'use client'

import Link from 'next/link'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Heart, Play, Plus, Sparkles, Trash2, Upload } from 'lucide-react'
import { mediaLibrary, type MediaItem } from '@/data/media'
import {
  addUploadedMediaFiles,
  clearAllUserUploads,
  deleteLibraryMedia,
  getHiddenMediaIds,
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
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set())
  const [uploading, setUploading] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [filter, setFilter] = useState<Filter>('all')
  const [selected, setSelected] = useState<Set<string>>(new Set())

  function refresh() {
    setUserItems(getUserMediaLibrary())
    setHiddenIds(new Set(getHiddenMediaIds()))
  }

  useEffect(() => {
    void (async () => {
      await migrateUserMediaDataUrls()
      refresh()
    })()
  }, [])

  const coreVisible = useMemo(
    () => mediaLibrary.filter((m) => !hiddenIds.has(m.id)),
    [hiddenIds],
  )

  const items = useMemo(
    () => [...userItems, ...coreVisible],
    [userItems, coreVisible],
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
      refresh()
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

  async function removeOne(item: MediaItem) {
    if (deletingId) return
    const ok = window.confirm(
      `Delete “${item.label}” from the Media Library?\n\nProducts that already use this file keep their own copy until you edit them.`,
    )
    if (!ok) return
    setDeletingId(item.id)
    try {
      const result = await deleteLibraryMedia(item)
      setSelected((prev) => {
        const next = new Set(prev)
        next.delete(item.id)
        return next
      })
      refresh()
      toast(
        result.kind === 'upload'
          ? 'Upload deleted from library'
          : 'Removed from Media Library',
      )
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Delete failed')
    } finally {
      setDeletingId(null)
    }
  }

  async function removeSelected() {
    const targets = visible.filter((m) => selected.has(m.id))
    if (!targets.length) return
    const ok = window.confirm(
      `Delete ${targets.length} selected item${targets.length === 1 ? '' : 's'} from the Media Library?`,
    )
    if (!ok) return
    setDeletingId('bulk')
    try {
      for (const item of targets) {
        await deleteLibraryMedia(item)
      }
      setSelected(new Set())
      refresh()
      toast(`Deleted ${targets.length} from library`)
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Delete failed')
    } finally {
      setDeletingId(null)
    }
  }

  async function clearUploads() {
    if (!userItems.length) return
    const ok = window.confirm(
      `Delete all ${userItems.length} of your uploads from the Media Library?`,
    )
    if (!ok) return
    setDeletingId('clear')
    try {
      const n = await clearAllUserUploads()
      setSelected(new Set())
      refresh()
      toast(`Cleared ${n} upload${n === 1 ? '' : 's'}`)
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Clear failed')
    } finally {
      setDeletingId(null)
    }
  }

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
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
            Upload up to {MAX_UPLOAD_BATCH} files · hover a tile to delete ·
            select multiple to bulk delete.
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
                onClick={() => {
                  setFilter(id)
                  setSelected(new Set())
                }}
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
          {selected.size > 0 ? (
            <button
              type="button"
              disabled={Boolean(deletingId)}
              onClick={() => void removeSelected()}
              className="inline-flex items-center gap-2 rounded-full border border-red-500/40 bg-red-500/10 px-4 py-2.5 text-[12px] font-semibold text-red-300 transition hover:bg-red-500/20 disabled:opacity-60"
            >
              <Trash2 size={14} />
              Delete selected ({selected.size})
            </button>
          ) : null}
          {uploadCount > 0 ? (
            <button
              type="button"
              disabled={Boolean(deletingId)}
              onClick={() => void clearUploads()}
              className="inline-flex items-center gap-2 rounded-full border border-[#2a2a2a] px-4 py-2.5 text-[12px] font-semibold text-[#b8b0a4] transition hover:border-red-500/40 hover:text-red-300 disabled:opacity-60"
            >
              <Trash2 size={14} />
              Clear uploads
            </button>
          ) : null}
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

      {visible.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/15 py-16 text-center text-sm text-[#b8b0a4]">
          No media in this filter. Upload files or switch filter.
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {visible.map((m) => {
            const on = selected.has(m.id)
            const busy = deletingId === m.id || deletingId === 'bulk'
            return (
              <div
                key={m.id}
                className={cn(
                  'group relative overflow-hidden rounded-2xl border bg-[#141414]',
                  on ? 'border-[#D4AF37]' : 'border-[#2a2a2a]',
                )}
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
                    <span className="pointer-events-none absolute inset-0 grid place-items-center bg-black/25">
                      <Play
                        size={18}
                        className="text-white"
                        fill="currentColor"
                      />
                    </span>
                  ) : null}
                  {m.favorite ? (
                    <Heart
                      size={14}
                      className="absolute left-2 top-2 text-[#D4AF37]"
                      fill="currentColor"
                    />
                  ) : null}
                  <label className="absolute left-2 bottom-2 flex h-6 w-6 cursor-pointer items-center justify-center rounded-md border border-white/30 bg-black/60">
                    <input
                      type="checkbox"
                      checked={on}
                      onChange={() => toggleSelect(m.id)}
                      className="h-3.5 w-3.5 accent-[#D4AF37]"
                      aria-label={`Select ${m.label}`}
                    />
                  </label>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void removeOne(m)}
                    className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full bg-black/70 text-white opacity-100 transition hover:bg-red-500/90 sm:opacity-0 sm:group-hover:opacity-100 disabled:opacity-40"
                    aria-label={`Delete ${m.label}`}
                    title="Delete from library"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
                <div className="p-2.5">
                  <p className="truncate text-[12px] text-[#e8e6e1]">{m.label}</p>
                  <p className="mt-0.5 truncate text-[10px] uppercase tracking-wider text-[#6a655c]">
                    {(m.tags || []).join(' · ') || m.type}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

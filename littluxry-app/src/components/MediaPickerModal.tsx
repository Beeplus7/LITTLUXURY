'use client'

import { useEffect, useMemo, useState } from 'react'
import { Check, Library, Play, Search, X } from 'lucide-react'
import { mediaLibrary, type MediaItem } from '@/data/media'
import {
  getHiddenMediaIds,
  getUserMediaLibrary,
} from '@/lib/userMediaLibrary'
import { ProductMedia } from '@/components/ProductMedia'
import { cn } from '@/lib/cn'

type Filter =
  | 'all'
  | 'bags'
  | 'shoes'
  | 'sneakers'
  | 'yupoo'
  | 'core'
  | 'image'
  | 'video'

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'bags', label: 'Bags' },
  { id: 'shoes', label: 'Shoes' },
  { id: 'sneakers', label: 'Sneakers' },
  { id: 'yupoo', label: 'Yupoo' },
  { id: 'core', label: 'Core' },
  { id: 'image', label: 'Images' },
  { id: 'video', label: 'Video' },
]

const PAGE_SIZE = 48

type Props = {
  open: boolean
  onClose: () => void
  onConfirm: (items: MediaItem[]) => void
  /** Prefer images; videos still selectable when allowed */
  allowVideo?: boolean
  maxSelect?: number
  title?: string
}

export function MediaPickerModal({
  open,
  onClose,
  onConfirm,
  allowVideo = true,
  maxSelect = 24,
  title = 'Pick from Media Library',
}: Props) {
  const [filter, setFilter] = useState<Filter>('all')
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const [library, setLibrary] = useState<MediaItem[]>(() => {
    const hidden = new Set(getHiddenMediaIds())
    return [
      ...getUserMediaLibrary(),
      ...mediaLibrary.filter((m) => !hidden.has(m.id)),
    ]
  })

  useEffect(() => {
    if (!open) return
    setSelected(new Set())
    setQuery('')
    setFilter('all')
    setVisibleCount(PAGE_SIZE)
    const hidden = new Set(getHiddenMediaIds())
    setLibrary([
      ...getUserMediaLibrary(),
      ...mediaLibrary.filter((m) => !hidden.has(m.id)),
    ])
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return library.filter((m) => {
      if (!allowVideo && m.type === 'video') return false
      if (filter === 'bags' && !m.tags?.includes('bags')) return false
      if (filter === 'shoes' && !m.tags?.includes('shoes')) return false
      if (filter === 'sneakers' && !m.tags?.includes('sneakers')) return false
      if (filter === 'yupoo' && !m.tags?.includes('yupoo')) return false
      if (filter === 'core' && m.tags?.includes('yupoo')) return false
      if (filter === 'image' && m.type !== 'image') return false
      if (filter === 'video' && m.type !== 'video') return false
      if (!q) return true
      const hay = `${m.label} ${(m.tags || []).join(' ')}`.toLowerCase()
      return hay.includes(q)
    })
  }, [filter, query, allowVideo, library])

  const visible = filtered.slice(0, visibleCount)
  const selectedItems = useMemo(
    () => library.filter((m) => selected.has(m.id)),
    [selected, library],
  )

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
        return next
      }
      if (next.size >= maxSelect) return prev
      next.add(id)
      return next
    })
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-t-2xl border border-white/10 bg-zinc-950 shadow-2xl sm:rounded-2xl"
      >
        <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
          <div className="flex min-w-0 items-center gap-2">
            <Library size={16} className="shrink-0 text-[#D4AF37]" />
            <div className="min-w-0">
              <h3 className="truncate text-sm font-semibold text-[#f5f0e8]">
                {title}
              </h3>
              <p className="text-[11px] text-[#6a655c]">
                {filtered.length} assets · select up to {maxSelect}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-full text-[#b8b0a4] hover:bg-white/5 hover:text-white"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        <div className="space-y-2 border-b border-white/10 px-4 py-3">
          <div className="relative">
            <Search
              size={14}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#6a655c]"
            />
            <input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value)
                setVisibleCount(PAGE_SIZE)
              }}
              placeholder="Search label or tag (bags, gucci, aj1…)"
              className="w-full rounded-full border border-white/10 bg-black py-2 pl-9 pr-3 text-sm outline-none focus:border-[#D4AF37]/50"
            />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => {
                  setFilter(f.id)
                  setVisibleCount(PAGE_SIZE)
                }}
                className={cn(
                  'rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider',
                  filter === f.id
                    ? 'border-[#D4AF37]/50 bg-[#D4AF37]/15 text-[#D4AF37]'
                    : 'border-white/10 text-[#8a8a8a] hover:border-white/20',
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-3">
          {visible.length === 0 ? (
            <p className="py-16 text-center text-sm text-[#6a655c]">
              No media matches this filter.
            </p>
          ) : (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
              {visible.map((m) => {
                const on = selected.has(m.id)
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => toggle(m.id)}
                    className={cn(
                      'group relative overflow-hidden rounded-xl border bg-black text-left transition',
                      on
                        ? 'border-[#D4AF37] ring-1 ring-[#D4AF37]/60'
                        : 'border-white/10 hover:border-[#D4AF37]/35',
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
                        <span className="pointer-events-none absolute inset-0 grid place-items-center bg-black/20">
                          <Play
                            size={14}
                            className="text-white"
                            fill="currentColor"
                          />
                        </span>
                      ) : null}
                      <span
                        className={cn(
                          'absolute right-1.5 top-1.5 grid h-5 w-5 place-items-center rounded-full border text-[10px]',
                          on
                            ? 'border-[#D4AF37] bg-[#D4AF37] text-black'
                            : 'border-white/40 bg-black/50 text-transparent group-hover:text-white/40',
                        )}
                      >
                        <Check size={12} strokeWidth={3} />
                      </span>
                    </div>
                    <p className="truncate px-1.5 py-1 text-[10px] text-[#8a8a8a]">
                      {m.label}
                    </p>
                  </button>
                )
              })}
            </div>
          )}

          {visibleCount < filtered.length ? (
            <button
              type="button"
              onClick={() => setVisibleCount((n) => n + PAGE_SIZE)}
              className="mt-3 w-full rounded-full border border-white/10 py-2 text-[11px] font-semibold uppercase tracking-wider text-[#b8b0a4] hover:border-[#D4AF37]/40 hover:text-[#D4AF37]"
            >
              Show more ({filtered.length - visibleCount} left)
            </button>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/10 px-4 py-3">
          <p className="text-[12px] text-[#8a8a8a]">
            {selected.size} selected
            {selectedItems.some((m) => m.type === 'video')
              ? ' · includes video'
              : ''}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-white/15 px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-[#b8b0a4]"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={!selected.size}
              onClick={() => onConfirm(selectedItems)}
              className="rounded-full bg-[#D4AF37] px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-black disabled:opacity-40"
            >
              Add to draft
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

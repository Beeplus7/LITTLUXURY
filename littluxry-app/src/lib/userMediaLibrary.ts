/** User-uploaded Media Library items (persisted separately from seed/Yupoo assets). */

import type { MediaItem } from '@/data/media'
import {
  deleteLocalMedia,
  isLocalMediaRef,
  isVideoSrc,
  persistInlineMediaSrcs,
  saveLocalImage,
  saveLocalVideo,
} from '@/lib/localMediaStore'

const STORAGE_KEY = 'littluxry_user_media'
const HIDDEN_KEY = 'littluxry_media_hidden'
const MAX_ITEMS = 200

function readRaw(): MediaItem[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter(
        (m): m is MediaItem =>
          Boolean(m) &&
          typeof m === 'object' &&
          typeof (m as MediaItem).id === 'string' &&
          typeof (m as MediaItem).src === 'string',
      )
      .map((m) => ({
        ...m,
        type: m.type === 'video' || isVideoSrc(m.src) ? 'video' : 'image',
        tags: Array.isArray(m.tags) ? m.tags : ['upload'],
      }))
  } catch {
    return []
  }
}

function writeRaw(items: MediaItem[]) {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(items.slice(0, MAX_ITEMS)),
    )
  } catch {
    /* quota — ignore; IndexedDB blobs still exist */
  }
}

export function getUserMediaLibrary(): MediaItem[] {
  return readRaw()
}

export async function addUploadedMediaFiles(
  files: File[],
  opts?: { limit?: number },
): Promise<MediaItem[]> {
  const limit = opts?.limit ?? 24
  const created: MediaItem[] = []
  for (const file of files.slice(0, limit)) {
    const isVideo = file.type.startsWith('video/')
    const src = isVideo
      ? await saveLocalVideo(file)
      : await saveLocalImage(file)
    created.push({
      id: `upload-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      type: isVideo ? 'video' : 'image',
      src,
      label: file.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' '),
      tags: ['upload'],
      sizeLabel: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
    })
  }
  const next = [...created, ...readRaw()].slice(0, MAX_ITEMS)
  writeRaw(next)
  return created
}

/** Migrate legacy data-URL uploads in the user library into IndexedDB. */
export async function migrateUserMediaDataUrls(): Promise<void> {
  const items = readRaw()
  let changed = false
  const next: MediaItem[] = []
  for (const item of items) {
    if (item.src.startsWith('data:') && !isLocalMediaRef(item.src)) {
      const [src] = await persistInlineMediaSrcs([item.src])
      if (src) {
        next.push({ ...item, src })
        changed = true
        continue
      }
    }
    next.push(item)
  }
  if (changed) writeRaw(next)
}

function readHiddenIds(): Set<string> {
  if (typeof window === 'undefined') return new Set()
  try {
    const raw = localStorage.getItem(HIDDEN_KEY)
    if (!raw) return new Set()
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return new Set()
    return new Set(parsed.filter((x): x is string => typeof x === 'string'))
  } catch {
    return new Set()
  }
}

function writeHiddenIds(ids: Set<string>) {
  try {
    localStorage.setItem(HIDDEN_KEY, JSON.stringify(Array.from(ids)))
  } catch {
    /* ignore */
  }
}

export function getHiddenMediaIds(): string[] {
  return Array.from(readHiddenIds())
}

/** Hide a built-in/core library asset from Media Library + picker. */
export function hideLibraryMedia(id: string): void {
  const ids = readHiddenIds()
  ids.add(id)
  writeHiddenIds(ids)
}

/**
 * Delete a user upload (IndexedDB + list), or hide a core/built-in asset.
 */
export async function deleteLibraryMedia(item: MediaItem): Promise<{
  kind: 'upload' | 'hidden'
}> {
  const userItems = readRaw()
  const target = userItems.find((m) => m.id === item.id)
  if (target) {
    writeRaw(userItems.filter((m) => m.id !== item.id))
    await deleteLocalMedia(target.src)
    return { kind: 'upload' }
  }

  // Legacy uploads may only be tagged — still try to drop blob
  if ((item.tags ?? []).includes('upload') || isLocalMediaRef(item.src)) {
    writeRaw(userItems.filter((m) => m.src !== item.src))
    await deleteLocalMedia(item.src)
    return { kind: 'upload' }
  }

  hideLibraryMedia(item.id)
  return { kind: 'hidden' }
}

export async function clearAllUserUploads(): Promise<number> {
  const items = readRaw()
  for (const item of items) {
    await deleteLocalMedia(item.src)
  }
  writeRaw([])
  return items.length
}

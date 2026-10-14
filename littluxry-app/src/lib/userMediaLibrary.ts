/** User-uploaded Media Library items (persisted separately from seed/Yupoo assets). */

import type { MediaItem } from '@/data/media'
import {
  isLocalMediaRef,
  isVideoSrc,
  persistInlineMediaSrcs,
  saveLocalImage,
  saveLocalVideo,
} from '@/lib/localMediaStore'

const STORAGE_KEY = 'littluxry_user_media'
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

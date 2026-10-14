/** User-uploaded Media Library items (persisted separately from seed assets). */

import type { MediaItem } from '@/data/media'
import { loadJson, persistJson } from '@/lib/durableJson'
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
const DURABLE_MEDIA = 'user_media'
const DURABLE_HIDDEN = 'media_hidden'
const MAX_ITEMS = 200

let memoryUser: MediaItem[] | null = null
let memoryHidden: Set<string> | null = null
let hydrated = false

function normalizeItems(parsed: unknown): MediaItem[] {
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
}

/** Load user media + hidden IDs from durable storage (call on Media page mount). */
export async function hydrateUserMediaLibrary(): Promise<void> {
  const [media, hidden] = await Promise.all([
    loadJson<unknown>(STORAGE_KEY, DURABLE_MEDIA),
    loadJson<unknown>(HIDDEN_KEY, DURABLE_HIDDEN),
  ])
  memoryUser = normalizeItems(media)
  memoryHidden = new Set(
    Array.isArray(hidden)
      ? hidden.filter((x): x is string => typeof x === 'string')
      : [],
  )
  hydrated = true
  // Mirror into localStorage when possible so sync reads stay fresh
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(memoryUser))
  } catch {
    /* ignore */
  }
  try {
    localStorage.setItem(HIDDEN_KEY, JSON.stringify(Array.from(memoryHidden)))
  } catch {
    /* ignore */
  }
}

function readRawSync(): MediaItem[] {
  if (memoryUser) return memoryUser
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    return normalizeItems(JSON.parse(raw))
  } catch {
    return []
  }
}

async function writeUser(items: MediaItem[]): Promise<boolean> {
  const next = items.slice(0, MAX_ITEMS)
  memoryUser = next
  return persistJson(STORAGE_KEY, DURABLE_MEDIA, next)
}

function readHiddenSync(): Set<string> {
  if (memoryHidden) return new Set(memoryHidden)
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

async function writeHidden(ids: Set<string>): Promise<boolean> {
  memoryHidden = new Set(ids)
  return persistJson(HIDDEN_KEY, DURABLE_HIDDEN, Array.from(ids))
}

export function getUserMediaLibrary(): MediaItem[] {
  return readRawSync()
}

export function getHiddenMediaIds(): string[] {
  return Array.from(readHiddenSync())
}

export async function addUploadedMediaFiles(
  files: File[],
  opts?: { limit?: number },
): Promise<MediaItem[]> {
  if (!hydrated) await hydrateUserMediaLibrary()
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
  const next = [...created, ...readRawSync()].slice(0, MAX_ITEMS)
  const ok = await writeUser(next)
  if (!ok) throw new Error('Could not save media library (storage full)')
  return created
}

export async function migrateUserMediaDataUrls(): Promise<void> {
  await hydrateUserMediaLibrary()
  const items = readRawSync()
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
  if (changed) await writeUser(next)
}

export async function hideLibraryMedia(id: string): Promise<boolean> {
  const ids = readHiddenSync()
  ids.add(id)
  return writeHidden(ids)
}

/**
 * Delete a user upload (IndexedDB blob + list), or hide a core/built-in asset.
 */
export async function deleteLibraryMedia(item: MediaItem): Promise<{
  kind: 'upload' | 'hidden'
}> {
  if (!hydrated) await hydrateUserMediaLibrary()
  const userItems = readRawSync()
  const target = userItems.find((m) => m.id === item.id)
  if (target) {
    const next = userItems.filter((m) => m.id !== item.id)
    const ok = await writeUser(next)
    await deleteLocalMedia(target.src)
    if (!ok) throw new Error('Could not persist media delete — storage full')
    return { kind: 'upload' }
  }

  if ((item.tags ?? []).includes('upload') || isLocalMediaRef(item.src)) {
    const next = userItems.filter((m) => m.src !== item.src)
    const ok = await writeUser(next)
    await deleteLocalMedia(item.src)
    if (!ok) throw new Error('Could not persist media delete — storage full')
    return { kind: 'upload' }
  }

  const ok = await hideLibraryMedia(item.id)
  if (!ok) throw new Error('Could not persist media delete — storage full')
  return { kind: 'hidden' }
}

export async function clearAllUserUploads(): Promise<number> {
  if (!hydrated) await hydrateUserMediaLibrary()
  const items = readRawSync()
  for (const item of items) {
    await deleteLocalMedia(item.src)
  }
  const ok = await writeUser([])
  if (!ok) throw new Error('Could not clear uploads — storage full')
  return items.length
}

/** IndexedDB store for uploaded product media (videos/images) that won't fit in localStorage. */

const DB_NAME = 'littluxry-local-media'
const STORE = 'files'
const DB_VERSION = 1

export const LOCAL_MEDIA_PREFIX = 'local-media:'

export function isLocalMediaRef(src: string | undefined | null): boolean {
  return Boolean(src && src.startsWith(LOCAL_MEDIA_PREFIX))
}

export function isVideoSrc(src: string | undefined | null): boolean {
  if (!src) return false
  if (src.startsWith(`${LOCAL_MEDIA_PREFIX}video:`)) return true
  if (src.startsWith('data:video')) return true
  const lower = src.toLowerCase().split('?')[0] || ''
  return (
    lower.endsWith('.mp4') ||
    lower.endsWith('.webm') ||
    lower.endsWith('.mov') ||
    lower.endsWith('.m4v')
  )
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE)
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error || new Error('IndexedDB open failed'))
  })
}

async function putBlob(key: string, blob: Blob): Promise<void> {
  const db = await openDb()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).put(blob, key)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error || new Error('IndexedDB write failed'))
  })
  db.close()
}

async function getBlob(key: string): Promise<Blob | null> {
  const db = await openDb()
  const blob = await new Promise<Blob | null>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly')
    const req = tx.objectStore(STORE).get(key)
    req.onsuccess = () => resolve((req.result as Blob | undefined) ?? null)
    req.onerror = () => reject(req.error || new Error('IndexedDB read failed'))
  })
  db.close()
  return blob
}

function newId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

/** Persist an uploaded video and return a stable catalog reference. */
export async function saveLocalVideo(file: File): Promise<string> {
  if (!file.type.startsWith('video/') && !/\.(mp4|webm|mov|m4v)$/i.test(file.name)) {
    throw new Error('Please choose a video file (MP4 or WebM)')
  }
  if (file.size > 40_000_000) {
    throw new Error('Video is too large (max ~40MB)')
  }
  const key = `${LOCAL_MEDIA_PREFIX}video:${newId()}`
  await putBlob(key, file)
  return key
}

/** Persist an uploaded image blob and return a stable catalog reference. */
export async function saveLocalImage(file: Blob): Promise<string> {
  if (file.size > 12_000_000) {
    throw new Error('Image is too large (max ~12MB)')
  }
  const key = `${LOCAL_MEDIA_PREFIX}image:${newId()}`
  await putBlob(key, file)
  return key
}

/** Move a data-URL image into IndexedDB so it survives catalog publish. */
export async function saveDataUrlAsLocalImage(dataUrl: string): Promise<string> {
  if (!dataUrl.startsWith('data:')) {
    throw new Error('Expected a data URL')
  }
  const res = await fetch(dataUrl)
  const blob = await res.blob()
  return saveLocalImage(blob)
}

/**
 * Convert inline data-URL media to IndexedDB refs.
 * Library paths and existing local-media refs are left unchanged.
 */
export async function persistInlineMediaSrcs(
  srcs: string[],
): Promise<string[]> {
  const out: string[] = []
  for (const src of srcs) {
    if (!src) continue
    if (isLocalMediaRef(src) || !src.startsWith('data:')) {
      out.push(src)
      continue
    }
    try {
      if (src.startsWith('data:video')) {
        const res = await fetch(src)
        const blob = await res.blob()
        const file = new File([blob], `clip-${newId()}.mp4`, {
          type: blob.type || 'video/mp4',
        })
        out.push(await saveLocalVideo(file))
      } else {
        out.push(await saveDataUrlAsLocalImage(src))
      }
    } catch {
      /* skip broken data URLs */
    }
  }
  return out
}

/** Resolve a catalog src (path, data URL, or local-media ref) to a playable/display URL. */
export async function resolveMediaUrl(
  src: string | undefined | null,
): Promise<string> {
  if (!src) return ''
  if (!isLocalMediaRef(src)) return src
  const blob = await getBlob(src)
  if (!blob) return ''
  return URL.createObjectURL(blob)
}

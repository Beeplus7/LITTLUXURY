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
  const key = `${LOCAL_MEDIA_PREFIX}image:${newId()}`
  await putBlob(key, file)
  return key
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

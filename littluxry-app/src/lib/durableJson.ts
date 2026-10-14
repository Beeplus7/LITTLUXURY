/**
 * Durable JSON key/value store in IndexedDB.
 * Survives when localStorage is full or fails — used for deletes/tombstones.
 */

const DB_NAME = 'littluxry-durable'
const STORE = 'kv'
const DB_VERSION = 1

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
    req.onerror = () => reject(req.error || new Error('Durable DB open failed'))
  })
}

export async function durableGet<T>(key: string): Promise<T | null> {
  try {
    const db = await openDb()
    const value = await new Promise<T | null>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly')
      const req = tx.objectStore(STORE).get(key)
      req.onsuccess = () => resolve((req.result as T | undefined) ?? null)
      req.onerror = () => reject(req.error || new Error('Durable get failed'))
    })
    db.close()
    return value
  } catch {
    return null
  }
}

export async function durableSet(key: string, value: unknown): Promise<boolean> {
  try {
    const db = await openDb()
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite')
      tx.objectStore(STORE).put(value, key)
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error || new Error('Durable set failed'))
    })
    db.close()
    return true
  } catch {
    return false
  }
}

/** Write to localStorage + IndexedDB. Returns true if at least one succeeded. */
export async function persistJson(
  localKey: string,
  durableKey: string,
  value: unknown,
): Promise<boolean> {
  let localOk = false
  try {
    localStorage.setItem(localKey, JSON.stringify(value))
    localOk = true
  } catch {
    localOk = false
  }
  const durableOk = await durableSet(durableKey, value)
  return localOk || durableOk
}

/** Prefer localStorage, fall back to IndexedDB. */
export async function loadJson<T>(
  localKey: string,
  durableKey: string,
): Promise<T | null> {
  try {
    const raw = localStorage.getItem(localKey)
    if (raw != null) {
      return JSON.parse(raw) as T
    }
  } catch {
    /* fall through */
  }
  return durableGet<T>(durableKey)
}

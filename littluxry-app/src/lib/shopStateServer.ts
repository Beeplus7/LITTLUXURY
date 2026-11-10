import { copyFile, mkdir, readFile, writeFile } from 'fs/promises'
import path from 'path'
import { emptyStaffState, type ShopSyncState } from '@/lib/shopStaff'
import type { Product } from '@/data/products'

export type { ShopSyncState }

function dataDir() {
  return path.join(process.cwd(), 'data')
}

function statePath() {
  return path.join(dataDir(), 'shop-state.json')
}

function backupPath() {
  return path.join(dataDir(), 'shop-state.backup.json')
}

export function emptyShopState(): ShopSyncState {
  return {
    staff: emptyStaffState(),
    products: [],
    removedIds: [],
    userMedia: [],
    hiddenMediaIds: [],
    updatedAt: new Date().toISOString(),
  }
}

/** Product uses runtime uploads — protect from accidental catalog wipe. */
export function productHasUploads(p: Product | Record<string, unknown>): boolean {
  const images = Array.isArray((p as Product).images)
    ? (p as Product).images
    : []
  const cover = (p as Product).coverImage || ''
  const video = (p as Product).video || ''
  const hit = (src: string | undefined) =>
    Boolean(src && src.includes('/assets/uploads/'))
  return hit(cover) || hit(video) || images.some(hit)
}

export async function readShopState(): Promise<ShopSyncState> {
  try {
    const raw = await readFile(statePath(), 'utf8')
    const parsed = JSON.parse(raw) as Partial<ShopSyncState>
    return {
      staff: parsed.staff ?? emptyStaffState(),
      products: Array.isArray(parsed.products) ? parsed.products : [],
      removedIds: Array.isArray(parsed.removedIds) ? parsed.removedIds : [],
      userMedia: Array.isArray(parsed.userMedia) ? parsed.userMedia : [],
      hiddenMediaIds: Array.isArray(parsed.hiddenMediaIds)
        ? parsed.hiddenMediaIds
        : [],
      updatedAt: parsed.updatedAt || new Date().toISOString(),
    }
  } catch {
    // Prefer backup over empty wipe if main file is missing/corrupt
    try {
      const bak = await readFile(backupPath(), 'utf8')
      const parsed = JSON.parse(bak) as Partial<ShopSyncState>
      return {
        staff: parsed.staff ?? emptyStaffState(),
        products: Array.isArray(parsed.products) ? parsed.products : [],
        removedIds: Array.isArray(parsed.removedIds) ? parsed.removedIds : [],
        userMedia: Array.isArray(parsed.userMedia) ? parsed.userMedia : [],
        hiddenMediaIds: Array.isArray(parsed.hiddenMediaIds)
          ? parsed.hiddenMediaIds
          : [],
        updatedAt: parsed.updatedAt || new Date().toISOString(),
      }
    } catch {
      return emptyShopState()
    }
  }
}

export async function writeShopState(state: ShopSyncState): Promise<void> {
  await mkdir(dataDir(), { recursive: true })
  const next: ShopSyncState = {
    ...state,
    updatedAt: new Date().toISOString(),
  }
  // Rotate backup before overwrite so uploads catalog can be restored
  try {
    await copyFile(statePath(), backupPath())
  } catch {
    /* first write — no prior file */
  }
  await writeFile(statePath(), JSON.stringify(next, null, 2), 'utf8')
}

export function uploadsDir() {
  return path.join(process.cwd(), 'public', 'assets', 'uploads')
}

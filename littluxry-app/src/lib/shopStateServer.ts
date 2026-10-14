import { mkdir, readFile, writeFile } from 'fs/promises'
import path from 'path'
import { emptyStaffState, type ShopSyncState } from '@/lib/shopStaff'

export type { ShopSyncState }

function dataDir() {
  return path.join(process.cwd(), 'data')
}

function statePath() {
  return path.join(dataDir(), 'shop-state.json')
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
    return emptyShopState()
  }
}

export async function writeShopState(state: ShopSyncState): Promise<void> {
  await mkdir(dataDir(), { recursive: true })
  const next: ShopSyncState = {
    ...state,
    updatedAt: new Date().toISOString(),
  }
  await writeFile(statePath(), JSON.stringify(next, null, 2), 'utf8')
}

export function uploadsDir() {
  return path.join(process.cwd(), 'public', 'assets', 'uploads')
}

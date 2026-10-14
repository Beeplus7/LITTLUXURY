'use client'

import type { Product } from '@/data/products'
import type { MediaItem } from '@/data/media'
import {
  emptyStaffState,
  writeLocalStaff,
  type ShopStaffState,
  type ShopSyncState,
  type StaffMember,
} from '@/lib/shopStaff'

export type { ShopSyncState }

function actorHeaders(email?: string | null): HeadersInit {
  const h: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  if (email) h['x-shop-actor'] = email.trim().toLowerCase()
  return h
}

export async function fetchShopState(): Promise<ShopSyncState | null> {
  try {
    const res = await fetch('/api/shop-sync', { cache: 'no-store' })
    if (!res.ok) return null
    const data = (await res.json()) as ShopSyncState
    if (data?.staff) writeLocalStaff(data.staff)
    return data
  } catch {
    return null
  }
}

export async function pushShopState(
  email: string | null | undefined,
  patch: Partial<ShopSyncState> & { claimOwner?: StaffMember },
): Promise<ShopSyncState | null> {
  try {
    const res = await fetch('/api/shop-sync', {
      method: 'PUT',
      headers: actorHeaders(email),
      body: JSON.stringify(patch),
    })
    if (!res.ok) return null
    const data = (await res.json()) as ShopSyncState
    if (data?.staff) writeLocalStaff(data.staff)
    return data
  } catch {
    return null
  }
}

export async function claimShopOwner(
  member: StaffMember,
): Promise<ShopSyncState | null> {
  return pushShopState(member.email, { claimOwner: member })
}

export async function syncStaff(
  actorEmail: string,
  staff: ShopStaffState,
): Promise<ShopSyncState | null> {
  return pushShopState(actorEmail, { staff })
}

export async function syncCatalog(
  actorEmail: string | null | undefined,
  products: Product[],
  removedIds: string[],
): Promise<boolean> {
  const res = await pushShopState(actorEmail, { products, removedIds })
  return Boolean(res)
}

export async function syncMediaLibrary(
  actorEmail: string | null | undefined,
  userMedia: MediaItem[],
  hiddenMediaIds: string[],
): Promise<boolean> {
  const res = await pushShopState(actorEmail, { userMedia, hiddenMediaIds })
  return Boolean(res)
}

export async function uploadShopMedia(
  actorEmail: string,
  file: File | Blob,
  filename = 'upload.jpg',
): Promise<string | null> {
  try {
    const form = new FormData()
    form.append(
      'file',
      file instanceof File ? file : new File([file], filename, { type: file.type }),
    )
    const res = await fetch('/api/shop-media', {
      method: 'POST',
      headers: { 'x-shop-actor': actorEmail.trim().toLowerCase() },
      body: form,
    })
    if (!res.ok) return null
    const data = (await res.json()) as { src?: string }
    return data.src || null
  } catch {
    return null
  }
}

export function staffOrEmpty(state: ShopSyncState | null): ShopStaffState {
  return state?.staff ?? emptyStaffState()
}

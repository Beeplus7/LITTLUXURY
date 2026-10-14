/** Single-shop staff registry — one owner, owner-managed team logins. */

import type { Product } from '@/data/products'
import type { MediaItem } from '@/data/media'

export type StaffRole = 'owner' | 'staff'

export type StaffMember = {
  email: string
  name: string
  role: StaffRole
  /** SHA-256 hex of password (offline / demo login) */
  passwordHash?: string
  createdAt: string
  active: boolean
}

export type ShopStaffState = {
  ownerEmail: string | null
  staff: StaffMember[]
  updatedAt: string
}

export type ShopSyncState = {
  staff: ShopStaffState
  products: Product[]
  removedIds: string[]
  userMedia: MediaItem[]
  hiddenMediaIds: string[]
  updatedAt: string
}

const LOCAL_KEY = 'littluxry_shop_staff'

export function emptyStaffState(): ShopStaffState {
  return { ownerEmail: null, staff: [], updatedAt: new Date().toISOString() }
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

export async function hashPassword(password: string): Promise<string> {
  const data = new TextEncoder().encode(password)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

export async function verifyPassword(
  password: string,
  hash?: string,
): Promise<boolean> {
  if (!hash) return false
  const next = await hashPassword(password)
  return next === hash
}

export function readLocalStaff(): ShopStaffState {
  if (typeof window === 'undefined') return emptyStaffState()
  try {
    const raw = localStorage.getItem(LOCAL_KEY)
    if (!raw) return emptyStaffState()
    const parsed = JSON.parse(raw) as ShopStaffState
    return {
      ownerEmail: parsed.ownerEmail
        ? normalizeEmail(parsed.ownerEmail)
        : null,
      staff: Array.isArray(parsed.staff) ? parsed.staff : [],
      updatedAt: parsed.updatedAt || new Date().toISOString(),
    }
  } catch {
    return emptyStaffState()
  }
}

export function writeLocalStaff(state: ShopStaffState) {
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(state))
  } catch {
    /* ignore */
  }
}

export function findStaff(
  state: ShopStaffState,
  email: string,
): StaffMember | undefined {
  const e = normalizeEmail(email)
  return state.staff.find((s) => s.email === e && s.active !== false)
}

export function isAdminEmail(state: ShopStaffState, email: string): boolean {
  return Boolean(findStaff(state, email))
}

export function isOwnerEmail(state: ShopStaffState, email: string): boolean {
  const e = normalizeEmail(email)
  if (state.ownerEmail && state.ownerEmail === e) return true
  const m = findStaff(state, e)
  return m?.role === 'owner'
}

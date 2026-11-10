import { normalizeEmail } from '@/lib/shopStaff'
import { readShopState } from '@/lib/shopStateServer'

export async function assertShopActor(request: Request) {
  const email = normalizeEmail(request.headers.get('x-shop-actor') || '')
  const state = await readShopState()
  const allowed =
    Boolean(email) &&
    (!state.staff.ownerEmail ||
      state.staff.staff.some((s) => s.email === email && s.active !== false) ||
      state.staff.ownerEmail === email)
  if (!allowed) {
    return { ok: false as const, email: '' }
  }
  return { ok: true as const, email }
}

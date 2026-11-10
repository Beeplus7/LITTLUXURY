import { NextResponse } from 'next/server'
import {
  listAdminNotifications,
  markAdminNotificationsRead,
  unreadAdminNotificationCount,
} from '@/lib/adminNotifications'
import { assertShopActor } from '@/lib/shopActor'
import { unreadOrderCount } from '@/lib/ordersStore'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const actor = await assertShopActor(request)
  if (!actor.ok) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
  }
  const notifications = await listAdminNotifications()
  return NextResponse.json({
    ok: true,
    notifications,
    unread: await unreadAdminNotificationCount(),
    unpaidOrders: await unreadOrderCount(),
  })
}

export async function PATCH(request: Request) {
  const actor = await assertShopActor(request)
  if (!actor.ok) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
  }
  let body: { ids?: string[]; markAll?: boolean } = {}
  try {
    body = (await request.json()) as typeof body
  } catch {
    /* mark all */
  }
  const changed = await markAdminNotificationsRead(
    body.markAll || !body.ids?.length ? undefined : body.ids,
  )
  return NextResponse.json({
    ok: true,
    changed,
    unread: await unreadAdminNotificationCount(),
  })
}

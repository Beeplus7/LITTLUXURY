import { NextResponse } from 'next/server'
import { assertShopActor } from '@/lib/shopActor'
import {
  listOrders,
  markOrdersSeen,
  unreadOrderCount,
} from '@/lib/ordersStore'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const actor = await assertShopActor(request)
  if (!actor.ok) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
  }
  const orders = await listOrders()
  const unread = await unreadOrderCount()
  return NextResponse.json({ ok: true, orders, unread })
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
    /* empty body = mark all */
  }
  const changed = await markOrdersSeen(
    body.markAll || !body.ids?.length ? undefined : body.ids,
  )
  return NextResponse.json({
    ok: true,
    changed,
    unread: await unreadOrderCount(),
  })
}

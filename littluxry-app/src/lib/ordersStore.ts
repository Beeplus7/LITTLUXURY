import { mkdir, readFile, writeFile } from 'fs/promises'
import path from 'path'
import type { OrderEmailPayload } from '@/lib/orderEmail'

export type ShopOrderStatus = 'paid' | 'fulfilled' | 'cancelled'

export type ShopOrder = {
  id: string
  createdAt: string
  status: ShopOrderStatus
  customerEmail: string
  customerName?: string
  total: number
  currency: string
  shippingAmount?: number
  shipRegion?: string
  lines: Array<{
    name: string
    detail?: string
    quantity: number
    amount: number
  }>
  shippingAddress?: OrderEmailPayload['shippingAddress']
  paymentId?: string
  provider: 'paypal'
  /** Admin has opened/seen this payment in the portal */
  adminSeen: boolean
}

function dataDir() {
  return path.join(process.cwd(), 'data')
}

function ordersPath() {
  return path.join(dataDir(), 'orders.json')
}

async function readAll(): Promise<ShopOrder[]> {
  try {
    const raw = await readFile(ordersPath(), 'utf8')
    const parsed = JSON.parse(raw) as { orders?: ShopOrder[] } | ShopOrder[]
    if (Array.isArray(parsed)) return parsed
    return Array.isArray(parsed.orders) ? parsed.orders : []
  } catch {
    return []
  }
}

async function writeAll(orders: ShopOrder[]) {
  await mkdir(dataDir(), { recursive: true })
  await writeFile(
    ordersPath(),
    JSON.stringify({ updatedAt: new Date().toISOString(), orders }, null, 2),
    'utf8',
  )
}

export async function listOrders(): Promise<ShopOrder[]> {
  const orders = await readAll()
  return orders.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export async function unreadOrderCount(): Promise<number> {
  const orders = await readAll()
  return orders.filter((o) => o.status === 'paid' && !o.adminSeen).length
}

export async function markOrdersSeen(ids?: string[]): Promise<number> {
  const orders = await readAll()
  let changed = 0
  const next = orders.map((o) => {
    if (o.adminSeen) return o
    if (ids && ids.length && !ids.includes(o.id)) return o
    changed += 1
    return { ...o, adminSeen: true }
  })
  if (changed) await writeAll(next)
  return changed
}

export async function upsertPaidOrder(
  payload: OrderEmailPayload,
): Promise<{ order: ShopOrder; created: boolean }> {
  const orders = await readAll()
  const existing = orders.find((o) => o.id === payload.sessionId)
  if (existing) {
    return { order: existing, created: false }
  }
  const order: ShopOrder = {
    id: payload.sessionId,
    createdAt: new Date().toISOString(),
    status: 'paid',
    customerEmail: payload.to,
    customerName: payload.customerName,
    total: payload.total,
    currency: payload.currency,
    shippingAmount: payload.shippingAmount,
    shipRegion: payload.shipRegion,
    lines: payload.lines,
    shippingAddress: payload.shippingAddress,
    paymentId: payload.paymentIntentId,
    provider: 'paypal',
    adminSeen: false,
  }
  await writeAll([order, ...orders])
  return { order, created: true }
}

'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { Bell, RefreshCw } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { DEMO_ORDERS, useDashboardMock } from '@/hooks/useDashboardMock'
import { cn } from '@/lib/cn'
import { useToast } from '@/lib/toast'

type LiveOrder = {
  id: string
  createdAt: string
  status: string
  customerEmail: string
  customerName?: string
  total: number
  currency: string
  shipRegion?: string
  lines: Array<{ name: string; quantity: number; amount: number }>
  adminSeen: boolean
  provider: string
}

export default function OrdersPage() {
  const { showMock } = useDashboardMock()
  const { user } = useAuth()
  const { toast } = useToast()
  const [orders, setOrders] = useState<LiveOrder[]>([])
  const [unread, setUnread] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    if (!user?.email) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/orders', {
        headers: { 'x-shop-actor': user.email },
        cache: 'no-store',
      })
      const data = (await res.json()) as {
        orders?: LiveOrder[]
        unread?: number
        error?: string
      }
      if (!res.ok) throw new Error(data.error || 'Could not load orders')
      setOrders(data.orders || [])
      setUnread(data.unread || 0)
      if ((data.unread || 0) > 0) {
        await fetch('/api/orders', {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'x-shop-actor': user.email,
          },
          body: JSON.stringify({ markAll: true }),
        })
        setUnread(0)
        setOrders((prev) => prev.map((o) => ({ ...o, adminSeen: true })))
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Load failed')
    } finally {
      setLoading(false)
    }
  }, [user?.email])

  useEffect(() => {
    void load()
  }, [load])

  const demoOrders = showMock ? DEMO_ORDERS : []
  const hasLive = orders.length > 0

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="serif text-3xl">Orders</h1>
          <p className="mt-1 text-[13px] text-[#8a8a8a]">
            {hasLive
              ? `${orders.length} paid PayPal order${orders.length === 1 ? '' : 's'}`
              : showMock
                ? 'Showing demo orders — live PayPal payments appear here automatically'
                : 'No live orders yet — completed PayPal checkouts land here'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {unread > 0 ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#D4AF37]/40 bg-[#D4AF37]/15 px-3 py-1.5 text-[11px] uppercase tracking-wider text-[#D4AF37]">
              <Bell size={12} /> {unread} new payment
              {unread === 1 ? '' : 's'}
            </span>
          ) : null}
          <button
            type="button"
            onClick={() => {
              void load()
              toast('Orders refreshed')
            }}
            className="inline-flex items-center gap-1.5 rounded-full border border-white/15 px-3 py-1.5 text-[11px] uppercase tracking-wider text-[#b8b0a4]"
          >
            <RefreshCw size={12} /> Refresh
          </button>
        </div>
      </div>

      {error ? (
        <p className="mb-4 text-sm text-red-300">{error}</p>
      ) : null}

      {loading && !hasLive ? (
        <div className="rounded-2xl border border-white/10 py-16 text-center text-sm text-[#b8b0a4]">
          Loading orders…
        </div>
      ) : null}

      {hasLive ? (
        <div className="overflow-x-auto rounded-2xl border border-white/10">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="bg-zinc-950 text-[11px] uppercase tracking-[0.16em] text-[#b8b0a4]">
              <tr>
                <th className="px-4 py-3">When</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Items</th>
                <th className="px-4 py-3">Total</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Ref</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr
                  key={o.id}
                  className={cn(
                    'border-t border-white/10',
                    !o.adminSeen && 'bg-[#D4AF37]/5',
                  )}
                >
                  <td className="px-4 py-3 text-[#b8b0a4]">
                    {new Date(o.createdAt).toLocaleString()}
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium">
                      {o.customerName || 'Customer'}
                    </div>
                    <div className="text-[12px] text-[#b8b0a4]">
                      {o.customerEmail}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-[#b8b0a4]">
                    {o.lines
                      .map((l) => `${l.name} × ${l.quantity}`)
                      .join(', ')
                      .slice(0, 80)}
                  </td>
                  <td className="px-4 py-3 text-[#D4AF37]">
                    ${Number(o.total).toFixed(2)}
                  </td>
                  <td className="px-4 py-3 capitalize">
                    {o.status}
                    <span className="mt-0.5 block text-[11px] text-[#6a655c]">
                      PayPal
                    </span>
                  </td>
                  <td className="px-4 py-3 break-all text-[11px] text-[#6a655c]">
                    {o.id}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {!hasLive && demoOrders.length > 0 ? (
        <div className="overflow-x-auto rounded-2xl border border-white/10">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="bg-zinc-950 text-[11px] uppercase tracking-[0.16em] text-[#b8b0a4]">
              <tr>
                <th className="px-4 py-3">Order</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Item</th>
                <th className="px-4 py-3">Total</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {demoOrders.map((o) => (
                <tr key={o.id} className="border-t border-white/10">
                  <td className="px-4 py-3 font-medium">{o.id}</td>
                  <td className="px-4 py-3">{o.customer}</td>
                  <td className="px-4 py-3 text-[#b8b0a4]">{o.item}</td>
                  <td className="px-4 py-3 text-[#D4AF37]">${o.total}</td>
                  <td className="px-4 py-3">{o.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {!loading && !hasLive && demoOrders.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/15 py-16 text-center text-sm text-[#b8b0a4]">
          Order list is empty. When PayPal checkouts complete, they appear here
          with a payment notification.
          <div className="mt-4">
            <Link href="/dashboard" className="text-[#D4AF37]">
              Overview
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  )
}

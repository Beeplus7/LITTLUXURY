'use client'

import Link from 'next/link'
import { DEMO_ORDERS, useDashboardMock } from '@/hooks/useDashboardMock'

export default function OrdersPage() {
  const { showMock } = useDashboardMock()
  const orders = showMock ? DEMO_ORDERS : []

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="serif text-3xl">Orders</h1>
          <p className="mt-1 text-[13px] text-[#8a8a8a]">
            {showMock
              ? 'Showing demo orders — reset mock data from Overview or the menu'
              : 'No live orders yet'}
          </p>
        </div>
        {!showMock ? (
          <Link
            href="/dashboard"
            className="text-[12px] uppercase tracking-[0.14em] text-[#D4AF37]"
          >
            Overview · show demo
          </Link>
        ) : null}
      </div>
      {orders.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/15 py-16 text-center text-sm text-[#b8b0a4]">
          Order list is empty. When checkouts complete, they will appear here.
        </div>
      ) : (
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
              {orders.map((o) => (
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
      )}
    </div>
  )
}

'use client'

const ORDERS = [
  { id: 'LL-1042', customer: 'Ava M.', total: 298, status: 'Paid', item: 'Fringe Noir' },
  { id: 'LL-1041', customer: 'Sofia L.', total: 265, status: 'Shipped', item: 'Rosso Bucket' },
  { id: 'LL-1040', customer: 'Mila R.', total: 245, status: 'Paid', item: 'Riviera Straw' },
  { id: 'LL-1039', customer: 'Zara K.', total: 596, status: 'Processing', item: 'Fringe Blush ×2' },
]

export default function OrdersPage() {
  return (
    <div>
      <h1 className="serif text-3xl">Orders</h1>
      <div className="mt-6 overflow-x-auto rounded-2xl border border-white/10">
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
            {ORDERS.map((o) => (
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
    </div>
  )
}

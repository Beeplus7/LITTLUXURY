'use client'

import { AdminSectionStub } from '@/components/AdminSectionStub'

const DEMO = [
  { name: 'Amara Nwosu', email: 'amara@email.com', orders: 4, spent: '$1,192' },
  { name: 'James Cole', email: 'james@email.com', orders: 2, spent: '$596' },
  { name: 'Priya Shah', email: 'priya@email.com', orders: 6, spent: '$1,788' },
]

export default function CustomersPage() {
  return (
    <AdminSectionStub
      title="Customers"
      blurb="Buyer list from the Shop Admin console — demo rows until auth profiles sync."
    >
      <ul className="space-y-2">
        {DEMO.map((c) => (
          <li
            key={c.email}
            className="flex items-center justify-between rounded-[12px] border border-[#1a1a1a] px-3 py-3 text-[13px]"
          >
            <div>
              <p className="font-medium text-[#e8e6e1]">{c.name}</p>
              <p className="text-[12px] text-[#7a7a7a]">{c.email}</p>
            </div>
            <div className="text-right">
              <p className="text-[#D4AF37]">{c.spent}</p>
              <p className="text-[11px] text-[#6a6a6a]">{c.orders} orders</p>
            </div>
          </li>
        ))}
      </ul>
    </AdminSectionStub>
  )
}

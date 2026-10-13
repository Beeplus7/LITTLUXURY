'use client'

import { AdminSectionStub } from '@/components/AdminSectionStub'

export default function PayoutsPage() {
  return (
    <AdminSectionStub
      title="Payouts"
      blurb="Revenue & payout schedule — matches Shop Admin / Payment settings."
    >
      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { label: 'Available', value: '$8,420' },
          { label: 'Pending', value: '$1,240' },
          { label: 'Last payout', value: '$2,100' },
        ].map((c) => (
          <div
            key={c.label}
            className="rounded-[14px] border border-[#1a1a1a] bg-[#0f0f0f] p-4"
          >
            <p className="text-[11px] uppercase tracking-[0.14em] text-[#6a6a6a]">
              {c.label}
            </p>
            <p className="serif mt-2 text-2xl text-[#e8e6e1]">{c.value}</p>
          </div>
        ))}
      </div>
    </AdminSectionStub>
  )
}

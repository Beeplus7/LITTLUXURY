'use client'

import { AdminSectionStub } from '@/components/AdminSectionStub'

export default function AnalyticsPage() {
  return (
    <AdminSectionStub
      title="Analytics"
      blurb="Traffic and conversion pulse from the original Admin Console."
    >
      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { label: 'Sessions', value: '3.2k' },
          { label: 'Conversion', value: '2.8%' },
          { label: 'AOV', value: '$286' },
        ].map((c) => (
          <div
            key={c.label}
            className="rounded-[14px] border border-[#1a1a1a] bg-[#0f0f0f] p-4"
          >
            <p className="text-[11px] uppercase tracking-[0.14em] text-[#6a6a6a]">
              {c.label}
            </p>
            <p className="serif mt-2 text-2xl text-[#D4AF37]">{c.value}</p>
          </div>
        ))}
      </div>
    </AdminSectionStub>
  )
}

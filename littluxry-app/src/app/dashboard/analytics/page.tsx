'use client'

import { AdminSectionStub } from '@/components/AdminSectionStub'
import { DEMO_STATS, useDashboardMock } from '@/hooks/useDashboardMock'

export default function AnalyticsPage() {
  const { showMock } = useDashboardMock()
  const cards = showMock
    ? [
        { label: 'Sessions', value: DEMO_STATS.sessions },
        { label: 'Conversion', value: DEMO_STATS.conversion },
        { label: 'AOV', value: DEMO_STATS.aov },
      ]
    : [
        { label: 'Sessions', value: '0' },
        { label: 'Conversion', value: '—' },
        { label: 'AOV', value: '—' },
      ]

  return (
    <AdminSectionStub
      title="Analytics"
      blurb={
        showMock
          ? 'Demo traffic pulse — reset mock data from Overview or the admin menu.'
          : 'Live analytics will appear when store traffic is connected.'
      }
    >
      <div className="grid gap-3 sm:grid-cols-3">
        {cards.map((c) => (
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

'use client'

import { useCallback, useEffect, useState } from 'react'

const STORAGE_KEY = 'littluxry_dashboard_mock'
const EVENT = 'littluxry:dashboard-mock'

export type DashboardMockState = {
  /** When true, admin shows seeded demo stats/orders/badges */
  showMock: boolean
}

export const DEFAULT_MOCK: DashboardMockState = {
  showMock: true,
}

/** Demo numbers used across Overview / menu badges when mock is on */
export const DEMO_STATS = {
  sales: '$8,420',
  salesMeta: 'last 30 days',
  salesTrend: '+12%',
  orders: '124',
  ordersPending: '12 pending',
  ordersTrend: '+8%',
  ordersBadge: '12',
  lowStock: '3 low stock',
  reviews: '4.8★',
  reviewsMeta: '124 total · 98% positive',
  reviewsBadge: '124',
  sessions: '3.2k',
  conversion: '2.8%',
  aov: '$286',
} as const

export const DEMO_ORDERS = [
  {
    id: 'LL-1042',
    customer: 'Ava M.',
    total: 298,
    status: 'Paid',
    item: 'Fringe Noir',
  },
  {
    id: 'LL-1041',
    customer: 'Sofia L.',
    total: 265,
    status: 'Shipped',
    item: 'Rosso Bucket',
  },
  {
    id: 'LL-1040',
    customer: 'Mila R.',
    total: 245,
    status: 'Paid',
    item: 'Riviera Straw',
  },
  {
    id: 'LL-1039',
    customer: 'Zara K.',
    total: 596,
    status: 'Processing',
    item: 'Fringe Blush ×2',
  },
] as const

function read(): DashboardMockState {
  if (typeof window === 'undefined') return DEFAULT_MOCK
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_MOCK
    const parsed = JSON.parse(raw) as Partial<DashboardMockState>
    return {
      showMock: parsed.showMock !== false,
    }
  } catch {
    return DEFAULT_MOCK
  }
}

function write(next: DashboardMockState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new CustomEvent(EVENT, { detail: next }))
}

export function useDashboardMock() {
  const [state, setState] = useState<DashboardMockState>(DEFAULT_MOCK)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    setState(read())
    setHydrated(true)
    function onChange(e: Event) {
      const detail = (e as CustomEvent<DashboardMockState>).detail
      if (detail) setState(detail)
      else setState(read())
    }
    window.addEventListener(EVENT, onChange)
    return () => window.removeEventListener(EVENT, onChange)
  }, [])

  const setShowMock = useCallback((showMock: boolean) => {
    const next = { showMock }
    write(next)
    setState(next)
  }, [])

  /** Hide demo stats/badges — show live/empty admin numbers */
  const resetMock = useCallback(() => {
    setShowMock(false)
  }, [setShowMock])

  /** Restore seeded demo stats for previews */
  const restoreMock = useCallback(() => {
    setShowMock(true)
  }, [setShowMock])

  return {
    ...state,
    hydrated,
    setShowMock,
    resetMock,
    restoreMock,
  }
}

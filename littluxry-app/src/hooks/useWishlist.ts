'use client'

import { useCallback, useEffect, useState } from 'react'

const STORAGE_KEY = 'littluxry_wishlist'

function readIds(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    return Array.isArray(parsed)
      ? parsed.filter((x): x is string => typeof x === 'string')
      : []
  } catch {
    return []
  }
}

export function useWishlist() {
  const [ids, setIds] = useState<string[]>([])

  useEffect(() => {
    setIds(readIds())
  }, [])

  const persist = useCallback((next: string[]) => {
    setIds(next)
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    } catch {
      /* ignore */
    }
  }, [])

  const has = useCallback((id: string) => ids.includes(id), [ids])

  const toggle = useCallback(
    (id: string) => {
      persist(ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id])
    },
    [ids, persist],
  )

  return { ids, has, toggle, count: ids.length }
}

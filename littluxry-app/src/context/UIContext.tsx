'use client'

import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

type UIContextValue = {
  menuOpen: boolean
  setMenuOpen: (open: boolean) => void
}

const UIContext = createContext<UIContextValue | null>(null)

export function UIProvider({ children }: { children: ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const value = useMemo(() => ({ menuOpen, setMenuOpen }), [menuOpen])
  return <UIContext.Provider value={value}>{children}</UIContext.Provider>
}

export function useUI() {
  const ctx = useContext(UIContext)
  if (!ctx) throw new Error('useUI must be used within UIProvider')
  return ctx
}

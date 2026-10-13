'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

export type User = {
  email: string
  name: string
  role: 'owner' | 'customer'
  avatar?: string
}

type AuthContextValue = {
  isLoggedIn: boolean
  hydrated: boolean
  user: User | null
  login: (email: string, password: string) => { ok: boolean; error?: string }
  logout: () => void
  updateUser: (patch: Partial<User>) => void
}

const STORAGE_KEY = 'littluxry_auth'
const DEMO_EMAIL = 'owner@littluxry.com'
const DEMO_PASSWORD = 'admin123'

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) setUser(JSON.parse(raw) as User)
    } catch {
      /* ignore */
    }
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (!hydrated) return
    if (user) localStorage.setItem(STORAGE_KEY, JSON.stringify(user))
    else localStorage.removeItem(STORAGE_KEY)
  }, [user, hydrated])

  const login = useCallback((email: string, password: string) => {
    if (email.trim().toLowerCase() === DEMO_EMAIL && password === DEMO_PASSWORD) {
      setUser({
        email: DEMO_EMAIL,
        name: 'Store Owner',
        role: 'owner',
      })
      return { ok: true }
    }
    if (email.includes('@') && password.length >= 6) {
      setUser({
        email: email.trim().toLowerCase(),
        name: email.split('@')[0],
        role: 'customer',
      })
      return { ok: true }
    }
    return { ok: false, error: 'Invalid credentials. Demo: owner@littluxry.com / admin123' }
  }, [])

  const logout = useCallback(() => setUser(null), [])

  const updateUser = useCallback((patch: Partial<User>) => {
    setUser((prev) => (prev ? { ...prev, ...patch } : prev))
  }, [])

  const value = useMemo(
    () => ({
      isLoggedIn: Boolean(user),
      hydrated,
      user,
      login,
      logout,
      updateUser,
    }),
    [user, hydrated, login, logout, updateUser],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

export const DEMO_CREDENTIALS = { email: DEMO_EMAIL, password: DEMO_PASSWORD }

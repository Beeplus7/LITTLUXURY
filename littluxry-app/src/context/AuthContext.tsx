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
import type { Session, User as SbUser } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'

export type AppRole = 'owner' | 'customer'

export type User = {
  id?: string
  email: string
  name: string
  role: AppRole
  avatar?: string
  phone?: string
  interests?: string[]
}

type AuthContextValue = {
  isLoggedIn: boolean
  hydrated: boolean
  user: User | null
  session: Session | null
  login: (
    email: string,
    password: string,
    opts?: { preferAdmin?: boolean },
  ) => Promise<{ ok: boolean; error?: string }>
  signUp: (input: {
    email: string
    password: string
    name: string
    phone?: string
    interests?: string[]
    role?: AppRole
  }) => Promise<{ ok: boolean; error?: string }>
  signInWithGoogle: (opts?: {
    next?: string
    role?: 'admin' | 'customer'
  }) => Promise<void>
  logout: () => Promise<void>
  updateUser: (patch: Partial<User>) => void
}

const STORAGE_KEY = 'littluxry_auth'
const DEMO_EMAIL = 'owner@littluxry.com'
const DEMO_PASSWORD = 'admin123'

const AuthContext = createContext<AuthContextValue | null>(null)

function mapUser(sb: SbUser | null, fallback?: Partial<User> | null): User | null {
  if (!sb) return fallback?.email ? (fallback as User) : null
  const meta = sb.user_metadata ?? {}
  const role: AppRole =
    meta.role === 'owner' ||
    meta.app_role === 'owner' ||
    sb.email === DEMO_EMAIL ||
    (sb.email?.endsWith('@littluxry.com') ?? false)
      ? 'owner'
      : 'customer'
  return {
    id: sb.id,
    email: sb.email ?? fallback?.email ?? '',
    name:
      meta.full_name ||
      meta.name ||
      fallback?.name ||
      sb.email?.split('@')[0] ||
      'Guest',
    role,
    avatar: meta.avatar_url || meta.picture || fallback?.avatar,
    phone: meta.phone || fallback?.phone,
    interests: meta.interests || fallback?.interests,
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [hydrated, setHydrated] = useState(false)
  const supabase = useMemo(() => {
    try {
      return createClient()
    } catch {
      return null
    }
  }, [])

  useEffect(() => {
    let local: User | null = null
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) local = JSON.parse(raw) as User
    } catch {
      /* ignore */
    }

    if (!supabase) {
      setUser(local)
      setHydrated(true)
      return
    }

    let unsub = () => {}
    void supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setUser(mapUser(data.session?.user ?? null, local))
      setHydrated(true)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next)
      setUser(mapUser(next?.user ?? null, null))
    })
    unsub = () => subscription.unsubscribe()

    return () => unsub()
  }, [supabase])

  useEffect(() => {
    if (!hydrated) return
    if (user) localStorage.setItem(STORAGE_KEY, JSON.stringify(user))
    else localStorage.removeItem(STORAGE_KEY)
  }, [user, hydrated])

  const login = useCallback(
    async (email: string, password: string, opts?: { preferAdmin?: boolean }) => {
      const normalized = email.trim().toLowerCase()

      // Demo owner always works offline
      if (normalized === DEMO_EMAIL && password === DEMO_PASSWORD) {
        const demo: User = {
          email: DEMO_EMAIL,
          name: 'Store Owner',
          role: 'owner',
        }
        setUser(demo)
        return { ok: true }
      }

      if (supabase) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: normalized,
          password,
        })
        if (error) return { ok: false, error: error.message }
        let mapped = mapUser(data.user, null)
        if (opts?.preferAdmin && mapped) {
          await supabase.auth.updateUser({
            data: { role: 'owner', app_role: 'owner' },
          })
          mapped = { ...mapped, role: 'owner' }
        }
        setUser(mapped)
        setSession(data.session)
        return { ok: true }
      }

      if (normalized.includes('@') && password.length >= 6) {
        setUser({
          email: normalized,
          name: normalized.split('@')[0],
          role: opts?.preferAdmin ? 'owner' : 'customer',
        })
        return { ok: true }
      }

      return {
        ok: false,
        error: 'Invalid credentials. Demo owner: owner@littluxry.com / admin123',
      }
    },
    [supabase],
  )

  const signUp = useCallback(
    async (input: {
      email: string
      password: string
      name: string
      phone?: string
      interests?: string[]
      role?: AppRole
    }) => {
      const email = input.email.trim().toLowerCase()
      const role = input.role ?? 'customer'

      if (supabase) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password: input.password,
          options: {
            data: {
              full_name: input.name,
              name: input.name,
              phone: input.phone,
              interests: input.interests ?? [],
              role,
              app_role: role,
            },
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          },
        })
        if (error) return { ok: false, error: error.message }
        if (data.session) {
          setSession(data.session)
          setUser(mapUser(data.user, { name: input.name, phone: input.phone, interests: input.interests, role, email }))
        } else {
          // Email confirmation may be required — still stash local profile for wizard UX
          setUser({
            email,
            name: input.name,
            role,
            phone: input.phone,
            interests: input.interests,
          })
        }
        return { ok: true }
      }

      setUser({
        email,
        name: input.name,
        role,
        phone: input.phone,
        interests: input.interests,
      })
      return { ok: true }
    },
    [supabase],
  )

  const signInWithGoogle = useCallback(
    async (opts?: { next?: string; role?: 'admin' | 'customer' }) => {
      if (!supabase) {
        throw new Error('Supabase is not configured — missing NEXT_PUBLIC_SUPABASE_* env')
      }
      const next = opts?.next ?? (opts?.role === 'admin' ? '/dashboard' : '/shop')
      const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}${
        opts?.role === 'admin' ? '&role=admin' : ''
      }`
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
          skipBrowserRedirect: true,
          queryParams: { access_type: 'offline', prompt: 'consent' },
        },
      })
      if (error) throw error
      if (!data.url) {
        throw new Error(
          'Google provider returned no URL — enable Google in Supabase Auth → Providers and paste Client ID/Secret',
        )
      }
      // Force navigation (more reliable than waiting for SDK redirect)
      window.location.assign(data.url)
    },
    [supabase],
  )

  const logout = useCallback(async () => {
    if (supabase) await supabase.auth.signOut()
    setUser(null)
    setSession(null)
  }, [supabase])

  const updateUser = useCallback(
    (patch: Partial<User>) => {
      setUser((prev) => (prev ? { ...prev, ...patch } : prev))
      if (supabase && (patch.name || patch.phone || patch.interests || patch.role)) {
        void supabase.auth.updateUser({
          data: {
            full_name: patch.name,
            name: patch.name,
            phone: patch.phone,
            interests: patch.interests,
            role: patch.role,
            app_role: patch.role,
          },
        })
      }
    },
    [supabase],
  )

  const value = useMemo(
    () => ({
      isLoggedIn: Boolean(user),
      hydrated,
      user,
      session,
      login,
      signUp,
      signInWithGoogle,
      logout,
      updateUser,
    }),
    [user, session, hydrated, login, signUp, signInWithGoogle, logout, updateUser],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

export const DEMO_CREDENTIALS = { email: DEMO_EMAIL, password: DEMO_PASSWORD }

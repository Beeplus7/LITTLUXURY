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
import {
  findStaff,
  hashPassword,
  isAdminEmail,
  isOwnerEmail,
  normalizeEmail,
  readLocalStaff,
  verifyPassword,
  writeLocalStaff,
  type StaffMember,
  type StaffRole,
} from '@/lib/shopStaff'
import {
  claimShopOwner,
  fetchShopState,
  syncStaff,
} from '@/lib/shopSyncClient'

export type AppRole = 'owner' | 'staff' | 'customer'

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
  isShopAdmin: boolean
  isShopOwner: boolean
  login: (
    email: string,
    password: string,
    opts?: { preferAdmin?: boolean },
  ) => Promise<{ ok: boolean; error?: string; role?: AppRole }>
  signUp: (input: {
    email: string
    password: string
    name: string
    phone?: string
    interests?: string[]
    role?: AppRole
  }) => Promise<{ ok: boolean; error?: string }>
  /** First-time only: claim this shop as the sole owner */
  claimOwner: (input: {
    email: string
    password: string
    name: string
  }) => Promise<{ ok: boolean; error?: string }>
  signInWithGoogle: (opts?: {
    next?: string
    role?: 'admin' | 'customer'
  }) => Promise<void>
  logout: () => Promise<void>
  updateUser: (patch: Partial<User>) => void
  refreshStaff: () => Promise<void>
  listTeam: () => StaffMember[]
  addTeamMember: (input: {
    email: string
    name: string
    password: string
    role?: StaffRole
  }) => Promise<{ ok: boolean; error?: string }>
  removeTeamMember: (email: string) => Promise<{ ok: boolean; error?: string }>
}

const STORAGE_KEY = 'littluxry_auth'
const DEMO_SESSION_KEY = 'littluxry_demo_session'
const DEMO_EMAIL = 'owner@littluxry.com'
const DEMO_PASSWORD = 'admin123'

const AuthContext = createContext<AuthContextValue | null>(null)

function readLocalUser(): User | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as User
  } catch {
    return null
  }
}

function isDemoSessionActive(): boolean {
  try {
    return localStorage.getItem(DEMO_SESSION_KEY) === '1'
  } catch {
    return false
  }
}

function setDemoSessionActive(on: boolean) {
  try {
    if (on) localStorage.setItem(DEMO_SESSION_KEY, '1')
    else localStorage.removeItem(DEMO_SESSION_KEY)
  } catch {
    /* ignore */
  }
}

function roleFromStaff(email: string): AppRole {
  const staff = readLocalStaff()
  if (isOwnerEmail(staff, email)) return 'owner'
  const m = findStaff(staff, email)
  if (m?.role === 'staff') return 'staff'
  return 'customer'
}

function mapUser(sb: SbUser | null, fallback?: Partial<User> | null): User | null {
  if (!sb) return fallback?.email ? (fallback as User) : null
  const meta = sb.user_metadata ?? {}
  const email = sb.email ?? fallback?.email ?? ''
  const staffRole = roleFromStaff(email)
  // Never trust client metadata alone for admin — staff registry is source of truth
  const role: AppRole =
    staffRole === 'owner' || staffRole === 'staff'
      ? staffRole
      : meta.role === 'customer' || fallback?.role === 'customer'
        ? 'customer'
        : 'customer'
  return {
    id: sb.id,
    email,
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

  const refreshStaff = useCallback(async () => {
    await fetchShopState()
  }, [])

  const listTeam = useCallback((): StaffMember[] => {
    return readLocalStaff().staff.filter((s) => s.active !== false)
  }, [])

  const addTeamMember = useCallback(
    async (input: {
      email: string
      name: string
      password: string
      role?: StaffRole
    }) => {
      await fetchShopState()
      const staff = readLocalStaff()
      const actor = normalizeEmail(user?.email || '')
      if (!actor || !isOwnerEmail(staff, actor)) {
        return {
          ok: false,
          error: 'Only the shop owner can add admin users.',
        }
      }
      const email = normalizeEmail(input.email)
      if (!email.includes('@')) {
        return { ok: false, error: 'Enter a valid email' }
      }
      if (input.password.length < 6) {
        return { ok: false, error: 'Password must be at least 6 characters' }
      }
      if (findStaff(staff, email)) {
        return { ok: false, error: 'That email is already on the team' }
      }
      if (email === staff.ownerEmail) {
        return { ok: false, error: 'That email is already the shop owner' }
      }
      const passwordHash = await hashPassword(input.password)
      const member: StaffMember = {
        email,
        name: input.name.trim() || email.split('@')[0] || 'Staff',
        role: input.role === 'owner' ? 'staff' : input.role || 'staff',
        passwordHash,
        createdAt: new Date().toISOString(),
        active: true,
      }
      const next = {
        ownerEmail: staff.ownerEmail,
        staff: [...staff.staff, member],
        updatedAt: new Date().toISOString(),
      }
      const synced = await syncStaff(actor, next)
      if (!synced) {
        writeLocalStaff(next)
        return {
          ok: false,
          error: 'Saved locally but could not sync to the shop server. Retry.',
        }
      }

      if (supabase) {
        await supabase.auth.signUp({
          email,
          password: input.password,
          options: {
            data: {
              full_name: member.name,
              name: member.name,
              role: member.role,
              app_role: member.role,
            },
          },
        })
      }

      return { ok: true }
    },
    [supabase, user?.email],
  )

  const removeTeamMember = useCallback(
    async (email: string) => {
      await fetchShopState()
      const staff = readLocalStaff()
      const actor = normalizeEmail(user?.email || '')
      if (!actor || !isOwnerEmail(staff, actor)) {
        return {
          ok: false,
          error: 'Only the shop owner can remove admin users.',
        }
      }
      const target = normalizeEmail(email)
      if (target === staff.ownerEmail) {
        return { ok: false, error: 'Cannot remove the shop owner' }
      }
      const next = {
        ownerEmail: staff.ownerEmail,
        staff: staff.staff.map((s) =>
          s.email === target ? { ...s, active: false } : s,
        ),
        updatedAt: new Date().toISOString(),
      }
      const synced = await syncStaff(actor, next)
      if (!synced) {
        writeLocalStaff(next)
        return {
          ok: false,
          error: 'Updated locally but could not sync to the shop server.',
        }
      }
      return { ok: true }
    },
    [user?.email],
  )

  useEffect(() => {
    const local = readLocalUser()
    let unsub = () => {}

    void (async () => {
      await fetchShopState()
      if (!supabase) {
        if (local?.email) {
          setUser({ ...local, role: roleFromStaff(local.email) })
        } else {
          setUser(null)
        }
        setHydrated(true)
        return
      }

      function applySession(next: Session | null) {
        setSession(next)
        if (next?.user) {
          setDemoSessionActive(false)
          setUser(mapUser(next.user, readLocalUser()))
          return
        }
        if (isDemoSessionActive()) {
          const demoLocal = readLocalUser()
          if (demoLocal && isAdminEmail(readLocalStaff(), demoLocal.email)) {
            setUser({
              ...demoLocal,
              role: roleFromStaff(demoLocal.email),
            })
            return
          }
        }
        setUser(null)
      }

      const { data } = await supabase.auth.getSession()
      applySession(data.session)
      setHydrated(true)

      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((_event, next) => {
        applySession(next)
      })
      unsub = () => subscription.unsubscribe()
    })()

    return () => unsub()
  }, [supabase])

  useEffect(() => {
    if (!hydrated) return
    if (user) localStorage.setItem(STORAGE_KEY, JSON.stringify(user))
    else localStorage.removeItem(STORAGE_KEY)
  }, [user, hydrated])

  const login = useCallback(
    async (
      email: string,
      password: string,
      opts?: { preferAdmin?: boolean },
    ): Promise<{ ok: boolean; error?: string; role?: AppRole }> => {
      const normalized = normalizeEmail(email)
      await fetchShopState()
      let staff = readLocalStaff()

      // Seed demo owner into empty shop so first device can bootstrap
      if (
        normalized === DEMO_EMAIL &&
        password === DEMO_PASSWORD &&
        !staff.ownerEmail
      ) {
        const hash = await hashPassword(DEMO_PASSWORD)
        const owner: StaffMember = {
          email: DEMO_EMAIL,
          name: 'Store Owner',
          role: 'owner',
          passwordHash: hash,
          createdAt: new Date().toISOString(),
          active: true,
        }
        const claimed = await claimShopOwner(owner)
        if (claimed?.staff) staff = claimed.staff
        else {
          writeLocalStaff({
            ownerEmail: DEMO_EMAIL,
            staff: [owner],
            updatedAt: new Date().toISOString(),
          })
          staff = readLocalStaff()
        }
      }

      if (opts?.preferAdmin) {
        const member = findStaff(staff, normalized)
        if (!member) {
          return {
            ok: false,
            error:
              'This email is not on the shop admin team. Ask the shop owner to add you in Settings → Team.',
          }
        }
        if (member.passwordHash) {
          const okPw = await verifyPassword(password, member.passwordHash)
          // Allow demo password for demo owner always
          const demoOk =
            normalized === DEMO_EMAIL && password === DEMO_PASSWORD
          if (!okPw && !demoOk) {
            return { ok: false, error: 'Invalid email or password.' }
          }
        }

        if (supabase) {
          const { data, error } = await supabase.auth.signInWithPassword({
            email: normalized,
            password,
          })
          if (!error && data.user) {
            setDemoSessionActive(false)
            const role = member.role as AppRole
            await supabase.auth.updateUser({
              data: { role, app_role: role, full_name: member.name },
            })
            const mapped = mapUser(data.user, {
              name: member.name,
              role,
              email: normalized,
            })
            setUser(
              mapped
                ? { ...mapped, role, name: member.name, email: normalized }
                : {
                    email: normalized,
                    name: member.name,
                    role,
                  },
            )
            setSession(data.session)
            return { ok: true, role }
          }
        }

        const role = member.role as AppRole
        setDemoSessionActive(normalized === DEMO_EMAIL)
        setSession(null)
        setUser({
          email: normalized,
          name: member.name,
          role,
        })
        return { ok: true, role }
      }

      // Customer / general login
      if (supabase) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: normalized,
          password,
        })
        if (error) return { ok: false, error: error.message }
        setDemoSessionActive(false)
        const mapped = mapUser(data.user, null)
        setUser(mapped)
        setSession(data.session)
        return { ok: true, role: mapped?.role }
      }

      if (normalized.includes('@') && password.length >= 6) {
        setDemoSessionActive(false)
        setUser({
          email: normalized,
          name: normalized.split('@')[0] || 'Guest',
          role: 'customer',
        })
        return { ok: true, role: 'customer' }
      }

      return { ok: false, error: 'Invalid email or password.' }
    },
    [supabase],
  )

  const claimOwner = useCallback(
    async (input: { email: string; password: string; name: string }) => {
      const email = normalizeEmail(input.email)
      await fetchShopState()
      const staff = readLocalStaff()
      if (staff.ownerEmail) {
        return {
          ok: false,
          error:
            'This shop already has an owner. Ask them to add your email in Settings → Team.',
        }
      }
      if (input.password.length < 6) {
        return { ok: false, error: 'Password must be at least 6 characters' }
      }
      const passwordHash = await hashPassword(input.password)
      const owner: StaffMember = {
        email,
        name: input.name.trim() || email.split('@')[0] || 'Owner',
        role: 'owner',
        passwordHash,
        createdAt: new Date().toISOString(),
        active: true,
      }
      const claimed = await claimShopOwner(owner)
      if (!claimed) {
        // Offline fallback — local only until sync works
        writeLocalStaff({
          ownerEmail: email,
          staff: [owner],
          updatedAt: new Date().toISOString(),
        })
      }

      if (supabase) {
        const { error } = await supabase.auth.signUp({
          email,
          password: input.password,
          options: {
            data: {
              full_name: owner.name,
              name: owner.name,
              role: 'owner',
              app_role: 'owner',
            },
          },
        })
        if (error && !error.message.toLowerCase().includes('already')) {
          // still allow local owner session
        }
      }

      setDemoSessionActive(email === DEMO_EMAIL)
      setUser({ email, name: owner.name, role: 'owner' })
      return { ok: true }
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
      const email = normalizeEmail(input.email)
      // Block public owner signup — must use claimOwner or Team invite
      if (input.role === 'owner' || input.role === 'staff') {
        return {
          ok: false,
          error:
            'Admin accounts are created by the shop owner in Settings → Team (or claim the shop once).',
        }
      }

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
              role: 'customer',
              app_role: 'customer',
            },
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          },
        })
        if (error) return { ok: false, error: error.message }
        if (data.session) {
          setSession(data.session)
          setUser(
            mapUser(data.user, {
              name: input.name,
              phone: input.phone,
              interests: input.interests,
              role: 'customer',
              email,
            }),
          )
        } else {
          setUser({
            email,
            name: input.name,
            role: 'customer',
            phone: input.phone,
            interests: input.interests,
          })
        }
        return { ok: true }
      }

      setUser({
        email,
        name: input.name,
        role: 'customer',
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
        throw new Error(
          'Supabase is not configured — missing NEXT_PUBLIC_SUPABASE_* env',
        )
      }
      await fetchShopState()
      const next =
        opts?.next ?? (opts?.role === 'admin' ? '/dashboard' : '/shop')
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
          'Google provider returned no URL — enable Google in Supabase Auth → Providers',
        )
      }
      window.location.assign(data.url)
    },
    [supabase],
  )

  const logout = useCallback(async () => {
    setDemoSessionActive(false)
    if (supabase) await supabase.auth.signOut()
    setUser(null)
    setSession(null)
  }, [supabase])

  const updateUser = useCallback(
    (patch: Partial<User>) => {
      setUser((prev) => (prev ? { ...prev, ...patch } : prev))
      if (supabase && (patch.name || patch.phone || patch.interests)) {
        void supabase.auth.updateUser({
          data: {
            full_name: patch.name,
            name: patch.name,
            phone: patch.phone,
            interests: patch.interests,
          },
        })
      }
    },
    [supabase],
  )

  const isShopAdmin =
    user?.role === 'owner' || user?.role === 'staff'
  const isShopOwner = user?.role === 'owner'

  const value = useMemo(
    () => ({
      isLoggedIn: Boolean(user),
      hydrated,
      user,
      session,
      isShopAdmin,
      isShopOwner,
      login,
      signUp,
      claimOwner,
      signInWithGoogle,
      logout,
      updateUser,
      refreshStaff,
      listTeam,
      addTeamMember,
      removeTeamMember,
    }),
    [
      user,
      session,
      hydrated,
      isShopAdmin,
      isShopOwner,
      login,
      signUp,
      claimOwner,
      signInWithGoogle,
      logout,
      updateUser,
      refreshStaff,
      listTeam,
      addTeamMember,
      removeTeamMember,
    ],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

export const DEMO_CREDENTIALS = { email: DEMO_EMAIL, password: DEMO_PASSWORD }

export type { StaffRole }

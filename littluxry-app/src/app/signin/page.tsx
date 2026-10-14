'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useState, type FormEvent } from 'react'
import { GoogleAuthButton } from '@/components/GoogleAuthButton'
import { SettingsTabs } from '@/components/SettingsTabs'
import { VideoHero } from '@/components/VideoHero'
import { useAuth } from '@/context/AuthContext'
import { useToast } from '@/lib/toast'
import { cn } from '@/lib/cn'
import { Shield } from 'lucide-react'

type Mode = 'signin' | 'forgot' | 'settings'

function SignInInner() {
  const { login, isLoggedIn, logout, user } = useAuth()
  const { toast } = useToast()
  const router = useRouter()
  const params = useSearchParams()
  const [mode, setMode] = useState<Mode>(
    isLoggedIn && user?.role === 'customer' ? 'settings' : 'signin',
  )
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(true)
  const [error, setError] = useState(() => {
    const err = params.get('error')
    if (!err) return ''
    const desc = params.get('error_description')?.replace(/\+/g, ' ')
    if (desc) return desc
    if (err === 'auth' || err === 'server_error') {
      return 'Google auth failed — Client Secret may be wrong. Reset it in Google Cloud and re-sync.'
    }
    return 'Google auth failed — check provider setup'
  })
  const [loading, setLoading] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (mode === 'forgot') {
      toast('Reset link sent (configure Supabase email templates for production)')
      setMode('signin')
      return
    }
    setLoading(true)
    setError('')
    const res = await login(email, password)
    setLoading(false)
    if (!res.ok) {
      setError(res.error ?? 'Login failed')
      return
    }
    toast('Welcome back')
    if (res.role === 'owner' || res.role === 'staff') {
      router.push('/dashboard')
      return
    }
    setMode('settings')
  }

  if (mode === 'settings' && isLoggedIn) {
    return (
      <div className="mx-auto max-w-5xl px-5 py-10 md:px-10">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.2em] text-[#D4AF37]">
              Account
            </p>
            <h1 className="serif text-3xl">Settings</h1>
          </div>
          <button
            type="button"
            onClick={async () => {
              await logout()
              setMode('signin')
              toast('Signed out')
            }}
            className="rounded-full border border-white/15 px-4 py-2 text-[11px] uppercase tracking-wider"
          >
            Sign out
          </button>
        </div>
        <SettingsTabs />
      </div>
    )
  }

  return (
    <div className="mx-auto grid min-h-[calc(100vh-68px)] max-w-6xl md:grid-cols-2">
      <div className="relative hidden overflow-hidden md:block">
        <VideoHero className="absolute inset-0 h-full rounded-none border-0" />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
        <div className="absolute bottom-10 left-10 right-10">
          <p className="serif text-5xl tracking-[0.18em] text-[#D4AF37]">LL</p>
          <p className="mt-3 text-sm text-[#f5f0e8]/80">
            Customer sign in · Google or email
          </p>
        </div>
      </div>

      <div className="flex items-center px-6 py-12 md:px-12">
        <div className="w-full max-w-md">
          <p className="serif text-center text-3xl tracking-[0.2em]">
            LITT <span className="text-[#D4AF37]">LUXURY</span>
          </p>

          <div className="mt-8">
            <GoogleAuthButton next="/shop" role="customer" />
          </div>

          <div className="my-6 flex items-center gap-3 text-[11px] uppercase tracking-[0.16em] text-[#6a655c]">
            <span className="h-px flex-1 bg-white/10" /> or email{' '}
            <span className="h-px flex-1 bg-white/10" />
          </div>

          <form onSubmit={onSubmit} className="space-y-4">
            {mode !== 'forgot' ? (
              <>
                <label className="block text-[12px] text-[#b8b0a4]">
                  Email
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-white/10 bg-black px-3 py-3 text-sm outline-none focus:border-[#D4AF37]/50"
                  />
                </label>
                <label className="block text-[12px] text-[#b8b0a4]">
                  Password
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-white/10 bg-black px-3 py-3 text-sm outline-none focus:border-[#D4AF37]/50"
                  />
                </label>
                <div className="flex items-center justify-between text-[12px]">
                  <label className="flex items-center gap-2 text-[#b8b0a4]">
                    <input
                      type="checkbox"
                      checked={remember}
                      onChange={(e) => setRemember(e.target.checked)}
                    />
                    Remember me
                  </label>
                  <button
                    type="button"
                    className="text-[#D4AF37]"
                    onClick={() => setMode('forgot')}
                  >
                    Forgot password?
                  </button>
                </div>
              </>
            ) : (
              <label className="block text-[12px] text-[#b8b0a4]">
                Email for reset
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-white/10 bg-black px-3 py-3 text-sm"
                />
              </label>
            )}

            {error ? <p className="text-sm text-red-300">{error}</p> : null}

            <button
              type="submit"
              disabled={loading}
              className={cn(
                'w-full rounded-full bg-[#D4AF37] py-3.5 text-[12px] font-semibold uppercase tracking-[0.16em] text-black disabled:opacity-60',
              )}
            >
              {loading
                ? 'Please wait…'
                : mode === 'forgot'
                  ? 'Send reset link'
                  : 'Sign in'}
            </button>
          </form>

          <p className="mt-6 text-center text-[12px] text-[#6a655c]">
            New here?{' '}
            <Link href="/signup" className="text-[#D4AF37]">
              Sign up wizard
            </Link>
          </p>

          <Link
            href="/admin/signin"
            className="mt-8 flex items-center gap-3 rounded-2xl border border-[#D4AF37]/35 bg-[#D4AF37]/10 p-4 transition hover:border-[#D4AF37]/60 hover:bg-[#D4AF37]/15"
          >
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#D4AF37] text-black">
              <Shield size={18} />
            </span>
            <span className="min-w-0 text-left">
              <span className="block text-[11px] font-semibold uppercase tracking-[0.18em] text-[#D4AF37]">
                Admin only
              </span>
              <span className="mt-0.5 block text-[12px] text-[#b8b0a4]">
                Protected console for store owners — not for customers
              </span>
            </span>
          </Link>
        </div>
      </div>
    </div>
  )
}

export default function SignInPage() {
  return (
    <Suspense
      fallback={
        <div className="grid min-h-[50vh] place-items-center text-[#b8b0a4]">
          Loading…
        </div>
      }
    >
      <SignInInner />
    </Suspense>
  )
}

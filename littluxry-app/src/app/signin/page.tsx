'use client'

import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { VideoHero } from '@/components/VideoHero'
import { SettingsTabs } from '@/components/SettingsTabs'
import { useAuth, DEMO_CREDENTIALS } from '@/context/AuthContext'
import { useToast } from '@/lib/toast'
import { cn } from '@/lib/cn'

type Mode = 'signin' | 'create' | 'forgot' | 'settings'

export default function SignInPage() {
  const { login, isLoggedIn, logout } = useAuth()
  const { toast } = useToast()
  const router = useRouter()
  const [mode, setMode] = useState<Mode>(isLoggedIn ? 'settings' : 'signin')
  const [email, setEmail] = useState(DEMO_CREDENTIALS.email)
  const [password, setPassword] = useState(DEMO_CREDENTIALS.password)
  const [remember, setRemember] = useState(true)
  const [error, setError] = useState('')

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (mode === 'forgot') {
      toast('Reset link sent (demo)')
      setMode('signin')
      return
    }
    const res = login(email, password)
    if (!res.ok) {
      setError(res.error ?? 'Login failed')
      return
    }
    toast('Welcome back')
    if (email.toLowerCase() === DEMO_CREDENTIALS.email) {
      router.push('/dashboard')
    } else {
      setMode('settings')
    }
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
            onClick={() => {
              logout()
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
            Owner dashboard · payments · atelier control
          </p>
        </div>
      </div>

      <div className="flex items-center px-6 py-12 md:px-12">
        <div className="w-full max-w-md">
          <p className="serif text-center text-3xl tracking-[0.2em]">
            LITT <span className="text-[#D4AF37]">LUXRY</span>
          </p>
          <div className="mt-8 flex rounded-full border border-white/10 p-1">
            {(
              [
                ['signin', 'Sign in'],
                ['create', 'Create account'],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => {
                  setMode(id)
                  setError('')
                }}
                className={cn(
                  'flex-1 rounded-full py-2.5 text-[12px] uppercase tracking-[0.14em]',
                  mode === id
                    ? 'bg-[#D4AF37] text-black'
                    : 'text-[#b8b0a4]',
                )}
              >
                {label}
              </button>
            ))}
          </div>

          <form onSubmit={onSubmit} className="mt-8 space-y-4">
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
              className="w-full rounded-full bg-[#D4AF37] py-3.5 text-[12px] font-semibold uppercase tracking-[0.16em] text-black transition hover:brightness-110"
            >
              {mode === 'forgot'
                ? 'Send reset link'
                : mode === 'create'
                  ? 'Create account'
                  : 'Sign in'}
            </button>
          </form>

          <div className="mt-6 grid grid-cols-2 gap-3">
            {['Google', 'Apple'].map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => toast(`${p} sign-in (demo)`)}
                className="rounded-full border border-white/15 py-2.5 text-[12px] uppercase tracking-wider"
              >
                {p}
              </button>
            ))}
          </div>

          <p className="mt-6 rounded-2xl border border-[#D4AF37]/25 bg-[#D4AF37]/5 p-4 text-[12px] leading-relaxed text-[#b8b0a4]">
            Demo owner: <span className="text-[#D4AF37]">{DEMO_CREDENTIALS.email}</span>
            <br />
            Password: <span className="text-[#D4AF37]">{DEMO_CREDENTIALS.password}</span>
          </p>
        </div>
      </div>
    </div>
  )
}

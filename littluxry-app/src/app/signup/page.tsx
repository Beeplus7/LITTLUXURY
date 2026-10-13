'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'
import { GoogleAuthButton } from '@/components/GoogleAuthButton'
import { VideoHero } from '@/components/VideoHero'
import { useAuth } from '@/context/AuthContext'
import { SHOP_CATEGORIES } from '@/data/categories'
import { useToast } from '@/lib/toast'
import { cn } from '@/lib/cn'

const STEPS = ['Account', 'Profile', 'Style', 'Done'] as const

export default function SignUpWizardPage() {
  const { signUp, isLoggedIn } = useAuth()
  const { toast } = useToast()
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    email: '',
    password: '',
    confirm: '',
    name: '',
    phone: '',
    interests: [] as string[],
  })
  const [error, setError] = useState('')

  const progress = useMemo(() => ((step + 1) / STEPS.length) * 100, [step])

  async function finish() {
    setLoading(true)
    setError('')
    const res = await signUp({
      email: form.email,
      password: form.password,
      name: form.name,
      phone: form.phone,
      interests: form.interests,
      role: 'customer',
    })
    setLoading(false)
    if (!res.ok) {
      setError(res.error ?? 'Sign up failed')
      setStep(0)
      return
    }
    setStep(3)
    toast('Welcome to LITT LUXURY')
  }

  return (
    <div className="mx-auto grid min-h-[calc(100vh-68px)] max-w-6xl md:grid-cols-2">
      <div className="relative hidden overflow-hidden md:block">
        <VideoHero className="absolute inset-0 h-full rounded-none border-0" />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
        <div className="absolute bottom-10 left-10 right-10">
          <p className="serif text-5xl tracking-[0.18em] text-[#D4AF37]">LL</p>
          <p className="mt-3 text-sm text-[#f5f0e8]/80">
            Create your atelier account — 4 quick steps.
          </p>
        </div>
      </div>

      <div className="flex items-center px-6 py-10 md:px-12">
        <div className="w-full max-w-md">
          <p className="text-[11px] uppercase tracking-[0.2em] text-[#D4AF37]">
            Customer sign up
          </p>
          <h1 className="serif mt-2 text-3xl">Join LITT LUXURY</h1>

          <div className="mt-6 h-1.5 overflow-hidden rounded-full bg-zinc-900">
            <div
              className="h-full bg-[#D4AF37] transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="mt-3 flex justify-between text-[10px] uppercase tracking-[0.14em] text-[#6a655c]">
            {STEPS.map((s, i) => (
              <span key={s} className={i <= step ? 'text-[#D4AF37]' : ''}>
                {s}
              </span>
            ))}
          </div>

          {step === 0 ? (
            <div className="mt-8 space-y-4">
              <GoogleAuthButton next="/shop" role="customer" />
              <div className="flex items-center gap-3 text-[11px] uppercase tracking-[0.16em] text-[#6a655c]">
                <span className="h-px flex-1 bg-white/10" /> or email{' '}
                <span className="h-px flex-1 bg-white/10" />
              </div>
              <label className="block text-[12px] text-[#b8b0a4]">
                Email
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-white/10 bg-black px-3 py-3 text-sm outline-none focus:border-[#D4AF37]/50"
                />
              </label>
              <label className="block text-[12px] text-[#b8b0a4]">
                Password
                <input
                  type="password"
                  required
                  minLength={6}
                  value={form.password}
                  onChange={(e) =>
                    setForm({ ...form, password: e.target.value })
                  }
                  className="mt-1 w-full rounded-xl border border-white/10 bg-black px-3 py-3 text-sm outline-none focus:border-[#D4AF37]/50"
                />
              </label>
              <label className="block text-[12px] text-[#b8b0a4]">
                Confirm password
                <input
                  type="password"
                  required
                  value={form.confirm}
                  onChange={(e) => setForm({ ...form, confirm: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-white/10 bg-black px-3 py-3 text-sm outline-none focus:border-[#D4AF37]/50"
                />
              </label>
              {error ? <p className="text-sm text-red-300">{error}</p> : null}
              <button
                type="button"
                onClick={() => {
                  if (!form.email.includes('@') || form.password.length < 6) {
                    setError('Enter a valid email and 6+ character password')
                    return
                  }
                  if (form.password !== form.confirm) {
                    setError('Passwords do not match')
                    return
                  }
                  setError('')
                  setStep(1)
                }}
                className="w-full rounded-full bg-[#D4AF37] py-3.5 text-[12px] font-semibold uppercase tracking-[0.16em] text-black"
              >
                Continue
              </button>
            </div>
          ) : null}

          {step === 1 ? (
            <div className="mt-8 space-y-4">
              <label className="block text-[12px] text-[#b8b0a4]">
                Full name
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-white/10 bg-black px-3 py-3 text-sm outline-none focus:border-[#D4AF37]/50"
                />
              </label>
              <label className="block text-[12px] text-[#b8b0a4]">
                Phone (optional)
                <input
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-white/10 bg-black px-3 py-3 text-sm outline-none focus:border-[#D4AF37]/50"
                />
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setStep(0)}
                  className="flex-1 rounded-full border border-white/15 py-3 text-[12px] uppercase tracking-wider"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!form.name.trim()) {
                      setError('Name is required')
                      return
                    }
                    setError('')
                    setStep(2)
                  }}
                  className="flex-1 rounded-full bg-[#D4AF37] py-3 text-[12px] font-semibold uppercase tracking-wider text-black"
                >
                  Continue
                </button>
              </div>
            </div>
          ) : null}

          {step === 2 ? (
            <div className="mt-8 space-y-4">
              <p className="text-sm text-[#b8b0a4]">
                What are you shopping for? (pick any)
              </p>
              <div className="flex flex-wrap gap-2">
                {SHOP_CATEGORIES.map((c) => {
                  const on = form.interests.includes(c.id)
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() =>
                        setForm((f) => ({
                          ...f,
                          interests: on
                            ? f.interests.filter((x) => x !== c.id)
                            : [...f.interests, c.id],
                        }))
                      }
                      className={cn(
                        'rounded-full px-4 py-2 text-[11px] uppercase tracking-[0.12em]',
                        on
                          ? 'bg-[#D4AF37] text-black'
                          : 'border border-white/15 text-[#b8b0a4]',
                      )}
                    >
                      {c.label}
                    </button>
                  )
                })}
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="flex-1 rounded-full border border-white/15 py-3 text-[12px] uppercase tracking-wider"
                >
                  Back
                </button>
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => void finish()}
                  className="flex-1 rounded-full bg-[#D4AF37] py-3 text-[12px] font-semibold uppercase tracking-wider text-black disabled:opacity-60"
                >
                  {loading ? 'Creating…' : 'Create account'}
                </button>
              </div>
              {error ? <p className="text-sm text-red-300">{error}</p> : null}
            </div>
          ) : null}

          {step === 3 || (isLoggedIn && step === 3) ? (
            <div className="mt-10 text-center">
              <p className="serif text-3xl text-[#D4AF37]">You’re in</p>
              <p className="mt-3 text-sm text-[#b8b0a4]">
                Your atelier profile is ready. Explore the collection.
              </p>
              <button
                type="button"
                onClick={() => router.push('/shop')}
                className="mt-8 w-full rounded-full bg-[#D4AF37] py-3.5 text-[12px] font-semibold uppercase tracking-[0.16em] text-black"
              >
                Shop now
              </button>
            </div>
          ) : null}

          <p className="mt-8 text-center text-[12px] text-[#6a655c]">
            Already have an account?{' '}
            <Link href="/signin" className="text-[#D4AF37]">
              Sign in
            </Link>
            {' · '}
            <Link href="/admin/signin" className="text-[#D4AF37]">
              Admin
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

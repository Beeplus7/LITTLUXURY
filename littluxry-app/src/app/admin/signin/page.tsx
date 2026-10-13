'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, type FormEvent } from 'react'
import { Shield } from 'lucide-react'
import { GoogleAuthButton } from '@/components/GoogleAuthButton'
import { VideoHero } from '@/components/VideoHero'
import { useAuth } from '@/context/AuthContext'
import { useToast } from '@/lib/toast'

export default function AdminSignInPage() {
  const { login } = useAuth()
  const { toast } = useToast()
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const res = await login(email, password, { preferAdmin: true })
    setLoading(false)
    if (!res.ok) {
      setError(res.error ?? 'Sign in failed')
      return
    }
    toast('Admin signed in')
    router.push('/dashboard')
  }

  return (
    <div className="mx-auto grid min-h-[calc(100vh-68px)] max-w-6xl md:grid-cols-2">
      <div className="relative hidden overflow-hidden md:block">
        <VideoHero className="absolute inset-0 h-full rounded-none border-0" />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/55 to-transparent" />
        <div className="absolute bottom-10 left-10">
          <p className="text-[11px] uppercase tracking-[0.2em] text-[#D4AF37]">
            Restricted
          </p>
          <h1 className="serif mt-2 text-4xl">Admin only</h1>
        </div>
      </div>

      <div className="flex items-center px-6 py-12 md:px-12">
        <div className="w-full max-w-md">
          <div className="rounded-2xl border border-[#D4AF37]/35 bg-gradient-to-b from-[#D4AF37]/10 to-transparent p-5">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#D4AF37] text-black">
                <Shield size={18} />
              </span>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#D4AF37]">
                  Admin only
                </p>
                <p className="text-[12px] text-[#b8b0a4]">
                  Protected console · authorized owners only
                </p>
              </div>
            </div>
          </div>

          <p className="serif mt-8 text-center text-3xl tracking-[0.18em]">
            LITT <span className="text-[#D4AF37]">LUXRY</span>
          </p>
          <p className="mt-2 text-center text-[12px] uppercase tracking-[0.18em] text-[#b8b0a4]">
            Admin sign in
          </p>

          <div className="mt-8">
            <GoogleAuthButton
              role="admin"
              next="/dashboard"
              label="Admin continue with Google"
            />
          </div>

          <div className="my-6 flex items-center gap-3 text-[11px] uppercase tracking-[0.16em] text-[#6a655c]">
            <span className="h-px flex-1 bg-white/10" /> or email{' '}
            <span className="h-px flex-1 bg-white/10" />
          </div>

          <form onSubmit={onSubmit} className="space-y-4">
            <label className="block text-[12px] text-[#b8b0a4]">
              Email
              <input
                type="email"
                required
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Owner email"
                className="mt-1 w-full rounded-xl border border-white/10 bg-black px-3 py-3 text-sm outline-none focus:border-[#D4AF37]/50"
              />
            </label>
            <label className="block text-[12px] text-[#b8b0a4]">
              Password
              <input
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="mt-1 w-full rounded-xl border border-white/10 bg-black px-3 py-3 text-sm outline-none focus:border-[#D4AF37]/50"
              />
            </label>
            {error ? <p className="text-sm text-red-300">{error}</p> : null}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-full bg-[#D4AF37] py-3.5 text-[12px] font-semibold uppercase tracking-[0.16em] text-black disabled:opacity-60"
            >
              {loading ? 'Signing in…' : 'Enter dashboard'}
            </button>
          </form>

          <p className="mt-6 text-center text-[12px] text-[#6a655c]">
            Need an admin seat?{' '}
            <Link href="/admin/signup" className="text-[#D4AF37]">
              Admin sign up
            </Link>
            {' · '}
            <Link href="/signin" className="text-[#D4AF37]">
              Customer sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

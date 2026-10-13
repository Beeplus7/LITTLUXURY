'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, type FormEvent } from 'react'
import { GoogleAuthButton } from '@/components/GoogleAuthButton'
import { VideoHero } from '@/components/VideoHero'
import { useAuth } from '@/context/AuthContext'
import { useToast } from '@/lib/toast'

export default function AdminSignUpPage() {
  const { signUp } = useAuth()
  const { toast } = useToast()
  const router = useRouter()
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    invite: 'LITTLUXRY-OWNER',
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (form.invite.trim() !== 'LITTLUXRY-OWNER') {
      setError('Invalid owner invite code')
      return
    }
    setLoading(true)
    setError('')
    const res = await signUp({
      email: form.email,
      password: form.password,
      name: form.name,
      role: 'owner',
    })
    setLoading(false)
    if (!res.ok) {
      setError(res.error ?? 'Sign up failed')
      return
    }
    toast('Admin account created')
    router.push('/dashboard')
  }

  return (
    <div className="mx-auto grid min-h-[calc(100vh-68px)] max-w-6xl md:grid-cols-2">
      <div className="relative hidden overflow-hidden md:block">
        <VideoHero className="absolute inset-0 h-full rounded-none border-0" />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/55 to-transparent" />
        <div className="absolute bottom-10 left-10">
          <p className="text-[11px] uppercase tracking-[0.2em] text-[#D4AF37]">
            Owner onboarding
          </p>
          <h1 className="serif mt-2 text-4xl">Create admin</h1>
        </div>
      </div>

      <div className="flex items-center px-6 py-12 md:px-12">
        <div className="w-full max-w-md">
          <h1 className="serif text-3xl">Admin sign up</h1>
          <p className="mt-2 text-sm text-[#b8b0a4]">
            Requires invite code <span className="text-[#D4AF37]">LITTLUXRY-OWNER</span>
          </p>

          <div className="mt-8">
            <GoogleAuthButton
              role="admin"
              next="/dashboard"
              label="Admin sign up with Google"
            />
          </div>

          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            {(
              [
                ['name', 'Full name', 'text'],
                ['email', 'Work email', 'email'],
                ['password', 'Password', 'password'],
                ['invite', 'Invite code', 'text'],
              ] as const
            ).map(([key, label, type]) => (
              <label key={key} className="block text-[12px] text-[#b8b0a4]">
                {label}
                <input
                  type={type}
                  required
                  value={form[key]}
                  onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-white/10 bg-black px-3 py-3 text-sm outline-none focus:border-[#D4AF37]/50"
                />
              </label>
            ))}
            {error ? <p className="text-sm text-red-300">{error}</p> : null}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-full bg-[#D4AF37] py-3.5 text-[12px] font-semibold uppercase tracking-[0.16em] text-black disabled:opacity-60"
            >
              {loading ? 'Creating…' : 'Create admin account'}
            </button>
          </form>

          <p className="mt-6 text-center text-[12px] text-[#6a655c]">
            Already an admin?{' '}
            <Link href="/admin/signin" className="text-[#D4AF37]">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

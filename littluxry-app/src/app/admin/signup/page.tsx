'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState, type FormEvent } from 'react'
import { VideoHero } from '@/components/VideoHero'
import { useAuth } from '@/context/AuthContext'
import { fetchShopState } from '@/lib/shopSyncClient'
import { readLocalStaff } from '@/lib/shopStaff'
import { useToast } from '@/lib/toast'

export default function AdminSignUpPage() {
  const { claimOwner } = useAuth()
  const { toast } = useToast()
  const router = useRouter()
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [ownerLocked, setOwnerLocked] = useState(false)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    void (async () => {
      await fetchShopState()
      const staff = readLocalStaff()
      setOwnerLocked(Boolean(staff.ownerEmail))
      setChecking(false)
    })()
  }, [])

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const res = await claimOwner({
      email: form.email,
      password: form.password,
      name: form.name,
    })
    setLoading(false)
    if (!res.ok) {
      setError(res.error ?? 'Could not claim shop')
      return
    }
    toast('You are the shop owner')
    router.push('/dashboard')
  }

  return (
    <div className="mx-auto grid min-h-[calc(100vh-68px)] max-w-6xl md:grid-cols-2">
      <div className="relative hidden overflow-hidden md:block">
        <VideoHero className="absolute inset-0 h-full rounded-none border-0" />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/55 to-transparent" />
        <div className="absolute bottom-10 left-10">
          <p className="text-[11px] uppercase tracking-[0.2em] text-[#D4AF37]">
            One shop · one owner
          </p>
          <h1 className="serif mt-2 text-4xl">Claim admin</h1>
        </div>
      </div>

      <div className="flex items-center px-6 py-12 md:px-12">
        <div className="w-full max-w-md">
          <h1 className="serif text-3xl">Shop owner setup</h1>
          {checking ? (
            <p className="mt-4 text-sm text-[#b8b0a4]">Checking shop status…</p>
          ) : ownerLocked ? (
            <div className="mt-4 space-y-4">
              <p className="text-sm text-[#b8b0a4]">
                This shop already has an owner. New admin logins can only be
                created by the owner under{' '}
                <span className="text-[#D4AF37]">Settings → Team</span>.
              </p>
              <Link
                href="/admin/signin"
                className="inline-flex rounded-full bg-[#D4AF37] px-5 py-3 text-[12px] font-semibold uppercase tracking-[0.14em] text-black"
              >
                Go to admin sign in
              </Link>
            </div>
          ) : (
            <>
              <p className="mt-2 text-sm text-[#b8b0a4]">
                Claim this store as the single shop owner. After this, only you
                can add team emails in Settings.
              </p>
              <form onSubmit={onSubmit} className="mt-8 space-y-4">
                {(
                  [
                    ['name', 'Full name', 'text'],
                    ['email', 'Owner email', 'email'],
                    ['password', 'Password', 'password'],
                  ] as const
                ).map(([key, label, type]) => (
                  <label key={key} className="block text-[12px] text-[#b8b0a4]">
                    {label}
                    <input
                      type={type}
                      required
                      value={form[key]}
                      onChange={(e) =>
                        setForm({ ...form, [key]: e.target.value })
                      }
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
                  {loading ? 'Claiming…' : 'Claim shop as owner'}
                </button>
              </form>
            </>
          )}

          <p className="mt-6 text-center text-[12px] text-[#6a655c]">
            Already on the team?{' '}
            <Link href="/admin/signin" className="text-[#D4AF37]">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

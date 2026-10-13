'use client'

import { useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import { PaymentSettings } from '@/components/PaymentSettings'
import { useToast } from '@/lib/toast'
import { cn } from '@/lib/cn'

const TABS = [
  'Profile',
  'Security',
  'Notifications',
  'Store',
  'Payment',
  'Billing',
] as const

type Tab = (typeof TABS)[number]

export function SettingsTabs() {
  const [tab, setTab] = useState<Tab>('Profile')
  const { user, updateUser } = useAuth()
  const { toast } = useToast()
  const [twoFA, setTwoFA] = useState(false)
  const [notif, setNotif] = useState({
    orders: true,
    reviews: true,
    marketing: false,
  })

  return (
    <div>
      <div className="mb-6 flex gap-2 overflow-x-auto pb-1">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={cn(
              'shrink-0 rounded-full px-4 py-2 text-[12px] uppercase tracking-[0.14em] transition',
              tab === t
                ? 'bg-[#D4AF37] text-black'
                : 'border border-white/10 text-[#b8b0a4] hover:border-[#D4AF37]/40',
            )}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'Profile' ? (
        <div className="space-y-4 rounded-2xl border border-white/10 bg-zinc-950 p-5">
          <div className="flex items-center gap-4">
            <div className="grid h-16 w-16 place-items-center rounded-full bg-gradient-to-br from-[#D4AF37] to-[#8a6a1a] text-lg font-bold text-black">
              {(user?.name ?? 'SO').slice(0, 2).toUpperCase()}
            </div>
            <label className="cursor-pointer rounded-full border border-white/15 px-4 py-2 text-[12px] uppercase tracking-wider">
              Upload avatar
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={() => toast('Avatar updated')}
              />
            </label>
          </div>
          <label className="block text-[12px] text-[#b8b0a4]">
            Display name
            <input
              defaultValue={user?.name}
              onBlur={(e) => updateUser({ name: e.target.value })}
              className="mt-1 w-full rounded-xl border border-white/10 bg-black px-3 py-2 text-sm text-white"
            />
          </label>
          <label className="block text-[12px] text-[#b8b0a4]">
            Email
            <input
              defaultValue={user?.email}
              readOnly
              className="mt-1 w-full rounded-xl border border-white/10 bg-black px-3 py-2 text-sm text-[#b8b0a4]"
            />
          </label>
        </div>
      ) : null}

      {tab === 'Security' ? (
        <div className="space-y-4 rounded-2xl border border-white/10 bg-zinc-950 p-5">
          <label className="block text-[12px] text-[#b8b0a4]">
            Change password
            <input
              type="password"
              placeholder="New password"
              className="mt-1 w-full rounded-xl border border-white/10 bg-black px-3 py-2 text-sm"
            />
          </label>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Two-factor authentication</p>
              <p className="text-[12px] text-[#b8b0a4]">SMS / authenticator app</p>
            </div>
            <button
              type="button"
              onClick={() => {
                setTwoFA((v) => !v)
                toast(`2FA ${!twoFA ? 'enabled' : 'disabled'}`)
              }}
              className={cn(
                'h-7 w-12 rounded-full',
                twoFA ? 'bg-[#D4AF37]' : 'bg-zinc-700',
              )}
            >
              <span
                className={cn(
                  'block h-5 w-5 translate-y-1 rounded-full bg-black transition',
                  twoFA ? 'translate-x-6' : 'translate-x-1',
                )}
              />
            </button>
          </div>
          <div>
            <p className="mb-2 text-[12px] uppercase tracking-[0.16em] text-[#b8b0a4]">
              Login history
            </p>
            {['Chrome · Lagos · 2h ago', 'Safari · London · Oct 10', 'iOS App · Oct 8'].map(
              (row) => (
                <p
                  key={row}
                  className="border-t border-white/10 py-2 text-sm text-[#b8b0a4]"
                >
                  {row}
                </p>
              ),
            )}
          </div>
        </div>
      ) : null}

      {tab === 'Notifications' ? (
        <div className="space-y-3 rounded-2xl border border-white/10 bg-zinc-950 p-5">
          {(
            [
              ['orders', 'Order updates'],
              ['reviews', 'New reviews'],
              ['marketing', 'Marketing emails'],
            ] as const
          ).map(([key, label]) => (
            <div
              key={key}
              className="flex items-center justify-between rounded-xl border border-white/10 px-4 py-3"
            >
              <p>{label}</p>
              <button
                type="button"
                onClick={() =>
                  setNotif((n) => ({ ...n, [key]: !n[key] }))
                }
                className={cn(
                  'h-7 w-12 rounded-full',
                  notif[key] ? 'bg-[#D4AF37]' : 'bg-zinc-700',
                )}
              >
                <span
                  className={cn(
                    'block h-5 w-5 translate-y-1 rounded-full bg-black transition',
                    notif[key] ? 'translate-x-6' : 'translate-x-1',
                  )}
                />
              </button>
            </div>
          ))}
        </div>
      ) : null}

      {tab === 'Store' ? (
        <div className="grid gap-3 rounded-2xl border border-white/10 bg-zinc-950 p-5 sm:grid-cols-2">
          {[
            ['Currency', 'USD'],
            ['Language', 'English'],
            ['Timezone', 'UTC+1'],
            ['Status', 'Open'],
            ['Domain', 'littluxry.com'],
            ['Logo', 'LL mark'],
          ].map(([label, value]) => (
            <label key={label} className="block text-[12px] text-[#b8b0a4]">
              {label}
              <input
                defaultValue={value}
                className="mt-1 w-full rounded-xl border border-white/10 bg-black px-3 py-2 text-sm text-white"
              />
            </label>
          ))}
          <button
            type="button"
            onClick={() => toast('Store settings saved')}
            className="sm:col-span-2 mt-2 rounded-full bg-[#D4AF37] py-3 text-[12px] font-semibold uppercase tracking-wider text-black"
          >
            Save store
          </button>
        </div>
      ) : null}

      {tab === 'Payment' ? <PaymentSettings /> : null}

      {tab === 'Billing' ? (
        <div className="rounded-2xl border border-[#D4AF37]/30 bg-zinc-950 p-6">
          <p className="text-[11px] uppercase tracking-[0.2em] text-[#D4AF37]">
            Current plan
          </p>
          <h3 className="serif mt-2 text-3xl">LUXE Pro — $29/mo</h3>
          <p className="mt-2 text-sm text-[#b8b0a4]">
            Unlimited products, AI Shop Builder, priority payouts, custom domain.
          </p>
          <button
            type="button"
            onClick={() => toast('Billing portal opened')}
            className="mt-5 rounded-full border border-white/15 px-5 py-2.5 text-[12px] uppercase tracking-wider"
          >
            Manage billing
          </button>
        </div>
      ) : null}
    </div>
  )
}

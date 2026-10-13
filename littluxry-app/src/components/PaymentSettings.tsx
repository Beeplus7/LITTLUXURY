'use client'

import { useState } from 'react'
import { CreditCard, Plus, X } from 'lucide-react'
import { useToast } from '@/lib/toast'
import { cn } from '@/lib/cn'

const PAYOUTS = [
  { id: 1, date: 'Oct 1, 2026', amount: 2100, status: 'Paid', method: 'PayPal' },
  { id: 2, date: 'Sep 15, 2026', amount: 1680, status: 'Paid', method: 'Bank' },
  { id: 3, date: 'Sep 1, 2026', amount: 1420, status: 'Paid', method: 'PayPal' },
]

export function PaymentSettings() {
  const { toast } = useToast()
  const [paypalConnected, setPaypalConnected] = useState(true)
  const [applePay, setApplePay] = useState(true)
  const [googlePay, setGooglePay] = useState(true)
  const [cod, setCod] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [apiKey, setApiKey] = useState('')
  const [secret, setSecret] = useState('')

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: 'Revenue', value: '$8,420' },
          { label: 'Pending', value: '$1,240' },
          { label: 'Last payout', value: '$2,100' },
        ].map((card) => (
          <div
            key={card.label}
            className="rounded-2xl border border-white/10 bg-zinc-950 p-5"
          >
            <p className="text-[11px] uppercase tracking-[0.18em] text-[#b8b0a4]">
              {card.label}
            </p>
            <p className="serif mt-2 text-3xl text-[#D4AF37]">{card.value}</p>
          </div>
        ))}
      </div>

      <section className="rounded-2xl border border-white/10 bg-zinc-950 p-5">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-semibold">Payment methods</h3>
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="inline-flex items-center gap-1 rounded-full border border-[#D4AF37]/40 px-3 py-1.5 text-[11px] uppercase tracking-wider text-[#D4AF37]"
          >
            <Plus size={12} /> Add method
          </button>
        </div>

        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 p-4">
            <div>
              <p className="font-medium">PayPal</p>
              <p className="text-[12px] text-[#b8b0a4]">
                {paypalConnected
                  ? 'Connected · owner@littluxry.com'
                  : 'Not connected'}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                className="rounded-full border border-white/15 px-3 py-1.5 text-[11px] uppercase tracking-wider"
                onClick={() => toast('PayPal settings opened')}
              >
                Edit
              </button>
              <button
                type="button"
                className="rounded-full border border-white/15 px-3 py-1.5 text-[11px] uppercase tracking-wider text-red-300"
                onClick={() => {
                  setPaypalConnected(false)
                  toast('PayPal disconnected')
                }}
              >
                Disconnect
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 p-4">
            <div>
              <p className="font-medium">Stripe Connect</p>
              <p className="text-[12px] text-[#b8b0a4]">
                Keys loaded from Visaguide/passport-paper ·{' '}
                {process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
                  ? `pk …${process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY.slice(-6)}`
                  : 'missing publishable key'}
              </p>
            </div>
            <button
              type="button"
              onClick={() =>
                toast(
                  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
                    ? 'Stripe test keys detected — wire Checkout Session next'
                    : 'Add NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY',
                )
              }
              className="rounded-full bg-[#D4AF37] px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-black"
            >
              Connect Stripe
            </button>
          </div>

          {[
            {
              label: 'Apple Pay',
              value: applePay,
              set: setApplePay,
            },
            {
              label: 'Google Pay',
              value: googlePay,
              set: setGooglePay,
            },
            {
              label: 'Cash on delivery',
              value: cod,
              set: setCod,
            },
          ].map((t) => (
            <div
              key={t.label}
              className="flex items-center justify-between rounded-2xl border border-white/10 p-4"
            >
              <p className="font-medium">{t.label}</p>
              <button
                type="button"
                onClick={() => {
                  t.set(!t.value)
                  toast(`${t.label} ${!t.value ? 'enabled' : 'disabled'}`)
                }}
                className={cn(
                  'h-7 w-12 rounded-full transition',
                  t.value ? 'bg-[#D4AF37]' : 'bg-zinc-700',
                )}
              >
                <span
                  className={cn(
                    'block h-5 w-5 translate-y-1 rounded-full bg-black transition',
                    t.value ? 'translate-x-6' : 'translate-x-1',
                  )}
                />
              </button>
            </div>
          ))}

          <div className="rounded-2xl border border-white/10 p-4">
            <p className="font-medium">Bank account</p>
            <p className="mt-1 flex items-center gap-2 text-[13px] text-[#b8b0a4]">
              <CreditCard size={14} /> ****1234 · Weekly payouts
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-zinc-950 p-5">
        <h3 className="mb-4 font-semibold">Recent payouts</h3>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[480px] text-left text-sm">
            <thead className="text-[11px] uppercase tracking-[0.16em] text-[#b8b0a4]">
              <tr>
                <th className="pb-3 font-medium">Date</th>
                <th className="pb-3 font-medium">Amount</th>
                <th className="pb-3 font-medium">Method</th>
                <th className="pb-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {PAYOUTS.map((p) => (
                <tr key={p.id} className="border-t border-white/10">
                  <td className="py-3">{p.date}</td>
                  <td className="py-3 text-[#D4AF37]">${p.amount.toLocaleString()}</td>
                  <td className="py-3">{p.method}</td>
                  <td className="py-3">{p.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {modalOpen ? (
        <div className="fixed inset-0 z-[60] grid place-items-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#111] p-5">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="serif text-xl">Add payment method</h3>
              <button type="button" onClick={() => setModalOpen(false)}>
                <X size={18} />
              </button>
            </div>
            <label className="mb-3 block text-[12px] text-[#b8b0a4]">
              API Key
              <input
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="mt-1 w-full rounded-xl border border-white/10 bg-black px-3 py-2 text-sm text-white outline-none focus:border-[#D4AF37]/50"
              />
            </label>
            <label className="mb-4 block text-[12px] text-[#b8b0a4]">
              Secret
              <input
                type="password"
                value={secret}
                onChange={(e) => setSecret(e.target.value)}
                className="mt-1 w-full rounded-xl border border-white/10 bg-black px-3 py-2 text-sm text-white outline-none focus:border-[#D4AF37]/50"
              />
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  toast('Connection test passed')
                }}
                className="flex-1 rounded-full border border-white/15 py-2.5 text-[12px] uppercase tracking-wider"
              >
                Test connection
              </button>
              <button
                type="button"
                onClick={() => {
                  setModalOpen(false)
                  setPaypalConnected(true)
                  toast('Payment method saved')
                }}
                className="flex-1 rounded-full bg-[#D4AF37] py-2.5 text-[12px] font-semibold uppercase tracking-wider text-black"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

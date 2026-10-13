'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState, type ReactNode } from 'react'
import {
  LayoutDashboard,
  Package,
  Image as ImageIcon,
  ShoppingBag,
  Star,
  Settings,
  Sparkles,
  LogOut,
  Layers,
  Palette,
  Users,
  BarChart3,
  Wallet,
  Menu,
  X,
  ExternalLink,
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { cn } from '@/lib/cn'

const NAV = [
  { href: '/dashboard', label: 'Overview', icon: LayoutDashboard },
  { href: '/dashboard/products', label: 'Products', icon: Package },
  { href: '/dashboard/orders', label: 'Orders', icon: ShoppingBag, badge: '12' },
  { href: '/dashboard/inventory', label: 'Inventory', icon: Layers },
  { href: '/dashboard/variants', label: 'Variants Manager', icon: Palette },
  { href: '/dashboard/media', label: 'Media Library', icon: ImageIcon },
  { href: '/dashboard/reviews', label: 'Reviews', icon: Star, badge: '124' },
  {
    href: '/dashboard/ai',
    label: 'AI Shop Builder',
    icon: Sparkles,
    newBadge: true,
  },
  { href: '/dashboard/customers', label: 'Customers', icon: Users },
  { href: '/dashboard/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/dashboard/payouts', label: 'Payouts', icon: Wallet },
  { href: '/dashboard/settings', label: 'Settings', icon: Settings },
]

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const { isLoggedIn, hydrated, user, logout } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    if (!hydrated) return
    if (!isLoggedIn || user?.role !== 'owner') {
      router.replace('/admin/signin')
    }
  }, [hydrated, isLoggedIn, user, router])

  useEffect(() => {
    setMobileOpen(false)
  }, [pathname])

  if (!hydrated) {
    return (
      <div className="grid min-h-[50vh] place-items-center text-[#b8b0a4]">
        Loading dashboard…
      </div>
    )
  }

  if (!isLoggedIn || user?.role !== 'owner') {
    return (
      <div className="grid min-h-[50vh] place-items-center text-[#b8b0a4]">
        Redirecting to admin sign in…
      </div>
    )
  }

  const displayName = user?.name || 'Sofia Okonkwo'
  const initials = displayName
    .split(/\s+/)
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  const sidebar = (
    <>
      <div className="border-b border-[#1a1a1a] px-5 py-5">
        <div className="flex items-center gap-3">
          <div className="grid h-9 w-9 place-items-center rounded-[10px] bg-[#D4AF37] text-[12px] font-bold tracking-[0.08em] text-black">
            LL
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#e8e6e1]">
              Litt Luxury
            </p>
            <p className="text-[10px] uppercase tracking-[0.18em] text-[#D4AF37]">
              Admin Console
            </p>
          </div>
        </div>
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto p-3">
        {NAV.map((item) => {
          const Icon = item.icon
          const active =
            item.href === '/dashboard'
              ? pathname === '/dashboard'
              : pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'group flex items-center gap-3 rounded-[12px] px-3 py-2.5 text-[13.5px] transition',
                active
                  ? 'border border-[#2a2a2a] bg-[#1a1a1a] text-[#D4AF37]'
                  : 'border border-transparent text-[#a0a0a0] hover:bg-[#151515] hover:text-[#e8e6e1]',
              )}
            >
              <Icon
                size={18}
                className={active ? 'text-[#D4AF37]' : 'text-[#6a6a6a]'}
              />
              <span className="flex-1 truncate">{item.label}</span>
              {item.badge ? (
                <span className="rounded-full border border-[#2a2a2a] bg-[#1f1f1f] px-2 py-0.5 text-[11px] text-[#9a9a9a]">
                  {item.badge}
                </span>
              ) : null}
              {item.newBadge ? (
                <span className="rounded-full bg-[#D4AF37] px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-black">
                  NEW
                </span>
              ) : null}
            </Link>
          )
        })}
      </nav>

      <div className="mt-auto border-t border-[#1a1a1a] p-4">
        <div className="mb-3 flex items-center gap-3">
          <div className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-[#D4AF37] to-[#8a6a1a] text-[13px] font-bold text-black">
            {initials || 'SO'}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-[13px] font-semibold text-[#e8e6e1]">
              {displayName}
            </div>
            <div className="truncate text-[11px] text-[#9a9a9a]">
              littluxury.com
            </div>
          </div>
        </div>
        <Link
          href="/shop"
          className="mb-2 flex w-full items-center justify-center gap-2 rounded-[12px] border border-[#2a2a2a] bg-[#141414] py-2.5 text-[12px] font-medium text-[#e8e6e1] transition hover:border-[#D4AF37]/30"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
          View Store
          <ExternalLink size={12} className="text-[#6a6a6a]" />
        </Link>
        <button
          type="button"
          onClick={() => {
            logout()
            router.push('/admin/signin')
          }}
          className="flex w-full items-center justify-center gap-2 rounded-[12px] border border-[#1a1a1a] py-2 text-[11px] uppercase tracking-wider text-[#8a8a8a] hover:text-[#e8e6e1]"
        >
          <LogOut size={14} /> Sign out
        </button>
      </div>
    </>
  )

  return (
    <div className="min-h-[calc(100vh-68px)] bg-[#0a0a0a] text-[#e8e6e1]">
      {/* Mobile top bar */}
      <div className="sticky top-[68px] z-30 flex items-center justify-between border-b border-[#1a1a1a] bg-[#0a0a0a]/95 px-4 py-3 backdrop-blur md:hidden">
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          className="grid h-9 w-9 place-items-center rounded-[10px] border border-[#2a2a2a]"
          aria-label="Open admin menu"
        >
          <Menu size={18} />
        </button>
        <p className="text-[12px] font-semibold uppercase tracking-[0.14em]">
          Litt Luxury Admin
        </p>
        <Link
          href="/dashboard/ai"
          className="rounded-full bg-[#D4AF37] px-3 py-1.5 text-[11px] font-semibold text-black"
        >
          + Add
        </Link>
      </div>

      <div className="mx-auto flex max-w-[1400px]">
        <aside className="sticky top-[68px] hidden h-[calc(100vh-68px)] w-[264px] shrink-0 flex-col border-r border-[#1a1a1a] bg-[#0f0f0f] md:flex">
          {sidebar}
        </aside>

        {/* Mobile drawer */}
        {mobileOpen ? (
          <div className="fixed inset-0 z-50 md:hidden">
            <button
              type="button"
              className="absolute inset-0 bg-black/70 backdrop-blur-[2px]"
              aria-label="Close menu"
              onClick={() => setMobileOpen(false)}
            />
            <aside className="absolute left-0 top-0 flex h-full w-[min(88vw,300px)] flex-col border-r border-[#1a1a1a] bg-[#0f0f0f] shadow-2xl">
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="absolute right-3 top-4 grid h-8 w-8 place-items-center rounded-full border border-[#2a2a2a] text-[#9a9a9a]"
                aria-label="Close"
              >
                <X size={16} />
              </button>
              {sidebar}
            </aside>
          </div>
        ) : null}

        <div className="min-w-0 flex-1 overflow-x-hidden p-4 md:p-8 lg:px-8 lg:py-8">
          {children}
        </div>
      </div>
    </div>
  )
}

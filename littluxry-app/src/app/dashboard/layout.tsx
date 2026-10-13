'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, type ReactNode } from 'react'
import {
  LayoutDashboard,
  Package,
  Image as ImageIcon,
  ShoppingBag,
  Star,
  Settings,
  Sparkles,
  LogOut,
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { cn } from '@/lib/cn'

const NAV = [
  { href: '/dashboard', label: 'Overview', icon: LayoutDashboard },
  { href: '/dashboard/products', label: 'Products', icon: Package, badge: '7' },
  { href: '/dashboard/media', label: 'Media', icon: ImageIcon },
  { href: '/dashboard/orders', label: 'Orders', icon: ShoppingBag },
  { href: '/dashboard/reviews', label: 'Reviews', icon: Star },
  { href: '/dashboard/ai', label: 'AI Builder', icon: Sparkles, newBadge: true },
  { href: '/dashboard/settings', label: 'Settings', icon: Settings },
]

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const { isLoggedIn, hydrated, user, logout } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (!hydrated) return
    if (!isLoggedIn || user?.role !== 'owner') {
      router.replace('/signin')
    }
  }, [hydrated, isLoggedIn, user, router])

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
        Redirecting to sign in…
      </div>
    )
  }

  return (
    <div className="mx-auto flex min-h-[calc(100vh-68px)] max-w-7xl">
      <aside className="hidden w-64 shrink-0 flex-col border-r border-white/10 bg-[#0c0c0c] md:flex">
        <div className="border-b border-white/10 px-5 py-5">
          <p className="serif text-lg tracking-[0.18em] text-[#D4AF37]">
            LL Admin
          </p>
          <p className="text-[11px] text-[#b8b0a4]">Etsy-style control</p>
        </div>
        <nav className="flex-1 space-y-1 p-3">
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
                  'group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition',
                  active
                    ? 'border border-[#2a2a2a] bg-[#1a1a1a] text-[#D4AF37]'
                    : 'text-[#a0a0a0] hover:bg-[#151515] hover:text-[#e8e6e1]',
                )}
              >
                <Icon
                  size={18}
                  className={active ? 'text-[#D4AF37]' : 'text-[#6a6a6a]'}
                />
                <span className="flex-1">{item.label}</span>
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
        <div className="mt-auto border-t border-white/10 p-4">
          <div className="mb-3 flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-[#D4AF37] to-[#8a6a1a] text-[13px] font-bold text-black">
              SO
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-[13px] font-semibold">
                {user?.name}
              </div>
              <div className="truncate text-[11px] text-[#9a9a9a]">
                {user?.email}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              logout()
              router.push('/signin')
            }}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 py-2 text-[12px] uppercase tracking-wider text-[#b8b0a4]"
          >
            <LogOut size={14} /> Sign out
          </button>
        </div>
      </aside>
      <div className="flex-1 overflow-x-hidden p-4 md:p-8">{children}</div>
    </div>
  )
}

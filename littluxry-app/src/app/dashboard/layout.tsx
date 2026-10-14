'use client'

import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useState, type ReactNode } from 'react'
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
  Inbox,
  Bookmark,
  Pencil,
  RotateCcw,
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useSupportMessages } from '@/context/SupportMessagesContext'
import { useProducts } from '@/context/ProductsContext'
import { isDraftProduct } from '@/data/products'
import { DEMO_STATS, useDashboardMock } from '@/hooks/useDashboardMock'
import { useToast } from '@/lib/toast'
import { cn } from '@/lib/cn'

type NavItem = {
  href: string
  label: string
  icon: typeof LayoutDashboard
  badge?: string
  newBadge?: boolean
  match?: 'saved' | 'products'
}

const NAV: NavItem[] = [
  { href: '/dashboard', label: 'Overview', icon: LayoutDashboard },
  {
    href: '/dashboard/products',
    label: 'Products',
    icon: Package,
    match: 'products',
  },
  {
    href: '/dashboard/products?status=saved',
    label: 'Saved products',
    icon: Bookmark,
    match: 'saved',
  },
  { href: '/dashboard/orders', label: 'Orders', icon: ShoppingBag },
  { href: '/dashboard/messages', label: 'Messages', icon: Inbox },
  { href: '/dashboard/inventory', label: 'Inventory', icon: Layers },
  { href: '/dashboard/variants', label: 'Variants Manager', icon: Palette },
  { href: '/dashboard/media', label: 'Media Library', icon: ImageIcon },
  { href: '/dashboard/reviews', label: 'Reviews', icon: Star },
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

function DashboardShell({ children }: { children: ReactNode }) {
  const { isLoggedIn, hydrated, user, logout } = useAuth()
  const { unreadCount } = useSupportMessages()
  const { products } = useProducts()
  const { showMock, resetMock, restoreMock } = useDashboardMock()
  const { toast } = useToast()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [mobileOpen, setMobileOpen] = useState(false)
  const status = searchParams.get('status')
  const viewingSaved =
    pathname.startsWith('/dashboard/products') &&
    (status === 'saved' || status === 'draft')
  const savedDrafts = products.filter(isDraftProduct).slice(0, 8)
  const savedCount = products.filter(isDraftProduct).length

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
          const onProducts = pathname.startsWith('/dashboard/products')
          const active =
            item.href === '/dashboard'
              ? pathname === '/dashboard'
              : item.match === 'saved'
                ? viewingSaved
                : item.match === 'products'
                  ? onProducts && !viewingSaved
                  : pathname.startsWith(item.href.split('?')[0]!)
          const badge =
            item.href === '/dashboard/messages' && unreadCount > 0
              ? String(unreadCount)
              : item.match === 'saved' && savedCount > 0
                ? String(savedCount)
                : showMock && item.href === '/dashboard/orders'
                  ? DEMO_STATS.ordersBadge
                  : showMock && item.href === '/dashboard/reviews'
                    ? DEMO_STATS.reviewsBadge
                    : item.badge
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
              {badge ? (
                <span
                  className={cn(
                    'rounded-full border px-2 py-0.5 text-[11px]',
                    item.href === '/dashboard/messages' || item.match === 'saved'
                      ? 'border-[#D4AF37]/40 bg-[#D4AF37]/15 text-[#D4AF37]'
                      : 'border-[#2a2a2a] bg-[#1f1f1f] text-[#9a9a9a]',
                  )}
                >
                  {badge}
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

        {savedDrafts.length > 0 ? (
          <div className="mt-3 border-t border-[#1a1a1a] pt-3">
            <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#6a6a6a]">
              Saved product buttons
            </p>
            <div className="space-y-1">
              {savedDrafts.map((p) => (
                <Link
                  key={p.id}
                  href={`/dashboard/products?status=saved&edit=${encodeURIComponent(p.id)}`}
                  className="flex items-center gap-2 rounded-[10px] border border-transparent px-3 py-2 text-[12px] text-[#a0a0a0] transition hover:border-[#2a2a2a] hover:bg-[#151515] hover:text-[#e8e6e1]"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={
                      (p.images ?? []).find(
                        (src) =>
                          !src.endsWith('.mp4') &&
                          !src.startsWith('data:video'),
                      ) || '/assets/fringe-hero.png'
                    }
                    alt=""
                    className="h-7 w-7 shrink-0 rounded-md object-cover ring-1 ring-white/10"
                  />
                  <span className="min-w-0 flex-1 truncate">{p.name}</span>
                  <Pencil size={12} className="shrink-0 text-[#D4AF37]" />
                </Link>
              ))}
              {savedCount > savedDrafts.length ? (
                <Link
                  href="/dashboard/products?status=saved"
                  className="block px-3 py-1.5 text-[11px] text-[#D4AF37]"
                >
                  View all saved · {savedCount}
                </Link>
              ) : null}
            </div>
          </div>
        ) : null}
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
        <button
          type="button"
          onClick={() => {
            if (showMock) {
              resetMock()
              toast('Mock data reset — demo badges cleared')
            } else {
              restoreMock()
              toast('Demo mock data restored')
            }
          }}
          className="mb-2 flex w-full items-center justify-center gap-2 rounded-[12px] border border-[#2a2a2a] bg-[#141414] py-2.5 text-[12px] font-medium text-[#e8e6e1] transition hover:border-[#D4AF37]/30 hover:text-[#D4AF37]"
        >
          <RotateCcw size={14} className="text-[#D4AF37]" />
          {showMock ? 'Reset mock data' : 'Show demo data'}
        </button>
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
          href="/dashboard/products?new=1"
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

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense
      fallback={
        <div className="grid min-h-[50vh] place-items-center text-[#b8b0a4]">
          Loading dashboard…
        </div>
      }
    >
      <DashboardShell>{children}</DashboardShell>
    </Suspense>
  )
}

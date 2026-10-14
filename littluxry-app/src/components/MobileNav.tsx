'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, ShoppingBag, Search, User, LayoutGrid } from 'lucide-react'
import { useCart } from '@/context/CartContext'
import { useAuth } from '@/context/AuthContext'
import { cn } from '@/lib/cn'

export function MobileNav() {
  const pathname = usePathname()
  const { cartCount, setCartOpen } = useCart()
  const { isLoggedIn, user } = useAuth()

  if (pathname.startsWith('/dashboard') || pathname.startsWith('/signin')) {
    return null
  }

  const items = [
    { href: '/', label: 'Home', icon: Home },
    { href: '/shop', label: 'Shop', icon: LayoutGrid },
    { href: '/shop', label: 'Search', icon: Search },
    { href: '#cart', label: 'Cart', icon: ShoppingBag },
    {
      href: isLoggedIn
        ? user?.role === 'owner' || user?.role === 'staff'
          ? '/dashboard'
          : '/signin'
        : '/signup',
      label: 'Account',
      icon: User,
    },
  ]

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-[#0a0a0a]/95 px-2 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden">
      <ul className="grid grid-cols-5">
        {items.map((item) => {
          const Icon = item.icon
          const active =
            item.href !== '#cart' &&
            (item.href === '/'
              ? pathname === '/'
              : pathname.startsWith(item.href))
          return (
            <li key={item.label}>
              {item.href === '#cart' ? (
                <button
                  type="button"
                  onClick={() => setCartOpen(true)}
                  className="relative flex w-full flex-col items-center gap-1 py-2.5 text-[10px] uppercase tracking-wider text-[#b8b0a4]"
                >
                  <Icon size={18} />
                  {item.label}
                  {cartCount > 0 ? (
                    <span className="absolute right-4 top-1 grid h-4 min-w-4 place-items-center rounded-full bg-[#D4AF37] px-1 text-[9px] font-bold text-black">
                      {cartCount}
                    </span>
                  ) : null}
                </button>
              ) : (
                <Link
                  href={item.href}
                  className={cn(
                    'flex flex-col items-center gap-1 py-2.5 text-[10px] uppercase tracking-wider',
                    active ? 'text-[#D4AF37]' : 'text-[#b8b0a4]',
                  )}
                >
                  <Icon size={18} />
                  {item.label}
                </Link>
              )}
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

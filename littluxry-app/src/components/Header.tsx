'use client'

import Link from 'next/link'
import { ShoppingBag } from 'lucide-react'
import { useCart } from '@/context/CartContext'
import { useUI } from '@/context/UIContext'
import { useAuth } from '@/context/AuthContext'

export function Header() {
  const { cartCount, setCartOpen } = useCart()
  const { setMenuOpen } = useUI()
  const { isLoggedIn } = useAuth()

  return (
    <header className="sticky top-0 z-40 flex h-[68px] items-center justify-between border-b border-white/10 bg-[#0a0a0a]/80 px-5 backdrop-blur-xl md:px-10">
      <button
        type="button"
        onClick={() => setMenuOpen(true)}
        className="group flex h-10 w-10 flex-col justify-center gap-[5px]"
        aria-label="Open menu"
      >
        <span className="block h-[1.5px] w-6 bg-[#f5f0e8] transition-all group-hover:w-4" />
        <span className="block h-[1.5px] w-6 bg-[#f5f0e8]" />
        <span className="block h-[1.5px] w-4 bg-[#f5f0e8] transition-all group-hover:w-6" />
      </button>

      <Link
        href="/"
        className="absolute left-1/2 flex -translate-x-1/2 items-center gap-3"
      >
        <div className="serif grid h-8 w-8 place-items-center rounded-full bg-[#f5f0e8] text-[11px] font-bold tracking-widest text-black">
          LL
        </div>
        <span className="serif text-[18px] font-medium tracking-[0.18em] md:text-[20px]">
          LITT <span className="text-[#D4AF37]">LUXRY</span>
        </span>
      </Link>

      <div className="flex items-center gap-3">
        <Link
          href={isLoggedIn ? '/dashboard' : '/signin'}
          className="hidden text-[11px] uppercase tracking-[0.18em] text-[#b8b0a4] transition hover:text-[#D4AF37] sm:inline"
        >
          {isLoggedIn ? 'Dashboard' : 'Sign in'}
        </Link>
        <button
          type="button"
          onClick={() => setCartOpen(true)}
          className="relative grid h-10 w-10 place-items-center rounded-full border border-white/10 transition hover:border-[#D4AF37]/50 hover:shadow-[0_0_20px_rgba(212,175,55,0.25)]"
          aria-label="Open cart"
        >
          <ShoppingBag size={18} />
          {cartCount > 0 ? (
            <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-[#D4AF37] px-1 text-[10px] font-bold text-black">
              {cartCount}
            </span>
          ) : null}
        </button>
      </div>
    </header>
  )
}

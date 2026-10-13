import Link from 'next/link'

export function Footer() {
  return (
    <footer className="border-t border-white/10 bg-black px-5 py-14 md:px-10">
      <div className="mx-auto grid max-w-6xl gap-10 md:grid-cols-4">
        <div className="md:col-span-2">
          <p className="serif text-2xl tracking-[0.18em]">
            LITT <span className="text-[#D4AF37]">LUXURY</span>
          </p>
          <p className="mt-3 max-w-sm text-sm text-[#b8b0a4]">
            Timeless style. Unmatched quality. Wear your status.
          </p>
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-[0.2em] text-[#D4AF37]">
            Shop
          </p>
          <div className="mt-3 space-y-2 text-sm text-[#b8b0a4]">
            <Link href="/shop" className="block hover:text-white">
              All
            </Link>
            <Link href="/shop?category=women-bags" className="block hover:text-white">
              Women Bags
            </Link>
            <Link href="/shop?category=women-dress" className="block hover:text-white">
              Women Dress
            </Link>
            <Link href="/shop?category=shoes" className="block hover:text-white">
              Shoes
            </Link>
            <Link href="/shop?category=sneakers" className="block hover:text-white">
              Sneakers
            </Link>
            <Link href="/shop?category=jacket" className="block hover:text-white">
              Jacket
            </Link>
            <Link href="/shop?category=accessories" className="block hover:text-white">
              Accessories
            </Link>
            <Link href="/cart" className="block hover:text-white">
              Cart
            </Link>
          </div>
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-[0.2em] text-[#D4AF37]">
            Account
          </p>
          <div className="mt-3 space-y-2 text-sm text-[#b8b0a4]">
            <Link href="/signin" className="block hover:text-white">
              Sign in
            </Link>
            <Link href="/dashboard" className="block hover:text-white">
              Dashboard
            </Link>
          </div>
        </div>
      </div>
      <p className="mx-auto mt-12 max-w-6xl text-[11px] uppercase tracking-[0.18em] text-[#6a655c]">
        © {new Date().getFullYear()} LITT LUXURY. All rights reserved.
      </p>
    </footer>
  )
}

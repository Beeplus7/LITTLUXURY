'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { ProductCard } from '@/components/ProductCard'
import { VideoHero } from '@/components/VideoHero'
import { Footer } from '@/components/Footer'
import { useProducts } from '@/context/ProductsContext'
import { useCart } from '@/context/CartContext'
import { useToast } from '@/lib/toast'
import { Star } from 'lucide-react'

const MARQUEE = [
  'Italian Leather',
  'Handcrafted Fringe',
  'Free Worldwide Shipping',
  '5 Color Muse',
  'Artisan Hardware',
  'Limited Runs',
]

const TESTIMONIALS = [
  { name: 'Sarah M.', text: 'The fringe moves like water. Instant status.' },
  { name: 'Jessica L.', text: 'Better in person — pebble leather is unreal.' },
  { name: 'Amara K.', text: 'Ordered Noir and Oat. Both heirloom pieces.' },
]

export default function HomePage() {
  const { products } = useProducts()
  const { addToCart } = useCart()
  const { toast } = useToast()
  const [tIndex, setTIndex] = useState(0)
  const [email, setEmail] = useState('')

  useEffect(() => {
    const id = window.setInterval(
      () => setTIndex((i) => (i + 1) % TESTIMONIALS.length),
      4000,
    )
    return () => window.clearInterval(id)
  }, [])

  const featured = products.slice(0, 7)

  return (
    <div>
      <div className="relative z-50 flex items-center justify-center gap-6 overflow-hidden bg-[#D4AF37] px-4 py-[10px] text-[11px] font-semibold tracking-[0.18em] text-black">
        <span className="hidden whitespace-nowrap md:inline">
          FREE SHIPPING WORLDWIDE
        </span>
        <span className="hidden h-1 w-1 rounded-full bg-black/40 md:inline" />
        <span>NEW FRINGE MUSE COLLECTION — 5 COLORS</span>
        <span className="hidden h-1 w-1 rounded-full bg-black/40 md:inline" />
        <span className="hidden md:inline">WEAR YOUR STATUS</span>
      </div>

      <section className="mx-auto grid max-w-6xl items-center gap-10 px-5 py-12 md:grid-cols-2 md:px-10 md:py-20">
        <div>
          <p className="text-[11px] uppercase tracking-[0.28em] text-[#D4AF37]">
            Littluxry atelier
          </p>
          <h1 className="serif mt-4 text-[42px] leading-[0.95] tracking-[-0.02em] md:text-[64px]">
            TIMELESS STYLE
            <br />
            UNMATCHED QUALITY
            <br />
            <span className="text-[#D4AF37]">WEAR YOUR STATUS</span>
          </h1>
          <div className="mt-6 flex items-center gap-3 text-sm text-[#b8b0a4]">
            <span className="inline-flex items-center gap-1 text-[#D4AF37]">
              <Star size={14} fill="currentColor" /> 4.8
            </span>
            <span>124 reviews</span>
          </div>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/shop"
              className="rounded-full bg-[#D4AF37] px-6 py-3 text-[12px] font-semibold uppercase tracking-[0.16em] text-black transition hover:shadow-glow hover:brightness-110"
            >
              Shop collection
            </Link>
            <Link
              href="/shop/fringe-black"
              className="rounded-full border border-white/15 px-6 py-3 text-[12px] uppercase tracking-[0.16em] transition hover:border-[#D4AF37]/50"
            >
              Fringe Muse
            </Link>
          </div>
        </div>
        <div className="relative">
          <VideoHero className="aspect-[4/5] md:aspect-square" />
          <div className="absolute -left-2 top-8 rounded-2xl border border-white/10 bg-black/70 px-4 py-3 backdrop-blur md:-left-6">
            <p className="text-[10px] uppercase tracking-[0.18em] text-[#D4AF37]">
              Now spinning
            </p>
            <p className="text-sm">5 fringe colors</p>
          </div>
          <div className="absolute -right-2 bottom-10 rounded-2xl border border-white/10 bg-black/70 px-4 py-3 backdrop-blur md:-right-4">
            <p className="text-[10px] uppercase tracking-[0.18em] text-[#D4AF37]">
              From
            </p>
            <p className="serif text-xl">$245</p>
          </div>
        </div>
      </section>

      <div className="overflow-hidden border-y border-white/10 bg-zinc-950 py-4">
        <div className="marquee flex w-max gap-10 text-[12px] uppercase tracking-[0.22em] text-[#b8b0a4]">
          {[...MARQUEE, ...MARQUEE].map((item, i) => (
            <span key={`${item}-${i}`} className="flex items-center gap-10">
              {item}
              <span className="h-1 w-1 rounded-full bg-[#D4AF37]" />
            </span>
          ))}
        </div>
      </div>

      <section className="mx-auto max-w-6xl px-5 py-16 md:px-10">
        <div className="mb-6 flex items-end justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.2em] text-[#D4AF37]">
              Featured
            </p>
            <h2 className="serif text-3xl md:text-4xl">The Collection</h2>
          </div>
          <Link href="/shop" className="text-[12px] uppercase tracking-[0.16em] text-[#b8b0a4]">
            View all
          </Link>
        </div>
        <div className="mb-8 flex gap-2 overflow-x-auto pb-1">
          {[
            ['women-bags', 'Women Bags'],
            ['women-dress', 'Women Dress'],
            ['women', 'Women'],
            ['shoes', 'Shoes'],
            ['sneakers', 'Sneakers'],
            ['jacket', 'Jacket'],
            ['accessories', 'Accessories'],
            ['men', 'Men'],
            ['men-sweatshirt', 'Men Sweatshirt'],
            ['men-tshirts', 'Men T-Shirts'],
            ['men-sneakers', 'Men Sneakers'],
            ['men-shoes', 'Men Shoes'],
            ['men-accessories', 'Men Accessories'],
          ].map(([slug, label]) => (
            <Link
              key={slug}
              href={`/shop?category=${slug}`}
              className="shrink-0 rounded-full border border-white/10 px-4 py-2 text-[11px] uppercase tracking-[0.14em] text-[#b8b0a4] transition hover:border-[#D4AF37]/40 hover:text-[#D4AF37]"
            >
              {label}
            </Link>
          ))}
        </div>
        <div className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-4">
          {featured.map((p) => (
            <ProductCard key={p.id} product={p} className="w-[280px] shrink-0" />
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-10 md:px-10">
        <h2 className="serif mb-8 text-center text-3xl">Why Littluxry</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {[
            ['Italian Leather', 'Sourced pebble calf with hand-cut fringe.'],
            ['Designed to Move', 'Every step flickers — museum motion, daily bag.'],
            ['Status Quietly', 'No logos screaming. Proportion does the talking.'],
          ].map(([title, body]) => (
            <div
              key={title}
              className="rounded-2xl border border-white/10 bg-zinc-950 p-6 transition hover:border-[#D4AF37]/40 hover:shadow-glow"
            >
              <h3 className="serif text-xl text-[#D4AF37]">{title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-[#b8b0a4]">{body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-16 md:px-10">
        <div className="grid items-center gap-8 md:grid-cols-2">
          <VideoHero className="aspect-video" />
          <div>
            <p className="text-[11px] uppercase tracking-[0.2em] text-[#D4AF37]">
              Video story
            </p>
            <h2 className="serif mt-2 text-3xl">Fringe Muse in Motion</h2>
            <p className="mt-3 text-sm text-[#b8b0a4]">
              Black, White, Beige, Pink, Green — one silhouette, five moods.
            </p>
            <div className="mt-5 flex gap-3">
              {['#111111', '#f5f5f5', '#d9c5b4', '#e8a0bf', '#1a7a4c'].map(
                (hex) => (
                  <span
                    key={hex}
                    className="h-8 w-8 rounded-full border border-white/20"
                    style={{ backgroundColor: hex }}
                  />
                ),
              )}
            </div>
            <button
              type="button"
              onClick={() => {
                const p = products[0]
                if (!p) return
                addToCart({
                  productId: p.id,
                  name: p.name,
                  price: p.price,
                  color: 'Black',
                  image: p.images[0],
                })
                toast('Fringe Noir added to cart')
              }}
              className="mt-6 rounded-full bg-[#D4AF37] px-6 py-3 text-[12px] font-semibold uppercase tracking-[0.16em] text-black"
            >
              Add fringe noir
            </button>
          </div>
        </div>
      </section>

      <section className="border-y border-white/10 bg-zinc-950 px-5 py-14 md:px-10">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-[11px] uppercase tracking-[0.2em] text-[#D4AF37]">
            Testimonials
          </p>
          <p className="serif mt-4 text-2xl md:text-3xl">
            “{TESTIMONIALS[tIndex].text}”
          </p>
          <p className="mt-4 text-sm text-[#b8b0a4]">
            — {TESTIMONIALS[tIndex].name}
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-16 md:px-10">
        <h2 className="serif mb-6 text-3xl">Worn by you</h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {['/assets/rosso-1.jpg', '/assets/riviera-1.jpg', '/assets/rosso-2.jpg', '/assets/fringe-hero.png'].map(
            (src) => (
              <div
                key={src}
                className="aspect-square overflow-hidden rounded-2xl border border-white/10"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt="" className="h-full w-full object-cover" />
              </div>
            ),
          )}
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-5 pb-20 text-center md:px-10">
        <h2 className="serif text-3xl">Join the atelier list</h2>
        <p className="mt-2 text-sm text-[#b8b0a4]">
          Early access to limited colorways.
        </p>
        <form
          className="mt-6 flex flex-col gap-3 sm:flex-row"
          onSubmit={(e) => {
            e.preventDefault()
            toast(`Subscribed ${email || 'you'}`)
            setEmail('')
          }}
        >
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email address"
            className="flex-1 rounded-full border border-white/15 bg-black px-5 py-3 text-sm outline-none focus:border-[#D4AF37]/50"
          />
          <button
            type="submit"
            className="rounded-full bg-[#D4AF37] px-6 py-3 text-[12px] font-semibold uppercase tracking-[0.16em] text-black"
          >
            Subscribe
          </button>
        </form>
      </section>

      <Footer />
    </div>
  )
}

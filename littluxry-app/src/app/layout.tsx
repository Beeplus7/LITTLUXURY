import type { Metadata } from 'next'
import { Inter, Playfair_Display } from 'next/font/google'
import './globals.css'
import { Providers } from '@/components/Providers'
import { Header } from '@/components/Header'
import { SideMenu } from '@/components/SideMenu'
import { CartDrawer } from '@/components/CartDrawer'
import { MobileNav } from '@/components/MobileNav'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
})

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-playfair',
})

export const metadata: Metadata = {
  title: {
    default: 'LITTLUXRY — Timeless Style. Unmatched Quality.',
    template: '%s · LITTLUXRY',
  },
  description:
    'Italian leather fringe hobos, Rosso buckets, and Riviera straw totes. Wear your status.',
  openGraph: {
    title: 'LITTLUXRY',
    description: 'Timeless style. Unmatched quality. Wear your status.',
    type: 'website',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body
        className={`${inter.variable} ${playfair.variable} font-sans antialiased`}
      >
        <Providers>
          <Header />
          <SideMenu />
          <CartDrawer />
          <main className="min-h-screen pb-20 md:pb-0">{children}</main>
          <MobileNav />
        </Providers>
      </body>
    </html>
  )
}

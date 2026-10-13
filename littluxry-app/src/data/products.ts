import type { ShopCategoryId } from '@/data/categories'

export type ProductColor = {
  name: string
  hex: string
  label: string
}

export type ProductVariant = {
  id: string
  color: string
  hex: string
  price: number
  stock: number
  sku: string
  size?: string
  image?: string
}

export const APPAREL_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL'] as const
export const FOOTWEAR_SIZES = [
  '36',
  '37',
  '38',
  '39',
  '40',
  '41',
  '42',
  '43',
  '44',
] as const
export const ONE_SIZE = ['OS'] as const

export function sizesForShopCategory(shopCategory: ShopCategoryId): string[] {
  if (
    shopCategory === 'shoes' ||
    shopCategory === 'sneakers' ||
    shopCategory === 'men-shoes' ||
    shopCategory === 'men-sneakers'
  ) {
    return [...FOOTWEAR_SIZES]
  }
  if (
    shopCategory === 'women-dress' ||
    shopCategory === 'women' ||
    shopCategory === 'jacket' ||
    shopCategory === 'men' ||
    shopCategory === 'men-sweatshirt' ||
    shopCategory === 'men-tshirts'
  ) {
    return [...APPAREL_SIZES]
  }
  return [...ONE_SIZE]
}

export function productLineForShopCategory(
  shopCategory: ShopCategoryId,
): ProductLine {
  if (shopCategory === 'women-bags') return 'tote'
  if (
    shopCategory === 'shoes' ||
    shopCategory === 'sneakers' ||
    shopCategory === 'men-shoes' ||
    shopCategory === 'men-sneakers'
  ) {
    return 'footwear'
  }
  if (
    shopCategory === 'accessories' ||
    shopCategory === 'men-accessories'
  ) {
    return 'accessory'
  }
  return 'apparel'
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
}

/** Product line (silhouette family) — used by AI Builder etc. */
export type ProductLine =
  | 'fringe'
  | 'bucket'
  | 'tote'
  | 'apparel'
  | 'footwear'
  | 'accessory'

export type ProductStatus = 'draft' | 'published'

export type Product = {
  id: string
  slug: string
  name: string
  menuLabel: string
  price: number
  original: number
  rating: number
  reviewCount: number
  description: string
  colors: ProductColor[]
  features: string[]
  images: string[]
  gradient: string
  /** Alias of productLine — kept for AI Builder compatibility */
  category: ProductLine
  productLine: ProductLine
  shopCategory: ShopCategoryId
  variants: ProductVariant[]
  video?: string
  /** draft = saved in admin only; published = live on shop */
  status?: ProductStatus
  /** Marketplace-style catalog fields (Shopify / Etsy / Amazon parity) */
  brand?: string
  tags?: string[]
  materials?: string
  care?: string
  sku?: string
  barcode?: string
  /** Merchant cost (admin only) */
  cost?: number
  weightGrams?: number
  seoTitle?: string
  seoDescription?: string
  shippingNote?: string
  returnsNote?: string
  /** Etsy-style processing / dispatch window */
  processingDays?: number
}

export function isPublishedProduct(product: Product): boolean {
  return (product.status ?? 'published') === 'published'
}

export function isDraftProduct(product: Product): boolean {
  return product.status === 'draft'
}

export const COLOR_SWATCHES: ProductColor[] = [
  { name: 'Black', hex: '#111111', label: 'Noir' },
  { name: 'White', hex: '#f5f5f5', label: 'Blanc' },
  { name: 'Ivory', hex: '#fffff0', label: 'Ivory' },
  { name: 'Beige', hex: '#d9c5b4', label: 'Oat' },
  { name: 'Tan', hex: '#c4a484', label: 'Tan' },
  { name: 'Brown', hex: '#5c3a21', label: 'Cognac' },
  { name: 'Chocolate', hex: '#3b2414', label: 'Chocolate' },
  { name: 'Grey', hex: '#8a8a8a', label: 'Stone' },
  { name: 'Charcoal', hex: '#36454f', label: 'Charcoal' },
  { name: 'Silver', hex: '#c0c0c0', label: 'Silver' },
  { name: 'Gold', hex: '#d4af37', label: 'Gold' },
  { name: 'Pink', hex: '#e8a0bf', label: 'Blush' },
  { name: 'Hot Pink', hex: '#ff69b4', label: 'Hot Pink' },
  { name: 'Red', hex: '#c1272d', label: 'Rosso' },
  { name: 'Burgundy', hex: '#6b1e2a', label: 'Burgundy' },
  { name: 'Orange', hex: '#e67e22', label: 'Amber' },
  { name: 'Yellow', hex: '#f1c40f', label: 'Sun' },
  { name: 'Natural', hex: '#e2c275', label: 'Natural' },
  { name: 'Green', hex: '#1a7a4c', label: 'Emerald' },
  { name: 'Olive', hex: '#556b2f', label: 'Olive' },
  { name: 'Mint', hex: '#98d8c8', label: 'Mint' },
  { name: 'Teal', hex: '#008080', label: 'Teal' },
  { name: 'Blue', hex: '#2563eb', label: 'Blue' },
  { name: 'Navy', hex: '#1a2744', label: 'Navy' },
  { name: 'Sky', hex: '#7eb6d9', label: 'Sky' },
  { name: 'Purple', hex: '#7c3aed', label: 'Purple' },
  { name: 'Lavender', hex: '#b794f4', label: 'Lavender' },
  { name: 'Lilac', hex: '#c8a2c8', label: 'Lilac' },
  { name: 'Wine', hex: '#722f37', label: 'Wine' },
  { name: 'Camel', hex: '#c19a6b', label: 'Camel' },
]

const fringeColors = COLOR_SWATCHES.slice(0, 5)

function fringeVariants(price: number, prefix: string): ProductVariant[] {
  return fringeColors.map((c) => ({
    id: `${prefix}-${c.name.toLowerCase()}`,
    color: c.name,
    hex: c.hex,
    price,
    stock: 12 + c.name.length,
    sku: `LL-FM-${prefix.slice(0, 3).toUpperCase()}-${c.name.slice(0, 3).toUpperCase()}`,
  }))
}

function simpleVariant(
  id: string,
  color: string,
  hex: string,
  price: number,
  sku: string,
): ProductVariant[] {
  return [{ id, color, hex, price, stock: 14, sku }]
}

function bag(
  partial: Omit<Product, 'shopCategory' | 'productLine' | 'category'> & {
    productLine: ProductLine
  },
): Product {
  return {
    ...partial,
    category: partial.productLine,
    shopCategory: 'women-bags',
  }
}

export const initialProducts: Product[] = [
  bag({
    id: 'fringe-black',
    slug: 'fringe-black',
    name: 'Fringe Muse Hobo — Noir',
    menuLabel: 'Fringe Noir',
    price: 298,
    original: 420,
    rating: 4.8,
    reviewCount: 124,
    description:
      'Our signature XS fringe hobo, sculpted in soft pebble leather. Designed to move with you — every step flickers.',
    colors: fringeColors,
    features: [
      '100% Italian pebble leather',
      'Hand-cut fringe, 9cm drop',
      'Magnetic closure + interior zip',
      'Adjustable 48-56cm shoulder drop',
      'Dust bag included',
    ],
    images: ['/assets/fringe-hero.png', '/assets/video.mp4'],
    gradient: 'from-[#1a1a1a] via-[#2a2a2a] to-[#0a0a0a]',
    productLine: 'fringe',
    variants: fringeVariants(298, 'noir'),
    video: '/assets/video.mp4',
  }),
  bag({
    id: 'fringe-white',
    slug: 'fringe-white',
    name: 'Fringe Muse Hobo — Blanc',
    menuLabel: 'Fringe Blanc',
    price: 298,
    original: 420,
    rating: 4.9,
    reviewCount: 98,
    description:
      'Same iconic silhouette in cloud-white leather — a soft contrast against the noir fringe movement.',
    colors: fringeColors,
    features: [
      '100% Italian pebble leather',
      'Hand-cut fringe',
      'Interior suede lining',
      'Gold-tone hardware',
      'Dust bag included',
    ],
    images: ['/assets/fringe-hero.png'],
    gradient: 'from-[#f7f5f0] via-[#ece8e0] to-[#d6cfc4]',
    productLine: 'fringe',
    variants: fringeVariants(298, 'blanc'),
    video: '/assets/video.mp4',
  }),
  bag({
    id: 'fringe-beige',
    slug: 'fringe-beige',
    name: 'Fringe Muse Hobo — Oat',
    menuLabel: 'Fringe Oat',
    price: 298,
    original: 420,
    rating: 4.8,
    reviewCount: 112,
    description:
      'Warm oat — sun-faded linen, vintage market tote energy with luxury construction.',
    colors: fringeColors,
    features: [
      'Oat pebble leather',
      'Fringe: 120 individual cuts',
      'Interior card slots',
      'Weight: 410g',
      'Dust bag included',
    ],
    images: ['/assets/fringe-hero.png'],
    gradient: 'from-[#d6c7b8] via-[#c8b5a2] to-[#b8a08c]',
    productLine: 'fringe',
    variants: fringeVariants(298, 'oat'),
    video: '/assets/video.mp4',
  }),
  bag({
    id: 'fringe-pink',
    slug: 'fringe-pink',
    name: 'Fringe Muse Hobo — Blush',
    menuLabel: 'Fringe Blush',
    price: 298,
    original: 420,
    rating: 4.7,
    reviewCount: 76,
    description:
      'Blush Pink — muted, powdery, designed for evening and soft daylight. A collector’s tint.',
    colors: fringeColors,
    features: [
      'Blush-dyed pebble leather',
      'Rose-gold hardware',
      'Fringe movement tested',
      'Limited blush run',
      'Dust bag included',
    ],
    images: ['/assets/fringe-hero.png'],
    gradient: 'from-[#e8a0bf] via-[#d98fb0] to-[#c97a9f]',
    productLine: 'fringe',
    variants: fringeVariants(298, 'blush'),
    video: '/assets/video.mp4',
  }),
  bag({
    id: 'fringe-green',
    slug: 'fringe-green',
    name: 'Fringe Muse Hobo — Emerald',
    menuLabel: 'Fringe Emerald',
    price: 298,
    original: 420,
    rating: 4.9,
    reviewCount: 64,
    description:
      'Emerald — deep forest, lacquered shine. Our most photographed shade.',
    colors: fringeColors,
    features: [
      'Emerald pebbled calf',
      'Gold hardware',
      'Deep green suede interior',
      'Artisan fringe',
      'Dust bag included',
    ],
    images: ['/assets/fringe-hero.png'],
    gradient: 'from-[#1a7a4c] via-[#1a4d2e] to-[#0e2e1b]',
    productLine: 'fringe',
    variants: fringeVariants(298, 'emerald'),
    video: '/assets/video.mp4',
  }),
  bag({
    id: 'rosso',
    slug: 'rosso',
    name: 'Rosso Bucket Trio',
    menuLabel: 'Rosso Bucket',
    price: 265,
    original: 380,
    rating: 4.6,
    reviewCount: 89,
    description:
      'Three mini buckets, nested. Cherry, oxblood, and ecru — carry one or clip all three.',
    colors: [
      { name: 'Red', hex: '#c1272d', label: 'Rosso' },
      ...fringeColors.slice(0, 3),
    ],
    features: [
      'Set of 3 nested buckets',
      'Italian nappa',
      'Detachable chain trio',
      'Weight: 580g total',
      'Dust bag included',
    ],
    images: [
      '/assets/rosso-1.jpg',
      '/assets/rosso-2.jpg',
      '/assets/rosso-3.jpg',
      '/assets/rosso-hero.png',
    ],
    gradient: 'from-[#8b1a1a] via-[#a52a2a] to-[#6e1212]',
    productLine: 'bucket',
    variants: [
      {
        id: 'rosso-red',
        color: 'Red',
        hex: '#c1272d',
        price: 265,
        stock: 18,
        sku: 'LL-RB-RED',
        image: '/assets/rosso-1.jpg',
      },
    ],
  }),
  bag({
    id: 'riviera',
    slug: 'riviera',
    name: 'Riviera Straw Tote',
    menuLabel: 'Riviera Straw',
    price: 245,
    original: 310,
    rating: 4.7,
    reviewCount: 142,
    description: 'Woven raffia with leather trim — summer only, city to coast.',
    colors: [
      { name: 'Natural', hex: '#e2c275', label: 'Natural' },
      { name: 'Beige', hex: '#d9c5b4', label: 'Oat' },
      { name: 'Black', hex: '#111111', label: 'Noir' },
    ],
    features: [
      'Hand-woven raffia',
      'Leather handles + base',
      'Open top with snap',
      'Interior pouch',
      'Dust bag included',
    ],
    images: [
      '/assets/riviera-1.jpg',
      '/assets/riviera-2.jpg',
      '/assets/riviera-3.jpg',
      '/assets/riviera-hero.png',
    ],
    gradient: 'from-[#e8dcc8] via-[#d8c9a8] to-[#c7b78f]',
    productLine: 'tote',
    variants: [
      {
        id: 'riviera-natural',
        color: 'Natural',
        hex: '#e2c275',
        price: 245,
        stock: 22,
        sku: 'LL-RS-NAT',
        image: '/assets/riviera-1.jpg',
      },
    ],
  }),

  // Women Dress
  {
    id: 'silk-column-dress',
    slug: 'silk-column-dress',
    name: 'Silk Column Dress',
    menuLabel: 'Silk Column',
    price: 420,
    original: 560,
    rating: 4.8,
    reviewCount: 54,
    description:
      'Bias-cut silk column — liquid drape for evening and gallery nights.',
    colors: [
      { name: 'Black', hex: '#111111', label: 'Noir' },
      { name: 'Beige', hex: '#d9c5b4', label: 'Oat' },
      { name: 'Red', hex: '#c1272d', label: 'Rosso' },
    ],
    features: ['100% silk', 'Bias cut', 'Hidden zip', 'Lined bodice'],
    images: ['/assets/fringe-hero.png'],
    gradient: 'from-[#2a1a1a] via-[#1a1010] to-[#0a0a0a]',
    category: 'apparel',
    productLine: 'apparel',
    shopCategory: 'women-dress',
    variants: simpleVariant('scd-black', 'Black', '#111111', 420, 'LL-WD-SCD'),
  },
  {
    id: 'atelier-wrap-dress',
    slug: 'atelier-wrap-dress',
    name: 'Atelier Wrap Dress',
    menuLabel: 'Wrap Dress',
    price: 385,
    original: 510,
    rating: 4.7,
    reviewCount: 41,
    description: 'Soft wrap silhouette with gold-tone clasp — day to dinner.',
    colors: [
      { name: 'Beige', hex: '#d9c5b4', label: 'Oat' },
      { name: 'Pink', hex: '#e8a0bf', label: 'Blush' },
    ],
    features: ['Crepe fabric', 'Adjustable wrap', 'Midi length'],
    images: ['/assets/riviera-hero.png'],
    gradient: 'from-[#d9c5b4] via-[#c4a88e] to-[#a8896e]',
    category: 'apparel',
    productLine: 'apparel',
    shopCategory: 'women-dress',
    variants: simpleVariant('awd-oat', 'Beige', '#d9c5b4', 385, 'LL-WD-AWD'),
  },

  // Women (RTW)
  {
    id: 'cashmere-knit-top',
    slug: 'cashmere-knit-top',
    name: 'Cashmere Knit Top',
    menuLabel: 'Cashmere Knit',
    price: 220,
    original: 295,
    rating: 4.9,
    reviewCount: 88,
    description: 'Featherweight cashmere crew — quiet luxury staple.',
    colors: fringeColors.slice(0, 3),
    features: ['Italian cashmere', 'Relaxed fit', 'Ribbed hem'],
    images: ['/assets/fringe-hero.png'],
    gradient: 'from-[#3a342e] via-[#2a2520] to-[#151210]',
    category: 'apparel',
    productLine: 'apparel',
    shopCategory: 'women',
    variants: simpleVariant('ckt-noir', 'Black', '#111111', 220, 'LL-W-CKT'),
  },
  {
    id: 'tailored-wide-trouser',
    slug: 'tailored-wide-trouser',
    name: 'Tailored Wide Trouser',
    menuLabel: 'Wide Trouser',
    price: 260,
    original: 340,
    rating: 4.6,
    reviewCount: 37,
    description: 'High-rise wide leg with pressed crease — power soft.',
    colors: [
      { name: 'Black', hex: '#111111', label: 'Noir' },
      { name: 'Beige', hex: '#d9c5b4', label: 'Oat' },
    ],
    features: ['Wool blend', 'High rise', 'Side zip'],
    images: ['/assets/rosso-hero.png'],
    gradient: 'from-[#1c1c1c] via-[#2a2a2a] to-[#0f0f0f]',
    category: 'apparel',
    productLine: 'apparel',
    shopCategory: 'women',
    variants: simpleVariant('twt-noir', 'Black', '#111111', 260, 'LL-W-TWT'),
  },

  // Shoes
  {
    id: 'gilt-heel-pump',
    slug: 'gilt-heel-pump',
    name: 'Gilt Heel Pump',
    menuLabel: 'Gilt Pump',
    price: 340,
    original: 450,
    rating: 4.7,
    reviewCount: 62,
    description: 'Sculpted 85mm pump with brushed gold heel cup.',
    colors: [
      { name: 'Black', hex: '#111111', label: 'Noir' },
      { name: 'Beige', hex: '#d9c5b4', label: 'Oat' },
      { name: 'Red', hex: '#c1272d', label: 'Rosso' },
    ],
    features: ['Leather upper', '85mm heel', 'Cushioned insole'],
    images: ['/assets/rosso-1.jpg'],
    gradient: 'from-[#2a1810] via-[#1a1008] to-[#0a0806]',
    category: 'footwear',
    productLine: 'footwear',
    shopCategory: 'shoes',
    variants: simpleVariant('ghp-noir', 'Black', '#111111', 340, 'LL-SH-GHP'),
  },
  {
    id: 'soft-ballet-flat',
    slug: 'soft-ballet-flat',
    name: 'Soft Ballet Flat',
    menuLabel: 'Ballet Flat',
    price: 195,
    original: 260,
    rating: 4.5,
    reviewCount: 71,
    description: 'Butter-soft ballet with gold LL charm.',
    colors: fringeColors.slice(0, 4),
    features: ['Nappa leather', 'Flexible sole', 'Dust bag'],
    images: ['/assets/riviera-1.jpg'],
    gradient: 'from-[#e8e0d4] via-[#d4c8b8] to-[#b8a898]',
    category: 'footwear',
    productLine: 'footwear',
    shopCategory: 'shoes',
    variants: simpleVariant('sbf-oat', 'Beige', '#d9c5b4', 195, 'LL-SH-SBF'),
  },

  // Sneakers
  {
    id: 'city-lux-sneaker',
    slug: 'city-lux-sneaker',
    name: 'City Lux Sneaker',
    menuLabel: 'City Lux',
    price: 310,
    original: 390,
    rating: 4.8,
    reviewCount: 95,
    description: 'Low-profile leather sneaker with gold eyelets.',
    colors: [
      { name: 'White', hex: '#f5f5f5', label: 'Blanc' },
      { name: 'Black', hex: '#111111', label: 'Noir' },
      { name: 'Beige', hex: '#d9c5b4', label: 'Oat' },
    ],
    features: ['Calf leather', 'Memory foam', 'Rubber cupsole'],
    images: ['/assets/fringe-hero.png'],
    gradient: 'from-[#f5f5f5] via-[#e0e0e0] to-[#c8c8c8]',
    category: 'footwear',
    productLine: 'footwear',
    shopCategory: 'sneakers',
    variants: simpleVariant('cls-blanc', 'White', '#f5f5f5', 310, 'LL-SN-CLS'),
  },
  {
    id: 'runner-noir',
    slug: 'runner-noir',
    name: 'Runner Noir',
    menuLabel: 'Runner Noir',
    price: 355,
    original: 440,
    rating: 4.6,
    reviewCount: 48,
    description: 'Technical runner finished in matte noir leather panels.',
    colors: [
      { name: 'Black', hex: '#111111', label: 'Noir' },
      { name: 'Green', hex: '#1a7a4c', label: 'Emerald' },
    ],
    features: ['Mixed leather', 'Lightweight midsole', 'Reflective stitch'],
    images: ['/assets/rosso-hero.png'],
    gradient: 'from-[#111] via-[#1a1a1a] to-[#000]',
    category: 'footwear',
    productLine: 'footwear',
    shopCategory: 'sneakers',
    variants: simpleVariant('rn-noir', 'Black', '#111111', 355, 'LL-SN-RN'),
  },

  // Jacket
  {
    id: 'cropped-leather-jacket',
    slug: 'cropped-leather-jacket',
    name: 'Cropped Leather Jacket',
    menuLabel: 'Cropped Leather',
    price: 680,
    original: 890,
    rating: 4.9,
    reviewCount: 33,
    description: 'Cropped Italian leather jacket with gold hardware.',
    colors: [
      { name: 'Black', hex: '#111111', label: 'Noir' },
      { name: 'Beige', hex: '#d9c5b4', label: 'Oat' },
    ],
    features: ['Full grain leather', 'Asymmetric zip', 'Satin lining'],
    images: ['/assets/fringe-hero.png'],
    gradient: 'from-[#1a1410] via-[#0f0c0a] to-[#050403]',
    category: 'apparel',
    productLine: 'apparel',
    shopCategory: 'jacket',
    variants: simpleVariant('clj-noir', 'Black', '#111111', 680, 'LL-JK-CLJ'),
  },
  {
    id: 'wool-overcoat',
    slug: 'wool-overcoat',
    name: 'Wool Overcoat',
    menuLabel: 'Wool Coat',
    price: 720,
    original: 960,
    rating: 4.8,
    reviewCount: 29,
    description: 'Long wool overcoat — structured shoulder, fluid hem.',
    colors: [
      { name: 'Black', hex: '#111111', label: 'Noir' },
      { name: 'Beige', hex: '#d9c5b4', label: 'Camel' },
    ],
    features: ['Italian wool', 'Double breasted', 'Horn buttons'],
    images: ['/assets/riviera-hero.png'],
    gradient: 'from-[#3a342c] via-[#2a241c] to-[#14110e]',
    category: 'apparel',
    productLine: 'apparel',
    shopCategory: 'jacket',
    variants: simpleVariant('wo-camel', 'Beige', '#d9c5b4', 720, 'LL-JK-WO'),
  },

  // Accessories
  {
    id: 'gold-link-belt',
    slug: 'gold-link-belt',
    name: 'Gold Link Belt',
    menuLabel: 'Gold Link Belt',
    price: 145,
    original: 190,
    rating: 4.7,
    reviewCount: 77,
    description: 'Chain-link belt with LL clasp — cinch any silhouette.',
    colors: [
      { name: 'Gold', hex: '#D4AF37', label: 'Gilt' },
      { name: 'Black', hex: '#111111', label: 'Noir' },
    ],
    features: ['Gold-tone metal', 'Adjustable', 'Gift box'],
    images: ['/assets/rosso-2.jpg'],
    gradient: 'from-[#D4AF37] via-[#8a6a1a] to-[#3a2a0a]',
    category: 'accessory',
    productLine: 'accessory',
    shopCategory: 'accessories',
    variants: simpleVariant('glb-gilt', 'Gold', '#D4AF37', 145, 'LL-AC-GLB'),
  },
  {
    id: 'silk-status-scarf',
    slug: 'silk-status-scarf',
    name: 'Silk Status Scarf',
    menuLabel: 'Status Scarf',
    price: 120,
    original: 165,
    rating: 4.8,
    reviewCount: 102,
    description: 'Printed silk scarf — fringe motif in gold on noir.',
    colors: [
      { name: 'Black', hex: '#111111', label: 'Noir' },
      { name: 'Beige', hex: '#d9c5b4', label: 'Oat' },
      { name: 'Pink', hex: '#e8a0bf', label: 'Blush' },
    ],
    features: ['100% silk', '90×90cm', 'Hand-rolled edge'],
    images: ['/assets/riviera-2.jpg'],
    gradient: 'from-[#111] via-[#D4AF37]/40 to-[#1a1a1a]',
    category: 'accessory',
    productLine: 'accessory',
    shopCategory: 'accessories',
    variants: simpleVariant('sss-noir', 'Black', '#111111', 120, 'LL-AC-SSS'),
  },
]

export const MENU_PRODUCT_ORDER = [
  'fringe-black',
  'fringe-white',
  'fringe-beige',
  'fringe-pink',
  'fringe-green',
  'rosso',
  'riviera',
] as const

/** Normalize older localStorage products missing shopCategory */
export function normalizeProduct(raw: Partial<Product> & { id: string }): Product | null {
  const base = initialProducts.find((p) => p.id === raw.id)
  if (!base && !raw.name) return null

  const productLine =
    (raw.productLine as ProductLine | undefined) ??
    (raw.category as ProductLine | undefined) ??
    base?.productLine ??
    'apparel'

  const shopCategory: ShopCategoryId =
    (raw.shopCategory as ShopCategoryId | undefined) ??
    base?.shopCategory ??
    (productLine === 'fringe' || productLine === 'bucket' || productLine === 'tote'
      ? 'women-bags'
      : 'women')

  return {
    ...(base ?? ({} as Product)),
    ...raw,
    id: raw.id,
    slug: raw.slug ?? raw.id,
    name: raw.name ?? base?.name ?? 'Untitled',
    menuLabel: raw.menuLabel ?? base?.menuLabel ?? raw.name ?? 'Item',
    price: raw.price ?? base?.price ?? 0,
    original: raw.original ?? base?.original ?? raw.price ?? 0,
    rating: raw.rating ?? base?.rating ?? 4.8,
    reviewCount: raw.reviewCount ?? base?.reviewCount ?? 0,
    description: raw.description ?? base?.description ?? '',
    colors: raw.colors ?? base?.colors ?? [],
    features: raw.features ?? base?.features ?? [],
    images: raw.images ?? base?.images ?? [],
    gradient: raw.gradient ?? base?.gradient ?? 'from-zinc-900 to-black',
    category: productLine,
    productLine,
    shopCategory,
    variants: raw.variants ?? base?.variants ?? [],
    video: raw.video ?? base?.video,
    status: raw.status === 'draft' ? 'draft' : 'published',
    brand: raw.brand ?? base?.brand ?? 'Litt Luxury',
    tags: Array.isArray(raw.tags)
      ? raw.tags
      : Array.isArray(base?.tags)
        ? base!.tags
        : [],
    materials: raw.materials ?? base?.materials ?? '',
    care: raw.care ?? base?.care ?? '',
    sku: raw.sku ?? base?.sku,
    barcode: raw.barcode ?? base?.barcode,
    cost: raw.cost ?? base?.cost,
    weightGrams: raw.weightGrams ?? base?.weightGrams,
    seoTitle: raw.seoTitle ?? base?.seoTitle,
    seoDescription: raw.seoDescription ?? base?.seoDescription,
    shippingNote:
      raw.shippingNote ??
      base?.shippingNote ??
      'Free tracked shipping on orders over $150. Dispatch from our atelier.',
    returnsNote:
      raw.returnsNote ??
      base?.returnsNote ??
      '30-day returns on unused items in original packaging.',
    processingDays: raw.processingDays ?? base?.processingDays ?? 2,
  }
}

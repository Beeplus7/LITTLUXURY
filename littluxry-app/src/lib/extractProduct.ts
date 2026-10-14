import type { Product, ProductColor, ProductLine, ProductVariant } from '@/data/products'
import type { ShopCategoryId } from '@/data/categories'

export type ExtractedVariant = {
  id: string
  name: string
  color: string
  size?: string
  hex: string
  price: number | null
  sku?: string
  image?: string | null
  availability?: string | null
  selected?: boolean
}

export type ExtractedProduct = {
  url: string
  title: string
  description: string
  image: string | null
  images: string[]
  price: number | null
  currency: string | null
  brand: string | null
  variants: ExtractedVariant[]
  analysis: {
    imageCount: number
    variantCount: number
    sources: string[]
  }
}

const NAMED_COLORS: Record<string, string> = {
  black: '#111111',
  noir: '#111111',
  white: '#f5f5f5',
  ivory: '#fffff0',
  cream: '#fffdd0',
  beige: '#d9c5b4',
  oat: '#d9c5b4',
  tan: '#d2b48c',
  brown: '#5c4033',
  cognac: '#9a463d',
  camel: '#c19a6b',
  grey: '#8a8a8a',
  gray: '#8a8a8a',
  charcoal: '#36454f',
  silver: '#c0c0c0',
  gold: '#d4af37',
  red: '#c1272d',
  rosso: '#c1272d',
  burgundy: '#800020',
  wine: '#722f37',
  pink: '#e8a0bf',
  blush: '#e8a0bf',
  rose: '#e8a0bf',
  purple: '#6b3fa0',
  violet: '#7f00ff',
  blue: '#1e3a8a',
  navy: '#0a1628',
  green: '#1a7a4c',
  emerald: '#1a7a4c',
  olive: '#556b2f',
  yellow: '#e6c76a',
  orange: '#e67e22',
  natural: '#e2c275',
}

export function colorHex(name: string): string {
  const key = name.toLowerCase().trim()
  for (const [k, hex] of Object.entries(NAMED_COLORS)) {
    if (key === k || key.includes(k)) return hex
  }
  // Stable pseudo-hex from name
  let h = 0
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0
  const r = 40 + (h & 0x7f)
  const g = 40 + ((h >> 8) & 0x7f)
  const b = 40 + ((h >> 16) & 0x7f)
  return `#${[r, g, b].map((n) => n.toString(16).padStart(2, '0')).join('')}`
}

export function slugify(input: string) {
  return (
    input
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 48) || `item-${Date.now()}`
  )
}

function guessLine(text: string): ProductLine {
  const t = text.toLowerCase()
  if (/\b(sneaker|trainer)\b/.test(t)) return 'footwear'
  if (/\b(shoe|heel|loafer|boot|sandal)\b/.test(t)) return 'footwear'
  if (/\b(jacket|coat|blazer|outerwear)\b/.test(t)) return 'apparel'
  if (/\b(dress|gown)\b/.test(t)) return 'apparel'
  if (/\b(belt|scarf|sunglass|watch|jewelry|jewellery)\b/.test(t)) return 'accessory'
  if (/\b(tote)\b/.test(t)) return 'tote'
  if (/\b(bucket)\b/.test(t)) return 'bucket'
  if (/\b(bag|hobo|purse|handbag|clutch)\b/.test(t)) return 'fringe'
  return 'apparel'
}

function guessShopCategory(line: ProductLine, text: string): ShopCategoryId {
  const t = text.toLowerCase()
  const isMen = /\bmen'?s?\b|\bmens\b|\bfor him\b/.test(t)
  if (line === 'fringe' || line === 'bucket' || line === 'tote') return 'women-bags'
  if (/\bdress\b/.test(t)) return 'women-dress'
  if (/\bsweatshirt|hoodie|crewneck\b/.test(t) && isMen) return 'men-sweatshirt'
  if (/\bt-?shirt|tee\b/.test(t) && isMen) return 'men-tshirts'
  if (/\bsneaker|trainer\b/.test(t)) return isMen ? 'men-sneakers' : 'sneakers'
  if (line === 'footwear') return isMen ? 'men-shoes' : 'shoes'
  if (/\bjacket|coat|blazer\b/.test(t)) return 'jacket'
  if (line === 'accessory') return isMen ? 'men-accessories' : 'accessories'
  if (isMen) return 'men'
  return 'women'
}

export function variantsFromExtract(
  extract: ExtractedProduct,
  productId: string,
  fallbackPrice: number,
): { variants: ProductVariant[]; colors: ProductColor[] } {
  const selected = (extract.variants.length
    ? extract.variants.filter((v) => v.selected !== false)
    : []
  ).slice(0, 40)

  if (!selected.length) {
    const hero = extract.images[0] ?? extract.image ?? undefined
    return {
      variants: [
        {
          id: `${productId}-default`,
          color: 'Default',
          hex: '#111111',
          price: fallbackPrice,
          stock: 8,
          sku: `LL-IMP-${slugify(extract.title).slice(0, 6).toUpperCase()}`,
          image: hero,
        },
      ],
      colors: [
        {
          name: 'Default',
          hex: '#111111',
          label: 'Default',
          images: hero ? [hero] : [],
        },
      ],
    }
  }

  const variants: ProductVariant[] = selected.map((v, i) => {
    const color = (v.color || v.name || 'Default').trim() || 'Default'
    const size = v.size?.trim() || undefined
    return {
      id: `${productId}-${slugify([color, size].filter(Boolean).join('-')) || i}`,
      color,
      hex: v.hex || colorHex(color),
      size,
      price: v.price && v.price > 0 ? Math.round(v.price) : fallbackPrice,
      stock: /out.?of.?stock|sold.?out|unavailable/i.test(v.availability ?? '')
        ? 0
        : 8,
      sku:
        v.sku ||
        `LL-IMP-${slugify(color).slice(0, 6).toUpperCase() || String(i)}${
          size ? `-${slugify(size).slice(0, 4).toUpperCase()}` : ''
        }`,
      image: v.image || extract.images[i] || extract.images[0] || undefined,
    }
  })

  const colorMap = new Map<string, ProductColor>()
  for (const v of variants) {
    const existing = colorMap.get(v.color)
    if (!existing) {
      colorMap.set(v.color, {
        name: v.color,
        hex: v.hex,
        label: v.color,
        images: v.image ? [v.image] : [],
      })
    } else if (v.image && !(existing.images ?? []).includes(v.image)) {
      existing.images = [...(existing.images ?? []), v.image]
    }
  }

  // Attach leftover gallery stills to colours in order when a colour has none
  const colorList = Array.from(colorMap.values())
  const used = new Set(colorList.flatMap((c) => c.images ?? []))
  const spare = extract.images.filter((src) => src && !used.has(src))
  let spareIdx = 0
  for (const c of colorList) {
    if ((c.images?.length ?? 0) === 0 && spare[spareIdx]) {
      c.images = [spare[spareIdx]!]
      spareIdx += 1
    }
  }

  return { variants, colors: colorList }
}

/** Build a catalog Product from extracted link metadata + optional local media. */
export function productFromExtract(
  extract: ExtractedProduct,
  extras?: {
    localImages?: string[]
    selectedVariantIds?: string[]
    video?: string | null
  },
): Product {
  const title = extract.title.trim() || 'Imported product'
  const slug = slugify(title)
  const id = `import-${slug}-${Date.now().toString(36)}`
  const text = `${title} ${extract.description} ${extract.brand ?? ''}`
  const productLine = guessLine(text)
  const shopCategory = guessShopCategory(productLine, text)
  const price = extract.price && extract.price > 0 ? Math.round(extract.price) : 198
  const images = [
    ...(extras?.localImages ?? []),
    ...extract.images,
    ...(extract.image ? [extract.image] : []),
  ].filter((v, i, a) => Boolean(v) && a.indexOf(v) === i)

  const withSelection: ExtractedProduct = {
    ...extract,
    variants: extract.variants.map((v) => ({
      ...v,
      selected:
        extras?.selectedVariantIds && extras.selectedVariantIds.length
          ? extras.selectedVariantIds.includes(v.id)
          : v.selected !== false,
    })),
  }

  const { variants, colors } = variantsFromExtract(withSelection, id, price)
  const video = extras?.video || undefined
  const imageList = images.length ? images.slice(0, 16) : ['/assets/fringe-hero.png']
  // Keep hero video discoverable in the media strip when present
  if (video && !imageList.includes(video)) {
    imageList.push(video)
  }

  return {
    id,
    slug,
    name: title,
    menuLabel: title.length > 28 ? `${title.slice(0, 26)}…` : title,
    price: variants[0]?.price ?? price,
    original: Math.round((variants[0]?.price ?? price) * 1.35),
    rating: 4.8,
    reviewCount: 0,
    description:
      extract.description.trim() ||
      `Imported from ${extract.url}. Edit details in Products.`,
    colors,
    features: [
      extract.brand ? `Brand: ${extract.brand}` : 'Imported listing',
      `Source: ${extract.url}`,
      `${images.length} image(s) · ${variants.length} variant(s) · ${colors.length} colour(s)${
        video ? ' · video' : ''
      }`,
      'Review pricing, colours & stock before publishing',
    ].filter(Boolean),
    images: imageList,
    gradient: 'from-[#1a1a1a] via-[#2a2a2a] to-[#0a0a0a]',
    category: productLine,
    productLine,
    shopCategory,
    variants,
    video,
    brand: extract.brand || 'Litt Luxury',
    seoTitle: title.slice(0, 70),
    seoDescription: (extract.description || title).slice(0, 160),
    status: 'draft',
  }
}

export function decodeHtmlEntities(input: string) {
  return input
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) =>
      String.fromCharCode(parseInt(n, 16)),
    )
}

export function absolutizeUrl(href: string, base: string) {
  try {
    return new URL(href, base).toString()
  } catch {
    return href
  }
}

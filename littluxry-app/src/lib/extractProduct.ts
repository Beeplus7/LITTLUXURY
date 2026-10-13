import type { Product, ProductLine } from '@/data/products'
import type { ShopCategoryId } from '@/data/categories'

export type ExtractedProduct = {
  url: string
  title: string
  description: string
  image: string | null
  images: string[]
  price: number | null
  currency: string | null
  brand: string | null
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
  if (line === 'fringe' || line === 'bucket' || line === 'tote') return 'women-bags'
  if (/\bdress\b/.test(t)) return 'women-dress'
  if (/\bsneaker|trainer\b/.test(t)) return 'sneakers'
  if (line === 'footwear') return 'shoes'
  if (/\bjacket|coat|blazer\b/.test(t)) return 'jacket'
  if (line === 'accessory') return 'accessories'
  return 'women'
}

/** Build a catalog Product from extracted link metadata + optional local images. */
export function productFromExtract(
  extract: ExtractedProduct,
  extras?: { localImages?: string[] },
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

  return {
    id,
    slug,
    name: title,
    menuLabel: title.length > 28 ? `${title.slice(0, 26)}…` : title,
    price,
    original: Math.round(price * 1.35),
    rating: 4.8,
    reviewCount: 0,
    description:
      extract.description.trim() ||
      `Imported from ${extract.url}. Edit details in Products.`,
    colors: [{ name: 'Default', hex: '#111111', label: 'Default' }],
    features: [
      extract.brand ? `Brand: ${extract.brand}` : 'Imported via AI Builder',
      `Source: ${extract.url}`,
      'Review pricing & stock before publish campaigns',
    ].filter(Boolean),
    images: images.length ? images : ['/assets/fringe-hero.png'],
    gradient: 'from-[#1a1a1a] via-[#2a2a2a] to-[#0a0a0a]',
    category: productLine,
    productLine,
    shopCategory,
    variants: [
      {
        id: `${id}-default`,
        color: 'Default',
        hex: '#111111',
        price,
        stock: 8,
        sku: `LL-IMP-${slug.slice(0, 6).toUpperCase()}`,
        image: images[0],
      },
    ],
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

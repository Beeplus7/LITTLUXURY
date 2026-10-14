/**
 * Marketplace product URL import — Shopify, Etsy, Amazon, TikTok Shop, generic PDPs.
 */

import { mkdir, writeFile } from 'fs/promises'
import path from 'path'
import { analyzeProductHtml } from '@/lib/analyzeProductPage'
import {
  absolutizeUrl,
  colorHex,
  type ExtractedProduct,
  type ExtractedVariant,
} from '@/lib/extractProduct'
import { uploadsDir } from '@/lib/shopStateServer'

export type MarketplacePlatform =
  | 'shopify'
  | 'etsy'
  | 'amazon'
  | 'tiktok'
  | 'generic'

const FETCH_HEADERS: HeadersInit = {
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  Accept: 'text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
  'Cache-Control': 'no-cache',
}

export function detectMarketplace(url: string): MarketplacePlatform {
  const host = (() => {
    try {
      return new URL(url).hostname.toLowerCase()
    } catch {
      return ''
    }
  })()
  if (host.includes('etsy.com')) return 'etsy'
  if (host.includes('amazon.') || host.startsWith('amzn.') || host.includes('a.co'))
    return 'amazon'
  if (
    host.includes('tiktok.com') ||
    host.includes('shop.tiktok') ||
    host.includes('tiktokshop')
  )
    return 'tiktok'
  if (host.includes('myshopify.com') || /\/products\//i.test(url)) return 'shopify'
  return 'generic'
}

async function fetchText(url: string, accept?: string): Promise<string> {
  const res = await fetch(url, {
    redirect: 'follow',
    headers: {
      ...FETCH_HEADERS,
      ...(accept ? { Accept: accept } : {}),
    },
    signal: AbortSignal.timeout(20000),
  })
  if (!res.ok) throw new Error(`Fetch failed (${res.status})`)
  return (await res.text()).slice(0, 3_000_000)
}

function shopifyJsUrl(pageUrl: string): string | null {
  try {
    const u = new URL(pageUrl)
    const m = u.pathname.match(/\/products\/([^/?#]+)/i)
    if (!m?.[1]) return null
    return `${u.origin}/products/${m[1]}.js`
  } catch {
    return null
  }
}

function parseShopifyProductJson(
  raw: string,
  pageUrl: string,
): ExtractedProduct | null {
  try {
    const product = JSON.parse(raw) as Record<string, unknown>
    if (!product || typeof product !== 'object') return null
    if (!product.title && !product.name) return null

    const title = String(product.title || product.name || 'Imported product')
    const description = stripHtml(
      String(product.description || product.body_html || ''),
    )
    const brand =
      typeof product.vendor === 'string' ? product.vendor : null
    const images: string[] = []
    const imgs = product.images
    if (Array.isArray(imgs)) {
      for (const img of imgs) {
        if (typeof img === 'string') {
          images.push(absShopify(img, pageUrl))
        } else if (img && typeof img === 'object' && 'src' in img) {
          images.push(absShopify(String((img as { src: string }).src), pageUrl))
        }
      }
    }
    if (typeof product.featured_image === 'string') {
      images.push(absShopify(product.featured_image, pageUrl))
    }

    const variants: ExtractedVariant[] = []
    let price: number | null = null
    const vars = product.variants
    if (Array.isArray(vars)) {
      vars.slice(0, 48).forEach((v, i) => {
        if (!v || typeof v !== 'object') return
        const vv = v as Record<string, unknown>
        const option1 = typeof vv.option1 === 'string' ? vv.option1 : ''
        const option2 = typeof vv.option2 === 'string' ? vv.option2 : ''
        const option3 = typeof vv.option3 === 'string' ? vv.option3 : ''
        const name =
          (typeof vv.name === 'string' && vv.name) ||
          (typeof vv.title === 'string' && vv.title) ||
          [option1, option2, option3].filter(Boolean).join(' / ') ||
          `Variant ${i + 1}`

        // Prefer colour-like option as color, size-like as size
        const { color, size } = splitColorSize(option1, option2, option3, name)

        let image: string | null = null
        if (typeof vv.featured_image === 'string') {
          image = absShopify(vv.featured_image, pageUrl)
        } else if (vv.featured_image && typeof vv.featured_image === 'object') {
          const src = (vv.featured_image as { src?: string }).src
          if (src) image = absShopify(src, pageUrl)
        } else if (typeof vv.image_id === 'number' && Array.isArray(imgs)) {
          const match = imgs.find(
            (img) =>
              img &&
              typeof img === 'object' &&
              (img as { id?: number }).id === vv.image_id,
          ) as { src?: string } | undefined
          if (match?.src) image = absShopify(match.src, pageUrl)
        }

        let priceNorm: number | null = null
        if (typeof vv.price === 'number') {
          priceNorm = vv.price >= 1000 ? vv.price / 100 : vv.price
        } else if (typeof vv.price === 'string') {
          const n = Number.parseFloat(vv.price)
          priceNorm = Number.isFinite(n)
            ? n >= 1000 && !vv.price.includes('.')
              ? n / 100
              : n
            : null
        }
        if (priceNorm && !price) price = priceNorm

        variants.push({
          id: `shop-${i}-${slugLite(name)}`,
          name,
          color,
          size,
          hex: colorHex(color),
          price: priceNorm,
          sku: typeof vv.sku === 'string' ? vv.sku : undefined,
          image: image || images[i] || images[0] || null,
          availability: vv.available === false ? 'OutOfStock' : 'InStock',
          selected: true,
        })
      })
    }

    const gallery = uniq(images).slice(0, 24)
    return {
      url: pageUrl,
      title: title.slice(0, 160),
      description: description.slice(0, 4000),
      image: gallery[0] ?? null,
      images: gallery,
      price,
      currency: null,
      brand,
      variants,
      analysis: {
        imageCount: gallery.length,
        variantCount: variants.length,
        sources: ['shopify-js'],
      },
    }
  } catch {
    return null
  }
}

function absShopify(src: string, pageUrl: string) {
  const s = src.startsWith('//') ? `https:${src}` : src
  return absolutizeUrl(s, pageUrl)
}

function stripHtml(html: string) {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\s+\n/g, '\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim()
}

function slugLite(s: string) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 24)
}

function uniq(urls: string[]) {
  const out: string[] = []
  const seen = new Set<string>()
  for (const u of urls) {
    if (!u || seen.has(u)) continue
    if (/\.(svg)(\?|$)/i.test(u)) continue
    if (/sprite|icon|logo|pixel|1x1|favicon/i.test(u)) continue
    seen.add(u)
    out.push(u)
  }
  return out
}

const SIZE_HINT =
  /^(xxs|xs|s|m|l|xl|xxl|xxxl|\d{2}|\d+(\.\d+)?|os|one size|small|medium|large)$/i
const COLOR_HINT =
  /\b(black|white|beige|navy|red|pink|green|blue|grey|gray|brown|cream|gold|silver|burgundy|olive|camel|ivory|tan|brown|purple|orange|yellow|natural|noir|blanc|oat|blush|emerald|chocolate|charcoal|wine|lilac|lavender|mint|teal|sky|hot pink)\b/i

function splitColorSize(
  o1: string,
  o2: string,
  o3: string,
  name: string,
): { color: string; size?: string } {
  const opts = [o1, o2, o3].filter(Boolean)
  let color = ''
  let size: string | undefined
  for (const opt of opts) {
    if (SIZE_HINT.test(opt.trim()) && !size) {
      size = opt.trim()
      continue
    }
    if (COLOR_HINT.test(opt) && !color) {
      color = opt.trim()
      continue
    }
  }
  if (!color) {
    const fromName = name.match(COLOR_HINT)?.[0]
    color = fromName
      ? fromName.charAt(0).toUpperCase() + fromName.slice(1).toLowerCase()
      : opts.find((o) => !SIZE_HINT.test(o.trim())) || opts[0] || 'Default'
  }
  if (!size) {
    size = opts.find((o) => SIZE_HINT.test(o.trim()) && o !== color)
  }
  return { color, size }
}

function enrichEtsy(html: string, pageUrl: string, base: ExtractedProduct) {
  const sources = [...base.analysis.sources]
  let title = base.title
  let description = base.description
  const images = [...base.images]
  const variants = [...base.variants]

  const titleHit = html.match(
    /"listing_id"\s*:\s*\d+[\s\S]{0,800}?"title"\s*:\s*"((?:\\.|[^"\\])*)"/i,
  )
  if (titleHit?.[1]) {
    title = titleHit[1].replace(/\\"/g, '"').replace(/\\u([\dA-Fa-f]{4})/g, (_, h) =>
      String.fromCharCode(parseInt(h, 16)),
    )
  }

  // image CDN urls
  const etsyImgs = Array.from(
    html.matchAll(
      /https?:\/\/i\.etsystatic\.com\/[^"'\\\s]+/gi,
    ),
  ).map((m) => m[0]!.replace(/\\\//g, '/'))
  if (etsyImgs.length) {
    sources.push('etsy-cdn')
    images.push(...etsyImgs)
  }

  // variation options
  const varBlocks = Array.from(
    html.matchAll(
      /"property_name"\s*:\s*"(Color|Colour|Size)"\s*,\s*"value"\s*:\s*"([^"]+)"/gi,
    ),
  )
  if (varBlocks.length) {
    sources.push('etsy-variations')
    const colors = new Set<string>()
    const sizes = new Set<string>()
    for (const m of varBlocks) {
      const prop = m[1]!.toLowerCase()
      const val = m[2]!.trim()
      if (prop.startsWith('col')) colors.add(val)
      else sizes.add(val)
    }
    const colorList = colors.size ? Array.from(colors) : ['Default']
    const sizeList = sizes.size ? Array.from(sizes) : [undefined]
    let i = 0
    for (const color of colorList) {
      for (const size of sizeList) {
        const name = [color, size].filter(Boolean).join(' / ')
        if (variants.some((v) => v.name === name)) continue
        variants.push({
          id: `etsy-${i++}-${slugLite(name)}`,
          name,
          color,
          size,
          hex: colorHex(color),
          price: base.price,
          image: images[i % Math.max(images.length, 1)] || images[0] || null,
          selected: true,
        })
      }
    }
  }

  // Longer description from meta itemprop
  const descMatch = html.match(
    /itemprop=["']description["'][^>]*content=["']([^"']+)["']/i,
  )
  if (descMatch?.[1] && description.length < 80) {
    description = descMatch[1]
  }

  const gallery = uniq(images).slice(0, 24)
  return {
    ...base,
    title: title.slice(0, 160),
    description: description.slice(0, 4000),
    images: gallery,
    image: gallery[0] ?? base.image,
    variants: variants.slice(0, 48),
    analysis: {
      imageCount: gallery.length,
      variantCount: Math.min(variants.length, 48),
      sources: Array.from(new Set(sources)),
    },
  } satisfies ExtractedProduct
}

function enrichAmazon(html: string, pageUrl: string, base: ExtractedProduct) {
  const sources = [...base.analysis.sources, 'amazon']
  const images = [...base.images]
  // Amazon image block
  const colorImages = html.match(
    /'colorImages'\s*:\s*(\{[\s\S]*?\})\s*,\s*'colorToAsin'/i,
  )
  if (colorImages?.[1]) {
    try {
      const fixed = colorImages[1]
        .replace(/'/g, '"')
        .replace(/(\w+):/g, '"$1":')
      const parsed = JSON.parse(fixed) as Record<
        string,
        Array<{ hiRes?: string; large?: string }>
      >
      for (const list of Object.values(parsed)) {
        if (!Array.isArray(list)) continue
        for (const item of list) {
          const u = item.hiRes || item.large
          if (u) images.push(u)
        }
      }
      sources.push('amazon-colorImages')
    } catch {
      /* ignore */
    }
  }

  const dyn = Array.from(
    html.matchAll(/https?:\/\/[^"'\\\s]+?\.(?:jpg|jpeg|png|webp)/gi),
  )
    .map((m) => m[0]!)
    .filter((u) => /media-amazon|ssl-images-amazon|images-na\.ssl-images/i.test(u))
  images.push(...dyn)

  // Colour / size dropdowns
  const variants = [...base.variants]
  const swatches = Array.from(
    html.matchAll(
      /data-defaultasin=["'][^"']*["'][^>]*title=["']([^"']+)["']/gi,
    ),
  )
  swatches.slice(0, 24).forEach((m, i) => {
    const name = m[1]!.trim()
    if (!name || variants.some((v) => v.name === name)) return
    const { color, size } = splitColorSize(name, '', '', name)
    variants.push({
      id: `amz-${i}-${slugLite(name)}`,
      name,
      color,
      size,
      hex: colorHex(color),
      price: base.price,
      image: images[i] || images[0] || null,
      selected: true,
    })
  })

  const gallery = uniq(images).slice(0, 24)
  let title = base.title
  const amzTitle = html.match(/id=["']productTitle["'][^>]*>\s*([^<]+)/i)
  if (amzTitle?.[1]) title = amzTitle[1].trim()

  let description = base.description
  const bullets = Array.from(
    html.matchAll(
      /id=["']feature-bullets["'][\s\S]*?<ul[^>]*>([\s\S]*?)<\/ul>/i,
    ),
  )
  if (bullets[0]?.[1]) {
    const lis = Array.from(
      bullets[0][1].matchAll(/<li[^>]*>\s*<span[^>]*>([\s\S]*?)<\/span>/gi),
    )
      .map((m) => stripHtml(m[1]!))
      .filter((t) => t.length > 8 && !/make sure/i.test(t))
    if (lis.length) {
      description = [description, ...lis.map((l) => `• ${l}`)]
        .filter(Boolean)
        .join('\n')
        .slice(0, 4000)
      sources.push('amazon-bullets')
    }
  }

  return {
    ...base,
    url: pageUrl,
    title: title.slice(0, 160),
    description,
    images: gallery,
    image: gallery[0] ?? base.image,
    variants: variants.slice(0, 48),
    analysis: {
      imageCount: gallery.length,
      variantCount: Math.min(variants.length, 48),
      sources: Array.from(new Set(sources)),
    },
  } satisfies ExtractedProduct
}

function enrichTikTok(html: string, pageUrl: string, base: ExtractedProduct) {
  const sources = [...base.analysis.sources, 'tiktok']
  const images = [...base.images]
  const variants = [...base.variants]

  // Universal data / SIGI_STATE style blobs
  const blobs = [
    html.match(
      /<script[^>]+id=["']__UNIVERSAL_DATA_FOR_REHYDRATION__["'][^>]*>([\s\S]*?)<\/script>/i,
    )?.[1],
    html.match(
      /<script[^>]+id=["']SIGI_STATE["'][^>]*>([\s\S]*?)<\/script>/i,
    )?.[1],
    html.match(
      /<script[^>]+id=["']__NEXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/i,
    )?.[1],
  ].filter(Boolean) as string[]

  for (const raw of blobs) {
    try {
      const data = JSON.parse(raw) as unknown
      collectTikTokProduct(data, pageUrl, images, variants, sources)
    } catch {
      /* ignore */
    }
  }

  const gallery = uniq(images).slice(0, 24)
  return {
    ...base,
    images: gallery,
    image: gallery[0] ?? base.image,
    variants: variants.slice(0, 48),
    analysis: {
      imageCount: gallery.length,
      variantCount: Math.min(variants.length, 48),
      sources: Array.from(new Set(sources)),
    },
  } satisfies ExtractedProduct
}

function collectTikTokProduct(
  node: unknown,
  pageUrl: string,
  images: string[],
  variants: ExtractedVariant[],
  sources: string[],
  depth = 0,
) {
  if (depth > 8 || !node || typeof node !== 'object') return
  if (Array.isArray(node)) {
    for (const item of node.slice(0, 40)) {
      collectTikTokProduct(item, pageUrl, images, variants, sources, depth + 1)
    }
    return
  }
  const obj = node as Record<string, unknown>
  const title =
    (typeof obj.title === 'string' && obj.title) ||
    (typeof obj.product_name === 'string' && obj.product_name) ||
    (typeof obj.name === 'string' && obj.name) ||
    ''

  if (Array.isArray(obj.images)) {
    for (const img of obj.images) {
      if (typeof img === 'string') images.push(absolutizeUrl(img, pageUrl))
      else if (img && typeof img === 'object') {
        const u =
          (img as { url_list?: string[] }).url_list?.[0] ||
          (img as { url?: string }).url
        if (u) images.push(absolutizeUrl(String(u), pageUrl))
      }
    }
  }

  if (Array.isArray(obj.skus) || Array.isArray(obj.sku_list)) {
    sources.push('tiktok-skus')
    const skus = (obj.skus || obj.sku_list) as unknown[]
    skus.slice(0, 40).forEach((sku, i) => {
      if (!sku || typeof sku !== 'object') return
      const s = sku as Record<string, unknown>
      const name =
        String(s.name || s.sku_name || s.prop || `Variant ${i + 1}`)
      const { color, size } = splitColorSize(name, '', '', name)
      const priceRaw =
        (s.price as { price_val?: string; real_price?: string })?.price_val ||
        (s.price as { real_price?: string })?.real_price ||
        s.price
      const price =
        typeof priceRaw === 'number'
          ? priceRaw > 1000
            ? priceRaw / 100
            : priceRaw
          : Number.parseFloat(String(priceRaw || '').replace(/[^\d.]/g, '')) ||
            null
      variants.push({
        id: `tt-${i}-${slugLite(name)}`,
        name,
        color,
        size,
        hex: colorHex(color),
        price: price && price > 0 ? price : null,
        image: images[i] || images[0] || null,
        selected: true,
      })
    })
  }

  if (title && Array.isArray(obj.skus)) {
    // leaf-ish product node — still walk children lightly
  }

  for (const key of Object.keys(obj).slice(0, 50)) {
    collectTikTokProduct(obj[key], pageUrl, images, variants, sources, depth + 1)
  }
}

/** Download remote images into /public/assets/uploads so the shop owns them. */
export async function mirrorRemoteImages(
  urls: string[],
  limit = 12,
): Promise<Map<string, string>> {
  const map = new Map<string, string>()
  const dir = uploadsDir()
  await mkdir(dir, { recursive: true })

  for (const url of urls.slice(0, limit)) {
    if (!url || map.has(url)) continue
    if (url.startsWith('/assets/')) {
      map.set(url, url)
      continue
    }
    try {
      const res = await fetch(url, {
        headers: FETCH_HEADERS,
        redirect: 'follow',
        signal: AbortSignal.timeout(15000),
      })
      if (!res.ok) continue
      const ct = res.headers.get('content-type') || ''
      if (!ct.startsWith('image/') && !/\.(jpe?g|png|webp|gif)(\?|$)/i.test(url)) {
        continue
      }
      const buf = Buffer.from(await res.arrayBuffer())
      if (buf.length < 500 || buf.length > 12_000_000) continue
      const ext = ct.includes('png')
        ? '.png'
        : ct.includes('webp')
          ? '.webp'
          : ct.includes('gif')
            ? '.gif'
            : '.jpg'
      const name = `imp-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}${ext}`
      await writeFile(path.join(dir, name), buf)
      map.set(url, `/assets/uploads/${name}`)
    } catch {
      /* keep remote url as fallback */
    }
  }
  return map
}

export function applyMirroredImages(
  product: ExtractedProduct,
  mirrored: Map<string, string>,
): ExtractedProduct {
  const remap = (u: string | null | undefined) =>
    u ? mirrored.get(u) || u : u
  return {
    ...product,
    image: remap(product.image) ?? null,
    images: product.images.map((u) => remap(u) || u),
    variants: product.variants.map((v) => ({
      ...v,
      image: remap(v.image) ?? null,
    })),
  }
}

export async function importProductFromUrl(
  pageUrl: string,
): Promise<ExtractedProduct> {
  const platform = detectMarketplace(pageUrl)
  const sources: string[] = [platform]

  // Shopify native JSON is the richest source when available
  if (platform === 'shopify' || /\/products\//i.test(pageUrl)) {
    const jsUrl = shopifyJsUrl(pageUrl)
    if (jsUrl) {
      try {
        const json = await fetchText(jsUrl, 'application/json')
        const parsed = parseShopifyProductJson(json, pageUrl)
        if (parsed && (parsed.images.length || parsed.variants.length)) {
          return parsed
        }
      } catch {
        sources.push('shopify-js-miss')
      }
    }
  }

  const html = await fetchText(pageUrl)
  let extracted = analyzeProductHtml(html, pageUrl)
  extracted = {
    ...extracted,
    analysis: {
      ...extracted.analysis,
      sources: Array.from(
        new Set([...extracted.analysis.sources, ...sources]),
      ),
    },
  }

  if (platform === 'etsy') {
    extracted = enrichEtsy(html, pageUrl, extracted)
  } else if (platform === 'amazon') {
    extracted = enrichAmazon(html, pageUrl, extracted)
  } else if (platform === 'tiktok') {
    extracted = enrichTikTok(html, pageUrl, extracted)
  }

  // Last-chance Shopify parse from HTML if .js missed
  if (
    (platform === 'shopify' || platform === 'generic') &&
    extracted.variants.length < 2
  ) {
    const embedded = html.match(
      /<script[^>]+type=["']application\/json["'][^>]*>([\s\S]*?"variants"\s*:\s*\[[\s\S]*?)<\/script>/i,
    )
    if (embedded?.[1]) {
      const parsed = parseShopifyProductJson(embedded[1], pageUrl)
      if (parsed && parsed.variants.length > extracted.variants.length) {
        extracted = {
          ...parsed,
          analysis: {
            ...parsed.analysis,
            sources: Array.from(
              new Set([
                ...extracted.analysis.sources,
                ...parsed.analysis.sources,
              ]),
            ),
          },
        }
      }
    }
  }

  if (!extracted.title && !extracted.image && !extracted.variants.length) {
    throw new Error('Could not extract product details from that page')
  }

  return extracted
}

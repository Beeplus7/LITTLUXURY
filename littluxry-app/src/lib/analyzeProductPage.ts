import {
  absolutizeUrl,
  colorHex,
  decodeHtmlEntities,
  type ExtractedProduct,
  type ExtractedVariant,
} from '@/lib/extractProduct'

function parsePrice(raw: unknown): number | null {
  if (raw == null) return null
  const cleaned = String(raw).replace(/[^\d.,]/g, '').replace(/,/g, '')
  const n = Number.parseFloat(cleaned)
  return Number.isFinite(n) && n > 0 ? n : null
}

function uniq(urls: string[]) {
  const out: string[] = []
  const seen = new Set<string>()
  for (const u of urls) {
    if (!u || seen.has(u)) continue
    // Drop tiny icons / tracking pixels
    if (/\.(svg)(\?|$)/i.test(u)) continue
    if (/sprite|icon|logo|pixel|1x1|favicon/i.test(u)) continue
    seen.add(u)
    out.push(u)
  }
  return out
}

function metaAll(html: string, key: string) {
  const values: string[] = []
  const patterns = [
    new RegExp(
      `<meta[^>]+(?:property|name)=["']${key}["'][^>]+content=["']([^"']+)["']`,
      'gi',
    ),
    new RegExp(
      `<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${key}["']`,
      'gi',
    ),
  ]
  for (const re of patterns) {
    let m: RegExpExecArray | null
    while ((m = re.exec(html))) {
      values.push(decodeHtmlEntities(m[1]!.trim()))
    }
  }
  return values
}

function metaContent(html: string, keys: string[]) {
  for (const key of keys) {
    const all = metaAll(html, key)
    if (all[0]) return all[0]
  }
  return null
}

function titleTag(html: string) {
  const m = html.match(/<title[^>]*>([^<]+)<\/title>/i)
  return m?.[1] ? decodeHtmlEntities(m[1].trim()) : null
}

function pushImage(list: string[], value: unknown, base: string) {
  if (!value) return
  if (typeof value === 'string') {
    list.push(absolutizeUrl(value, base))
    return
  }
  if (Array.isArray(value)) {
    for (const item of value) pushImage(list, item, base)
    return
  }
  if (typeof value === 'object' && value && 'url' in value) {
    list.push(absolutizeUrl(String((value as { url: string }).url), base))
  }
}

function offerPrice(offer: Record<string, unknown>): number | null {
  return (
    parsePrice(offer.price) ??
    parsePrice(offer.lowPrice) ??
    parsePrice(offer.highPrice)
  )
}

function variantFromNode(
  n: Record<string, unknown>,
  pageUrl: string,
  fallbackName: string,
  idx: number,
): ExtractedVariant {
  const name =
    (typeof n.name === 'string' && n.name) ||
    (typeof n.color === 'string' && n.color) ||
    fallbackName ||
    `Variant ${idx + 1}`
  const color =
    (typeof n.color === 'string' && n.color) ||
    guessColorFromName(name) ||
    name
  const size =
    typeof n.size === 'string'
      ? n.size
      : typeof n.size === 'number'
        ? String(n.size)
        : undefined

  let image: string | null = null
  const imgs: string[] = []
  pushImage(imgs, n.image, pageUrl)
  if (imgs[0]) image = imgs[0]

  let price: number | null = null
  let availability: string | null = null
  const offers = n.offers
  const offerList = Array.isArray(offers) ? offers : offers ? [offers] : []
  for (const offer of offerList) {
    if (!offer || typeof offer !== 'object') continue
    const o = offer as Record<string, unknown>
    price = price ?? offerPrice(o)
    if (typeof o.availability === 'string') availability = o.availability
  }
  price = price ?? parsePrice(n.price)

  const sku =
    typeof n.sku === 'string'
      ? n.sku
      : typeof n.mpn === 'string'
        ? n.mpn
        : undefined

  return {
    id: `v-${idx}-${slugLite(name)}`,
    name,
    color,
    size,
    hex: colorHex(color),
    price,
    sku,
    image,
    availability,
    selected: true,
  }
}

function slugLite(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 24)
}

function guessColorFromName(name: string) {
  const known = Object.keys({
    black: 1,
    white: 1,
    beige: 1,
    brown: 1,
    navy: 1,
    red: 1,
    pink: 1,
    green: 1,
    blue: 1,
    grey: 1,
    gray: 1,
    gold: 1,
    cream: 1,
    ivory: 1,
    burgundy: 1,
    camel: 1,
    olive: 1,
  })
  const lower = name.toLowerCase()
  return known.find((k) => lower.includes(k))
}

function walkJsonLd(
  data: unknown,
  pageUrl: string,
  acc: {
    title: string | null
    description: string | null
    brand: string | null
    images: string[]
    price: number | null
    currency: string | null
    variants: ExtractedVariant[]
  },
) {
  const nodes = Array.isArray(data)
    ? data
    : data && typeof data === 'object' && '@graph' in (data as object)
      ? ((data as { '@graph': unknown[] })['@graph'] ?? [])
      : [data]

  for (const node of nodes) {
    if (!node || typeof node !== 'object') continue
    const n = node as Record<string, unknown>
    const type = String(n['@type'] ?? '')

    if (/productgroup/i.test(type) && Array.isArray(n.hasVariant)) {
      if (typeof n.name === 'string' && !acc.title) acc.title = n.name
      if (typeof n.description === 'string' && !acc.description) {
        acc.description = n.description
      }
      pushImage(acc.images, n.image, pageUrl)
      n.hasVariant.forEach((v, i) => {
        if (v && typeof v === 'object') {
          acc.variants.push(
            variantFromNode(v as Record<string, unknown>, pageUrl, acc.title ?? 'Variant', i),
          )
        }
      })
    }

    if (/product/i.test(type) || n.offers) {
      if (typeof n.name === 'string' && !acc.title) acc.title = n.name
      if (typeof n.description === 'string' && !acc.description) {
        acc.description = n.description
      }
      if (typeof n.brand === 'string') acc.brand = n.brand
      if (n.brand && typeof n.brand === 'object') {
        const b = n.brand as { name?: string }
        if (b.name) acc.brand = b.name
      }
      pushImage(acc.images, n.image, pageUrl)

      const offers = n.offers
      const offerList = Array.isArray(offers) ? offers : offers ? [offers] : []
      for (const offer of offerList) {
        if (!offer || typeof offer !== 'object') continue
        const o = offer as Record<string, unknown>
        const p = offerPrice(o)
        if (p && !acc.price) acc.price = p
        if (typeof o.priceCurrency === 'string' && !acc.currency) {
          acc.currency = o.priceCurrency
        }
        // AggregateOffer with offers[]
        if (Array.isArray(o.offers)) {
          o.offers.forEach((sub, i) => {
            if (sub && typeof sub === 'object') {
              const s = sub as Record<string, unknown>
              acc.variants.push(
                variantFromNode(
                  { ...s, name: s.name || s.itemOffered || `Offer ${i + 1}` },
                  pageUrl,
                  acc.title ?? 'Offer',
                  acc.variants.length,
                ),
              )
            }
          })
        }
      }

      if (Array.isArray(n.offers) && n.offers.length > 1) {
        n.offers.forEach((offer, i) => {
          if (offer && typeof offer === 'object') {
            acc.variants.push(
              variantFromNode(
                offer as Record<string, unknown>,
                pageUrl,
                acc.title ?? 'Offer',
                acc.variants.length + i,
              ),
            )
          }
        })
      }
    }
  }
}

/** Shopify / common ecommerce JSON blobs embedded in the page. */
function extractEmbeddedCommerce(html: string, pageUrl: string) {
  const images: string[] = []
  const variants: ExtractedVariant[] = []
  let title: string | null = null
  let price: number | null = null
  let brand: string | null = null
  const sources: string[] = []

  // Shopify product JSON
  const shopify =
    html.match(
      /<script[^>]+type=["']application\/json["'][^>]*data-product-json[^>]*>([\s\S]*?)<\/script>/i,
    ) ||
    html.match(
      /<script[^>]+id=["']ProductJson-?[A-Za-z0-9_-]*["'][^>]*>([\s\S]*?)<\/script>/i,
    ) ||
    html.match(/var\s+meta\s*=\s*(\{[\s\S]*?"product"\s*:[\s\S]*?\});\s*/)

  const candidates: string[] = []
  if (shopify?.[1]) candidates.push(shopify[1])

  // Generic: window.__INITIAL_STATE__ / __NEXT_DATA__ product slices (best-effort)
  const nextData = html.match(
    /<script[^>]+id=["']__NEXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/i,
  )
  if (nextData?.[1]) candidates.push(nextData[1])

  for (const raw of candidates) {
    try {
      const data = JSON.parse(raw) as unknown
      const product = findProductObject(data)
      if (!product) continue
      sources.push('embedded-json')
      if (typeof product.title === 'string') title = product.title
      if (typeof product.name === 'string' && !title) title = product.name
      if (typeof product.vendor === 'string') brand = product.vendor
      const imgs = product.images
      if (Array.isArray(imgs)) {
        for (const img of imgs) {
          if (typeof img === 'string') images.push(absolutizeUrl(img.startsWith('//') ? `https:${img}` : img, pageUrl))
          else if (img && typeof img === 'object' && 'src' in img) {
            images.push(
              absolutizeUrl(
                String((img as { src: string }).src).startsWith('//')
                  ? `https:${(img as { src: string }).src}`
                  : String((img as { src: string }).src),
                pageUrl,
              ),
            )
          }
        }
      }
      if (typeof product.featured_image === 'string') {
        images.push(
          absolutizeUrl(
            product.featured_image.startsWith('//')
              ? `https:${product.featured_image}`
              : product.featured_image,
            pageUrl,
          ),
        )
      }
      const vars = product.variants
      if (Array.isArray(vars)) {
        vars.slice(0, 40).forEach((v, i) => {
          if (!v || typeof v !== 'object') return
          const vv = v as Record<string, unknown>
          const name =
            (typeof vv.name === 'string' && vv.name) ||
            (typeof vv.title === 'string' && vv.title) ||
            [vv.option1, vv.option2, vv.option3].filter(Boolean).join(' / ') ||
            `Variant ${i + 1}`
          const color =
            (typeof vv.option1 === 'string' && vv.option1) ||
            guessColorFromName(String(name)) ||
            String(name)
          const size =
            typeof vv.option2 === 'string'
              ? vv.option2
              : typeof vv.option3 === 'string'
                ? vv.option3
                : undefined
          let image: string | null = null
          if (typeof vv.featured_image === 'string') {
            image = absolutizeUrl(vv.featured_image, pageUrl)
          } else if (vv.featured_image && typeof vv.featured_image === 'object') {
            const src = (vv.featured_image as { src?: string }).src
            if (src) image = absolutizeUrl(src.startsWith('//') ? `https:${src}` : src, pageUrl)
          }
          // Shopify prices are often integer cents
          let priceNorm: number | null = null
          if (typeof vv.price === 'number') {
            priceNorm = vv.price >= 1000 ? vv.price / 100 : vv.price
          } else {
            priceNorm = parsePrice(vv.price)
          }
          if (priceNorm && !price) price = priceNorm
          variants.push({
            id: `shop-${i}-${slugLite(String(name))}`,
            name: String(name),
            color: String(color),
            size: size ? String(size) : undefined,
            hex: colorHex(String(color)),
            price: priceNorm,
            sku: typeof vv.sku === 'string' ? vv.sku : undefined,
            image,
            availability:
              vv.available === false ? 'OutOfStock' : 'InStock',
            selected: true,
          })
        })
      }
    } catch {
      /* ignore */
    }
  }

  return { images, variants, title, price, brand, sources }
}

function findProductObject(data: unknown): Record<string, unknown> | null {
  if (!data || typeof data !== 'object') return null
  const obj = data as Record<string, unknown>
  if (Array.isArray(obj.variants) && (obj.title || obj.name)) return obj
  if (obj.product && typeof obj.product === 'object') {
    return findProductObject(obj.product)
  }
  // __NEXT_DATA__ props
  if (obj.props && typeof obj.props === 'object') {
    const found = deepFindProduct(obj.props, 0)
    if (found) return found
  }
  return deepFindProduct(obj, 0)
}

function deepFindProduct(
  node: unknown,
  depth: number,
): Record<string, unknown> | null {
  if (depth > 6 || !node || typeof node !== 'object') return null
  if (Array.isArray(node)) {
    for (const item of node.slice(0, 30)) {
      const f = deepFindProduct(item, depth + 1)
      if (f) return f
    }
    return null
  }
  const obj = node as Record<string, unknown>
  if (Array.isArray(obj.variants) && (typeof obj.title === 'string' || typeof obj.name === 'string')) {
    return obj
  }
  for (const key of Object.keys(obj).slice(0, 40)) {
    const f = deepFindProduct(obj[key], depth + 1)
    if (f) return f
  }
  return null
}

function extractImgTags(html: string, pageUrl: string) {
  const urls: string[] = []
  const re =
    /<img[^>]+(?:src|data-src|data-original|data-zoom-image)=["']([^"']+)["'][^>]*>/gi
  let m: RegExpExecArray | null
  while ((m = re.exec(html))) {
    const src = m[1]!
    if (/^data:/i.test(src)) continue
    urls.push(absolutizeUrl(src.startsWith('//') ? `https:${src}` : src, pageUrl))
  }
  // srcset first candidate
  const srcsetRe = /srcset=["']([^"']+)["']/gi
  while ((m = srcsetRe.exec(html))) {
    const first = m[1]!.split(',')[0]?.trim().split(/\s+/)[0]
    if (first && !first.startsWith('data:')) {
      urls.push(absolutizeUrl(first.startsWith('//') ? `https:${first}` : first, pageUrl))
    }
  }
  return urls
}

/** Infer color/size options from select/radio labels when JSON is sparse. */
function extractOptionVariants(html: string, basePrice: number | null) {
  const variants: ExtractedVariant[] = []
  const colorBlocks =
    html.match(
      /<(?:select|ul|div)[^>]*(?:color|Colour|swatch)[^>]*>[\s\S]*?<\/(?:select|ul|div)>/gi,
    ) ?? []

  const labels: string[] = []
  for (const block of colorBlocks.slice(0, 3)) {
    const opts = Array.from(
      block.matchAll(/<(?:option|li|button|a)[^>]*>([^<]{1,40})<\/(?:option|li|button|a)>/gi),
    )
    for (const o of opts) {
      const t = decodeHtmlEntities(o[1]!.trim())
      if (!t || /select|choose|color|colour|size/i.test(t)) continue
      labels.push(t)
    }
  }

  // data-color / aria-label swatches
  const swatchRe =
    /(?:data-color|data-colour|aria-label|title)=["']([A-Za-z][A-Za-z0-9 \/-]{1,30})["']/gi
  let sm: RegExpExecArray | null
  while ((sm = swatchRe.exec(html))) {
    const t = sm[1]!.trim()
    if (/select|add to|cart|wishlist|size guide/i.test(t)) continue
    if (guessColorFromName(t) || NAMED_HINT.test(t)) labels.push(t)
  }

  const unique = Array.from(new Set(labels.map((l) => l.trim()))).slice(0, 16)
  unique.forEach((name, i) => {
    variants.push({
      id: `opt-${i}-${slugLite(name)}`,
      name,
      color: name,
      hex: colorHex(name),
      price: basePrice,
      selected: true,
    })
  })
  return variants
}

const NAMED_HINT =
  /\b(black|white|beige|navy|red|pink|green|blue|grey|gray|brown|cream|gold|silver|burgundy|olive|camel|ivory)\b/i

function dedupeVariants(variants: ExtractedVariant[]) {
  const out: ExtractedVariant[] = []
  const seen = new Set<string>()
  for (const v of variants) {
    const key = `${v.color}|${v.size ?? ''}|${v.sku ?? ''}|${v.name}`.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push(v)
  }
  return out.slice(0, 40)
}

export function analyzeProductHtml(html: string, pageUrl: string): ExtractedProduct {
  const sources: string[] = []
  const acc = {
    title: null as string | null,
    description: null as string | null,
    brand: null as string | null,
    images: [] as string[],
    price: null as number | null,
    currency: null as string | null,
    variants: [] as ExtractedVariant[],
  }

  // JSON-LD
  const blocks = Array.from(
    html.matchAll(
      /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
    ),
  )
  if (blocks.length) sources.push('json-ld')
  for (const block of blocks) {
    try {
      walkJsonLd(JSON.parse(block[1]!), pageUrl, acc)
    } catch {
      /* ignore */
    }
  }

  // Embedded commerce JSON
  const embedded = extractEmbeddedCommerce(html, pageUrl)
  sources.push(...embedded.sources)
  if (embedded.title && !acc.title) acc.title = embedded.title
  if (embedded.brand && !acc.brand) acc.brand = embedded.brand
  if (embedded.price && !acc.price) acc.price = embedded.price
  acc.images.push(...embedded.images)
  acc.variants.push(...embedded.variants)

  // Open Graph / twitter
  const ogTitle = metaContent(html, ['og:title', 'twitter:title'])
  const ogDesc = metaContent(html, [
    'og:description',
    'twitter:description',
    'description',
  ])
  const ogImages = [
    ...metaAll(html, 'og:image'),
    ...metaAll(html, 'og:image:url'),
    ...metaAll(html, 'twitter:image'),
  ].map((u) => absolutizeUrl(u, pageUrl))
  if (ogImages.length) sources.push('open-graph')
  acc.images.push(...ogImages)

  const ogPrice =
    parsePrice(metaContent(html, ['product:price:amount', 'og:price:amount'])) ??
    parsePrice(metaContent(html, ['twitter:data1', 'price']))
  if (ogPrice && !acc.price) acc.price = ogPrice

  // Gallery <img>
  const imgs = extractImgTags(html, pageUrl)
  if (imgs.length) sources.push('img-tags')
  acc.images.push(...imgs)

  // Option swatches if still few variants
  if (acc.variants.length < 2) {
    const opts = extractOptionVariants(html, acc.price)
    if (opts.length) {
      sources.push('option-swatches')
      acc.variants.push(...opts)
    }
  }

  // Assign gallery images to variants missing images
  const gallery = uniq(acc.images).slice(0, 24)
  acc.variants = dedupeVariants(acc.variants).map((v, i) => ({
    ...v,
    image: v.image || gallery[i] || gallery[0] || null,
    price: v.price ?? acc.price,
    selected: true,
  }))

  const title =
    (acc.title || ogTitle || titleTag(html) || 'Imported product').slice(0, 160)
  const description = (acc.description || ogDesc || '').slice(0, 1200)
  const image = gallery[0] ?? null

  return {
    url: pageUrl,
    title,
    description,
    image,
    images: gallery,
    price: acc.price,
    currency: acc.currency,
    brand: acc.brand,
    variants: acc.variants,
    analysis: {
      imageCount: gallery.length,
      variantCount: acc.variants.length,
      sources: Array.from(new Set(sources)),
    },
  }
}

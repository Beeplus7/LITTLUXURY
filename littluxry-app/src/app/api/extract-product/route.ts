import { NextResponse } from 'next/server'
import {
  absolutizeUrl,
  decodeHtmlEntities,
  type ExtractedProduct,
} from '@/lib/extractProduct'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function isPrivateHostname(hostname: string) {
  const h = hostname.toLowerCase()
  if (
    h === 'localhost' ||
    h.endsWith('.local') ||
    h.endsWith('.internal') ||
    h === '0.0.0.0'
  ) {
    return true
  }
  // Block obvious private IPv4
  if (/^\d+\.\d+\.\d+\.\d+$/.test(h)) {
    const [a, b] = h.split('.').map(Number)
    if (a === 10 || a === 127 || a === 0) return true
    if (a === 192 && b === 168) return true
    if (a === 172 && b >= 16 && b <= 31) return true
    if (a === 169 && b === 254) return true
  }
  return false
}

function metaContent(html: string, keys: string[]) {
  for (const key of keys) {
    const patterns = [
      new RegExp(
        `<meta[^>]+(?:property|name)=["']${key}["'][^>]+content=["']([^"']+)["']`,
        'i',
      ),
      new RegExp(
        `<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${key}["']`,
        'i',
      ),
    ]
    for (const re of patterns) {
      const m = html.match(re)
      if (m?.[1]) return decodeHtmlEntities(m[1].trim())
    }
  }
  return null
}

function titleTag(html: string) {
  const m = html.match(/<title[^>]*>([^<]+)<\/title>/i)
  return m?.[1] ? decodeHtmlEntities(m[1].trim()) : null
}

function parsePrice(raw: string | null): number | null {
  if (!raw) return null
  const cleaned = raw.replace(/[^\d.,]/g, '').replace(/,/g, '')
  const n = Number.parseFloat(cleaned)
  return Number.isFinite(n) && n > 0 ? n : null
}

function extractJsonLd(html: string, pageUrl: string) {
  const blocks = Array.from(
    html.matchAll(
      /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
    ),
  )
  let title: string | null = null
  let description: string | null = null
  let image: string | null = null
  const images: string[] = []
  let price: number | null = null
  let currency: string | null = null
  let brand: string | null = null

  for (const block of blocks) {
    try {
      const data = JSON.parse(block[1]!) as unknown
      const nodes = Array.isArray(data)
        ? data
        : data && typeof data === 'object' && '@graph' in (data as object)
          ? ((data as { '@graph': unknown[] })['@graph'] ?? [])
          : [data]

      for (const node of nodes) {
        if (!node || typeof node !== 'object') continue
        const n = node as Record<string, unknown>
        const type = String(n['@type'] ?? '')
        if (!/product/i.test(type) && !n.offers) continue

        if (typeof n.name === 'string' && !title) title = n.name
        if (typeof n.description === 'string' && !description) {
          description = n.description
        }
        if (typeof n.brand === 'string') brand = n.brand
        if (n.brand && typeof n.brand === 'object') {
          const b = n.brand as { name?: string }
          if (b.name) brand = b.name
        }

        const img = n.image
        if (typeof img === 'string') {
          images.push(absolutizeUrl(img, pageUrl))
          if (!image) image = absolutizeUrl(img, pageUrl)
        } else if (Array.isArray(img)) {
          for (const item of img) {
            if (typeof item === 'string') {
              images.push(absolutizeUrl(item, pageUrl))
              if (!image) image = absolutizeUrl(item, pageUrl)
            } else if (item && typeof item === 'object' && 'url' in item) {
              const u = String((item as { url: string }).url)
              images.push(absolutizeUrl(u, pageUrl))
              if (!image) image = absolutizeUrl(u, pageUrl)
            }
          }
        }

        const offers = n.offers
        const offerList = Array.isArray(offers) ? offers : offers ? [offers] : []
        for (const offer of offerList) {
          if (!offer || typeof offer !== 'object') continue
          const o = offer as Record<string, unknown>
          const p =
            parsePrice(typeof o.price === 'string' || typeof o.price === 'number' ? String(o.price) : null) ??
            parsePrice(
              typeof o.lowPrice === 'string' || typeof o.lowPrice === 'number'
                ? String(o.lowPrice)
                : null,
            )
          if (p && !price) price = p
          if (typeof o.priceCurrency === 'string' && !currency) {
            currency = o.priceCurrency
          }
        }
      }
    } catch {
      /* ignore bad JSON-LD */
    }
  }

  return { title, description, image, images, price, currency, brand }
}

export async function POST(request: Request) {
  let body: { url?: string }
  try {
    body = (await request.json()) as { url?: string }
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const rawUrl = body.url?.trim()
  if (!rawUrl) {
    return NextResponse.json({ error: 'url is required' }, { status: 400 })
  }

  let parsed: URL
  try {
    parsed = new URL(rawUrl)
  } catch {
    return NextResponse.json({ error: 'Invalid URL' }, { status: 400 })
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    return NextResponse.json({ error: 'Only http(s) URLs are allowed' }, { status: 400 })
  }
  if (isPrivateHostname(parsed.hostname)) {
    return NextResponse.json({ error: 'That host is not allowed' }, { status: 400 })
  }

  let html = ''
  try {
    const res = await fetch(parsed.toString(), {
      redirect: 'follow',
      headers: {
        'User-Agent':
          'Mozilla/5.0 (compatible; LITTLUXRYBot/1.0; +https://litt-luxury.com)',
        Accept: 'text/html,application/xhtml+xml',
      },
      signal: AbortSignal.timeout(12000),
    })
    if (!res.ok) {
      return NextResponse.json(
        { error: `Fetch failed (${res.status})` },
        { status: 502 },
      )
    }
    const ct = res.headers.get('content-type') ?? ''
    if (!ct.includes('text/html') && !ct.includes('application/xhtml')) {
      // Still try — some CDNs omit content-type
    }
    html = (await res.text()).slice(0, 1_200_000)
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Fetch failed'
    return NextResponse.json({ error: msg }, { status: 502 })
  }

  const jsonLd = extractJsonLd(html, parsed.toString())
  const ogTitle = metaContent(html, ['og:title', 'twitter:title'])
  const ogDesc = metaContent(html, [
    'og:description',
    'twitter:description',
    'description',
  ])
  const ogImage = metaContent(html, ['og:image', 'twitter:image', 'og:image:url'])
  const ogPrice =
    parsePrice(metaContent(html, ['product:price:amount', 'og:price:amount'])) ??
    parsePrice(metaContent(html, ['twitter:data1', 'price']))

  const image = jsonLd.image || (ogImage ? absolutizeUrl(ogImage, parsed.toString()) : null)
  const images = [
    ...jsonLd.images,
    ...(image ? [image] : []),
  ].filter((v, i, a) => a.indexOf(v) === i)

  const extracted: ExtractedProduct = {
    url: parsed.toString(),
    title: (jsonLd.title || ogTitle || titleTag(html) || 'Imported product').slice(0, 160),
    description: (jsonLd.description || ogDesc || '').slice(0, 1200),
    image,
    images: images.slice(0, 8),
    price: jsonLd.price ?? ogPrice,
    currency: jsonLd.currency,
    brand: jsonLd.brand,
  }

  if (!extracted.title && !extracted.image) {
    return NextResponse.json(
      { error: 'Could not extract product details from that page' },
      { status: 422 },
    )
  }

  return NextResponse.json({ ok: true, product: extracted })
}

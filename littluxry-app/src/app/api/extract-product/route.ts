import { NextResponse } from 'next/server'
import {
  applyMirroredImages,
  detectMarketplace,
  importProductFromUrl,
  mirrorRemoteImages,
} from '@/lib/marketplaceImport'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

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
  if (/^\d+\.\d+\.\d+\.\d+$/.test(h)) {
    const [a, b] = h.split('.').map(Number)
    if (a === 10 || a === 127 || a === 0) return true
    if (a === 192 && b === 168) return true
    if (a === 172 && b >= 16 && b <= 31) return true
    if (a === 169 && b === 254) return true
  }
  return false
}

export async function POST(request: Request) {
  let body: { url?: string; mirrorImages?: boolean }
  try {
    body = (await request.json()) as { url?: string; mirrorImages?: boolean }
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
    return NextResponse.json(
      { error: 'Only http(s) URLs are allowed' },
      { status: 400 },
    )
  }
  if (isPrivateHostname(parsed.hostname)) {
    return NextResponse.json({ error: 'That host is not allowed' }, { status: 400 })
  }

  const platform = detectMarketplace(parsed.toString())

  try {
    let product = await importProductFromUrl(parsed.toString())

    const shouldMirror = body.mirrorImages !== false
    if (shouldMirror && product.images.length) {
      const mirrored = await mirrorRemoteImages(product.images, 12)
      if (mirrored.size) {
        product = applyMirroredImages(product, mirrored)
        product = {
          ...product,
          analysis: {
            ...product.analysis,
            sources: Array.from(
              new Set([...product.analysis.sources, 'mirrored-uploads']),
            ),
          },
        }
      }
    }

    if (!product.title && !product.image && !product.variants.length) {
      return NextResponse.json(
        { error: 'Could not extract product details from that page' },
        { status: 422 },
      )
    }

    return NextResponse.json({
      ok: true,
      platform,
      product,
      analysis: product.analysis,
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Import failed'
    return NextResponse.json({ error: msg, platform }, { status: 502 })
  }
}

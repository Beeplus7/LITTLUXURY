import { NextResponse } from 'next/server'
import { analyzeProductHtml } from '@/lib/analyzeProductPage'

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
    return NextResponse.json(
      { error: 'Only http(s) URLs are allowed' },
      { status: 400 },
    )
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
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      signal: AbortSignal.timeout(15000),
    })
    if (!res.ok) {
      return NextResponse.json(
        { error: `Fetch failed (${res.status})` },
        { status: 502 },
      )
    }
    html = (await res.text()).slice(0, 2_000_000)
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Fetch failed'
    return NextResponse.json({ error: msg }, { status: 502 })
  }

  const extracted = analyzeProductHtml(html, parsed.toString())

  if (!extracted.title && !extracted.image && !extracted.variants.length) {
    return NextResponse.json(
      { error: 'Could not extract product details from that page' },
      { status: 422 },
    )
  }

  return NextResponse.json({
    ok: true,
    product: extracted,
    analysis: extracted.analysis,
  })
}

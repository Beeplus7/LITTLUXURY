import { NextResponse } from 'next/server'
import { getStripe, stripeConfigured } from '@/lib/stripe'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type CheckoutItem = {
  productId: string
  name: string
  price: number
  color: string
  size?: string
  quantity: number
  image?: string
}

function publicOrigin(request: Request) {
  const env = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '')
  if (env) return env
  const proto = request.headers.get('x-forwarded-proto') ?? 'https'
  const host =
    request.headers.get('x-forwarded-host') ??
    request.headers.get('host') ??
    new URL(request.url).host
  if (!host || host.startsWith('localhost') || host.startsWith('127.')) {
    return 'https://litt-luxury.com'
  }
  return `${proto}://${host}`
}

function absoluteImage(src: string | undefined, origin: string): string[] {
  if (!src) return []
  if (src.startsWith('data:') || src.startsWith('local-media:')) return []
  if (src.startsWith('http://') || src.startsWith('https://')) return [src]
  if (src.startsWith('/')) return [`${origin}${src}`]
  return []
}

export async function POST(request: Request) {
  if (!stripeConfigured()) {
    return NextResponse.json(
      {
        error:
          'Stripe is not configured. Add STRIPE_SECRET_KEY on the server.',
      },
      { status: 503 },
    )
  }

  let body: {
    items?: CheckoutItem[]
    shipRegion?: 'europe' | 'usa'
    shipping?: number
    email?: string
    customerName?: string
  }

  try {
    body = (await request.json()) as typeof body
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const items = Array.isArray(body.items) ? body.items : []
  if (!items.length) {
    return NextResponse.json({ error: 'Cart is empty' }, { status: 400 })
  }

  for (const item of items) {
    if (!item.name || !(item.price > 0) || !(item.quantity > 0)) {
      return NextResponse.json(
        { error: 'Each cart item needs a name, price, and quantity' },
        { status: 400 },
      )
    }
  }

  const origin = publicOrigin(request)
  const shipping = Math.max(0, Number(body.shipping) || 0)
  const shipRegion = body.shipRegion === 'usa' ? 'usa' : 'europe'

  try {
    const stripe = getStripe()
    const line_items = items.map((item) => {
      const label = [item.color, item.size].filter(Boolean).join(' · ')
      return {
        quantity: Math.min(99, Math.max(1, Math.round(item.quantity))),
        price_data: {
          currency: 'usd',
          unit_amount: Math.round(Number(item.price) * 100),
          product_data: {
            name: item.name.slice(0, 120),
            description: label ? label.slice(0, 200) : undefined,
            images: absoluteImage(item.image, origin).slice(0, 1),
            metadata: {
              productId: String(item.productId || ''),
              color: String(item.color || ''),
              size: String(item.size || ''),
            },
          },
        },
      }
    })

    if (shipping > 0) {
      line_items.push({
        quantity: 1,
        price_data: {
          currency: 'usd',
          unit_amount: Math.round(shipping * 100),
          product_data: {
            name: `Shipping · ${shipRegion === 'usa' ? 'USA' : 'Europe'}`,
            description: undefined,
            images: [],
            metadata: {
              productId: 'shipping',
              color: '',
              size: '',
            },
          },
        },
      })
    }

    const customerEmail = body.email?.trim() || undefined
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items,
      customer_email: customerEmail,
      // Stripe’s own payment receipt (Dashboard → Settings → Emails must allow it)
      payment_intent_data: customerEmail
        ? { receipt_email: customerEmail }
        : undefined,
      shipping_address_collection: {
        allowed_countries: shipRegion === 'usa' ? ['US'] : [
          'AT',
          'BE',
          'BG',
          'HR',
          'CY',
          'CZ',
          'DK',
          'EE',
          'FI',
          'FR',
          'DE',
          'GR',
          'HU',
          'IE',
          'IT',
          'LV',
          'LT',
          'LU',
          'MT',
          'NL',
          'PL',
          'PT',
          'RO',
          'SK',
          'SI',
          'ES',
          'SE',
          'GB',
          'NO',
          'CH',
        ],
      },
      phone_number_collection: { enabled: true },
      success_url: `${origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/checkout?canceled=1`,
      metadata: {
        shipRegion,
        customerName: (body.customerName || '').slice(0, 80),
        itemCount: String(items.length),
      },
    })

    if (!session.url) {
      return NextResponse.json(
        { error: 'Stripe did not return a checkout URL' },
        { status: 502 },
      )
    }

    return NextResponse.json({
      ok: true,
      url: session.url,
      id: session.id,
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Stripe checkout failed'
    console.error('[stripe checkout]', msg)
    return NextResponse.json({ error: msg }, { status: 502 })
  }
}

export async function GET() {
  return NextResponse.json({
    configured: stripeConfigured(),
    mode: process.env.STRIPE_SECRET_KEY?.startsWith('sk_live')
      ? 'live'
      : process.env.STRIPE_SECRET_KEY?.startsWith('sk_test')
        ? 'test'
        : 'missing',
  })
}

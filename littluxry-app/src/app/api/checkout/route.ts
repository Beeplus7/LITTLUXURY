import { NextResponse } from 'next/server'
import {
  approveUrl,
  paypalConfigured,
  paypalFetch,
  paypalMode,
  type PayPalOrder,
} from '@/lib/paypal'

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

function money(n: number) {
  return (Math.round(Number(n) * 100) / 100).toFixed(2)
}

export async function POST(request: Request) {
  if (!paypalConfigured()) {
    return NextResponse.json(
      {
        error:
          'PayPal is not configured. Add NEXT_PUBLIC_PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET.',
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
  const customerEmail = body.email?.trim() || ''
  const customerName = (body.customerName || '').trim().slice(0, 80)

  const paypalItems = items.map((item) => {
    const qty = Math.min(99, Math.max(1, Math.round(item.quantity)))
    const label = [item.color, item.size].filter(Boolean).join(' · ')
    return {
      name: item.name.slice(0, 127),
      description: label ? label.slice(0, 127) : undefined,
      quantity: String(qty),
      unit_amount: {
        currency_code: 'USD',
        value: money(item.price),
      },
      category: 'PHYSICAL_GOODS' as const,
      sku: String(item.productId || '').slice(0, 127) || undefined,
    }
  })

  const itemTotal = items.reduce(
    (sum, item) =>
      sum +
      Number(item.price) *
        Math.min(99, Math.max(1, Math.round(item.quantity))),
    0,
  )
  const orderTotal = itemTotal + shipping

  try {
    const order = await paypalFetch<PayPalOrder>('/v2/checkout/orders', {
      method: 'POST',
      json: {
        intent: 'CAPTURE',
        purchase_units: [
          {
            description: 'LITT LUXURY order',
            custom_id: JSON.stringify({
              shipRegion,
              customerName: customerName.slice(0, 40),
              email: customerEmail.slice(0, 60),
            }).slice(0, 127),
            amount: {
              currency_code: 'USD',
              value: money(orderTotal),
              breakdown: {
                item_total: {
                  currency_code: 'USD',
                  value: money(itemTotal),
                },
                shipping: {
                  currency_code: 'USD',
                  value: money(shipping),
                },
              },
            },
            items: paypalItems,
          },
        ],
        payer: customerEmail
          ? {
              email_address: customerEmail,
              name: customerName
                ? {
                    given_name: customerName.split(/\s+/)[0]?.slice(0, 140),
                    surname: customerName
                      .split(/\s+/)
                      .slice(1)
                      .join(' ')
                      .slice(0, 140) || undefined,
                  }
                : undefined,
            }
          : undefined,
        application_context: {
          brand_name: 'LITT LUXURY',
          landing_page: 'LOGIN',
          user_action: 'PAY_NOW',
          shipping_preference: 'GET_FROM_FILE',
          return_url: `${origin}/checkout/success`,
          cancel_url: `${origin}/checkout?canceled=1`,
        },
      },
    })

    const url = approveUrl(order)
    if (!url) {
      return NextResponse.json(
        { error: 'PayPal did not return an approval URL' },
        { status: 502 },
      )
    }

    return NextResponse.json({
      ok: true,
      url,
      id: order.id,
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'PayPal checkout failed'
    console.error('[paypal checkout]', msg)
    return NextResponse.json({ error: msg }, { status: 502 })
  }
}

export async function GET() {
  return NextResponse.json({
    configured: paypalConfigured(),
    mode: paypalConfigured() ? paypalMode() : 'missing',
    provider: 'paypal',
  })
}

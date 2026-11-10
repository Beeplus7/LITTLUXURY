import { NextResponse } from 'next/server'
import {
  orderEmailFromPayPalOrder,
  sendOrderConfirmationEmail,
} from '@/lib/orderEmail'
import {
  paypalConfigured,
  paypalFetch,
  verifyPayPalWebhook,
  type PayPalOrder,
} from '@/lib/paypal'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  if (!paypalConfigured()) {
    return NextResponse.json({ error: 'PayPal not configured' }, { status: 503 })
  }

  const rawBody = await request.text()
  const verified = await verifyPayPalWebhook(request.headers, rawBody)
  if (!verified && process.env.PAYPAL_WEBHOOK_ID?.trim()) {
    console.error('[paypal webhook] signature verification failed')
    return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 400 })
  }
  if (!verified) {
    console.warn(
      '[paypal webhook] PAYPAL_WEBHOOK_ID missing — accepting unverified event',
    )
  }

  let event: {
    event_type?: string
    resource?: {
      id?: string
      supplementary_data?: { related_ids?: { order_id?: string } }
    }
  }
  try {
    event = JSON.parse(rawBody) as typeof event
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const type = event.event_type || ''
  if (
    type === 'CHECKOUT.ORDER.APPROVED' ||
    type === 'PAYMENT.CAPTURE.COMPLETED' ||
    type === 'CHECKOUT.ORDER.COMPLETED'
  ) {
    const orderId =
      event.resource?.supplementary_data?.related_ids?.order_id ||
      (type.startsWith('CHECKOUT.ORDER') ? event.resource?.id : undefined)

    if (orderId) {
      try {
        let order = await paypalFetch<PayPalOrder>(
          `/v2/checkout/orders/${encodeURIComponent(orderId)}`,
          { method: 'GET' },
        )
        if (order.status !== 'COMPLETED') {
          try {
            order = await paypalFetch<PayPalOrder>(
              `/v2/checkout/orders/${encodeURIComponent(orderId)}/capture`,
              { method: 'POST', json: {} },
            )
          } catch {
            /* already captured is fine */
            order = await paypalFetch<PayPalOrder>(
              `/v2/checkout/orders/${encodeURIComponent(orderId)}`,
              { method: 'GET' },
            )
          }
        }
        const payload = orderEmailFromPayPalOrder(order)
        if (payload) {
          const result = await sendOrderConfirmationEmail(payload)
          console.log('[paypal webhook] confirmation email', result)
        }
      } catch (e) {
        console.error(
          '[paypal webhook] email failed',
          e instanceof Error ? e.message : e,
        )
      }
    }
  }

  return NextResponse.json({ received: true })
}

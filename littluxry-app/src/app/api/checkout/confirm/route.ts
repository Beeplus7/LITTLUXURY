import { NextResponse } from 'next/server'
import { orderEmailFromPayPalOrder } from '@/lib/orderEmail'
import { fulfillPaidOrder } from '@/lib/fulfillPaidOrder'
import {
  paypalConfigured,
  paypalFetch,
  type PayPalOrder,
} from '@/lib/paypal'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function isPaid(order: PayPalOrder) {
  const status = order.status?.toUpperCase()
  if (status === 'COMPLETED') return true
  const capture = order.purchase_units?.[0]?.payments?.captures?.[0]?.status
  return capture?.toUpperCase() === 'COMPLETED'
}

export async function POST(request: Request) {
  if (!paypalConfigured()) {
    return NextResponse.json(
      { error: 'PayPal is not configured' },
      { status: 503 },
    )
  }

  let body: { orderId?: string; token?: string; sessionId?: string }
  try {
    body = (await request.json()) as typeof body
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const orderId = (
    body.orderId ||
    body.token ||
    body.sessionId ||
    ''
  ).trim()
  if (!orderId) {
    return NextResponse.json(
      { error: 'orderId is required' },
      { status: 400 },
    )
  }

  try {
    let order = await paypalFetch<PayPalOrder>(
      `/v2/checkout/orders/${encodeURIComponent(orderId)}`,
      { method: 'GET' },
    )

    if (!isPaid(order)) {
      try {
        order = await paypalFetch<PayPalOrder>(
          `/v2/checkout/orders/${encodeURIComponent(orderId)}/capture`,
          { method: 'POST', json: {} },
        )
      } catch (e) {
        const msg = e instanceof Error ? e.message : ''
        if (/already.?captured|ORDER_ALREADY_CAPTURED/i.test(msg)) {
          order = await paypalFetch<PayPalOrder>(
            `/v2/checkout/orders/${encodeURIComponent(orderId)}`,
            { method: 'GET' },
          )
        } else {
          throw e
        }
      }
    }

    if (!isPaid(order)) {
      return NextResponse.json(
        { error: 'Payment not completed yet', status: order.status },
        { status: 402 },
      )
    }

    const payload = orderEmailFromPayPalOrder(order)
    if (!payload) {
      return NextResponse.json(
        { error: 'No customer email on this PayPal order' },
        { status: 422 },
      )
    }

    const result = await fulfillPaidOrder(payload)
    if (!result.customerMail.ok && !result.customerMail.skipped) {
      return NextResponse.json(
        {
          ok: false,
          paypalReceipt: true,
          orderId: result.order.id,
          adminNotified: Boolean(result.adminMail.ok),
          error: result.customerMail.error,
          hint: 'Order saved in admin. Add RESEND_API_KEY (or SMTP) for branded confirmation email.',
        },
        { status: 503 },
      )
    }

    return NextResponse.json({
      ok: true,
      skipped: result.customerMail.skipped,
      provider:
        result.customerMail.ok && 'provider' in result.customerMail
          ? result.customerMail.provider
          : undefined,
      to: payload.to,
      orderId: result.order.id,
      adminNotified: Boolean(result.adminMail.ok),
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Confirm failed'
    console.error('[checkout confirm]', msg)
    return NextResponse.json({ error: msg }, { status: 502 })
  }
}

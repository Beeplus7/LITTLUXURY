import { NextResponse } from 'next/server'
import { getStripe, stripeConfigured } from '@/lib/stripe'
import {
  orderEmailFromCheckoutSession,
  sendOrderConfirmationEmail,
} from '@/lib/orderEmail'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  if (!stripeConfigured()) {
    return NextResponse.json(
      { error: 'Stripe is not configured' },
      { status: 503 },
    )
  }

  let body: { sessionId?: string }
  try {
    body = (await request.json()) as { sessionId?: string }
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const sessionId = body.sessionId?.trim()
  if (!sessionId) {
    return NextResponse.json({ error: 'sessionId is required' }, { status: 400 })
  }

  try {
    const stripe = getStripe()
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['line_items', 'payment_intent'],
    })

    if (session.payment_status !== 'paid' && session.status !== 'complete') {
      return NextResponse.json(
        { error: 'Payment not completed yet', status: session.payment_status },
        { status: 402 },
      )
    }

    const lineItems =
      session.line_items?.data ??
      (
        await stripe.checkout.sessions.listLineItems(sessionId, { limit: 50 })
      ).data

    const payload = orderEmailFromCheckoutSession(session, lineItems)
    if (!payload) {
      return NextResponse.json(
        { error: 'No customer email on this session' },
        { status: 422 },
      )
    }

    const result = await sendOrderConfirmationEmail(payload)
    if (!result.ok) {
      return NextResponse.json(
        {
          ok: false,
          stripeReceipt: true,
          error: result.error,
          hint: 'Stripe may still email a receipt. Add RESEND_API_KEY for branded LITT LUXURY mail.',
        },
        { status: 503 },
      )
    }

    return NextResponse.json({
      ok: true,
      skipped: result.skipped,
      provider: 'provider' in result ? result.provider : undefined,
      to: payload.to,
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Confirm failed'
    console.error('[checkout confirm]', msg)
    return NextResponse.json({ error: msg }, { status: 502 })
  }
}

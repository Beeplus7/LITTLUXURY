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
    return NextResponse.json({ error: 'Stripe not configured' }, { status: 503 })
  }

  const stripe = getStripe()
  const sig = request.headers.get('stripe-signature')
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim()
  const rawBody = await request.text()

  let event
  try {
    if (webhookSecret && sig) {
      event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret)
    } else {
      // Local / misconfigured webhook secret — parse without verify (not for production)
      event = JSON.parse(rawBody) as { type: string; data: { object: unknown } }
      console.warn('[stripe webhook] STRIPE_WEBHOOK_SECRET missing — unverified event')
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Invalid signature'
    console.error('[stripe webhook]', msg)
    return NextResponse.json({ error: msg }, { status: 400 })
  }

  if (event.type === 'checkout.session.completed') {
    const sessionRef = event.data.object as { id?: string }
    const sessionId = sessionRef.id
    if (sessionId) {
      try {
        const session = await stripe.checkout.sessions.retrieve(sessionId, {
          expand: ['line_items', 'payment_intent'],
        })
        const lineItems =
          session.line_items?.data ??
          (
            await stripe.checkout.sessions.listLineItems(sessionId, {
              limit: 50,
            })
          ).data
        const payload = orderEmailFromCheckoutSession(session, lineItems)
        if (payload) {
          const result = await sendOrderConfirmationEmail(payload)
          console.log('[stripe webhook] confirmation email', result)
        }
      } catch (e) {
        console.error(
          '[stripe webhook] email failed',
          e instanceof Error ? e.message : e,
        )
      }
    }
  }

  return NextResponse.json({ received: true })
}

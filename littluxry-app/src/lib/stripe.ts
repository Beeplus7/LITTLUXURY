import Stripe from 'stripe'

export function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY?.trim()
  if (!key) {
    throw new Error('STRIPE_SECRET_KEY is not configured')
  }
  return new Stripe(key, {
    apiVersion: '2025-02-24.acacia',
    typescript: true,
  })
}

export function stripeConfigured() {
  return Boolean(process.env.STRIPE_SECRET_KEY?.trim())
}

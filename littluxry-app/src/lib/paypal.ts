const LIVE_API = 'https://api-m.paypal.com'
const SANDBOX_API = 'https://api-m.sandbox.paypal.com'

export function paypalMode(): 'live' | 'sandbox' {
  const mode = process.env.PAYPAL_MODE?.trim().toLowerCase()
  if (mode === 'sandbox') return 'sandbox'
  return 'live'
}

export function paypalApiBase() {
  return paypalMode() === 'sandbox' ? SANDBOX_API : LIVE_API
}

export function paypalConfigured() {
  return Boolean(
    process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID?.trim() &&
      process.env.PAYPAL_CLIENT_SECRET?.trim(),
  )
}

type TokenCache = { accessToken: string; expiresAt: number }
let tokenCache: TokenCache | null = null

export async function getPayPalAccessToken(): Promise<string> {
  const clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID?.trim()
  const secret = process.env.PAYPAL_CLIENT_SECRET?.trim()
  if (!clientId || !secret) {
    throw new Error('PayPal client ID / secret not configured')
  }

  if (tokenCache && Date.now() < tokenCache.expiresAt - 30_000) {
    return tokenCache.accessToken
  }

  const auth = Buffer.from(`${clientId}:${secret}`).toString('base64')
  const res = await fetch(`${paypalApiBase()}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  })
  const data = (await res.json()) as {
    access_token?: string
    expires_in?: number
    error_description?: string
    error?: string
  }
  if (!res.ok || !data.access_token) {
    throw new Error(
      data.error_description || data.error || 'PayPal OAuth failed',
    )
  }
  tokenCache = {
    accessToken: data.access_token,
    expiresAt: Date.now() + (data.expires_in || 300) * 1000,
  }
  return data.access_token
}

export async function paypalFetch<T = unknown>(
  path: string,
  init?: RequestInit & { json?: unknown },
): Promise<T> {
  const token = await getPayPalAccessToken()
  const headers = new Headers(init?.headers)
  headers.set('Authorization', `Bearer ${token}`)
  headers.set('Content-Type', 'application/json')
  if (!headers.has('Prefer')) {
    headers.set('Prefer', 'return=representation')
  }

  const res = await fetch(`${paypalApiBase()}${path}`, {
    ...init,
    headers,
    body:
      init?.json !== undefined ? JSON.stringify(init.json) : init?.body,
  })

  const text = await res.text()
  let data: unknown = null
  try {
    data = text ? JSON.parse(text) : null
  } catch {
    data = { raw: text }
  }

  if (!res.ok) {
    const err = data as {
      message?: string
      details?: { description?: string }[]
      name?: string
    } | null
    const detail = err?.details?.[0]?.description
    throw new Error(
      detail || err?.message || err?.name || `PayPal HTTP ${res.status}`,
    )
  }

  return data as T
}

export type PayPalLink = { href: string; rel: string; method?: string }

export type PayPalOrder = {
  id: string
  status?: string
  links?: PayPalLink[]
  payer?: {
    email_address?: string
    name?: { given_name?: string; surname?: string }
  }
  purchase_units?: Array<{
    reference_id?: string
    custom_id?: string
    description?: string
    amount?: {
      currency_code?: string
      value?: string
      breakdown?: {
        item_total?: { value?: string }
        shipping?: { value?: string }
      }
    }
    items?: Array<{
      name?: string
      description?: string
      quantity?: string
      unit_amount?: { value?: string; currency_code?: string }
    }>
    shipping?: {
      name?: { full_name?: string }
      address?: {
        address_line_1?: string
        address_line_2?: string
        admin_area_2?: string
        admin_area_1?: string
        postal_code?: string
        country_code?: string
      }
    }
    payments?: {
      captures?: Array<{ id?: string; status?: string }>
    }
  }>
}

export function approveUrl(order: PayPalOrder): string | undefined {
  return order.links?.find((l) => l.rel === 'approve')?.href
}

export async function verifyPayPalWebhook(
  headers: Headers,
  rawBody: string,
): Promise<boolean> {
  const webhookId = process.env.PAYPAL_WEBHOOK_ID?.trim()
  if (!webhookId) return false

  const transmissionId = headers.get('paypal-transmission-id')
  const transmissionTime = headers.get('paypal-transmission-time')
  const certUrl = headers.get('paypal-cert-url')
  const authAlgo = headers.get('paypal-auth-algo')
  const transmissionSig = headers.get('paypal-transmission-sig')

  if (
    !transmissionId ||
    !transmissionTime ||
    !certUrl ||
    !authAlgo ||
    !transmissionSig
  ) {
    return false
  }

  try {
    const result = await paypalFetch<{ verification_status?: string }>(
      '/v1/notifications/verify-webhook-signature',
      {
        method: 'POST',
        json: {
          transmission_id: transmissionId,
          transmission_time: transmissionTime,
          cert_url: certUrl,
          auth_algo: authAlgo,
          transmission_sig: transmissionSig,
          webhook_id: webhookId,
          webhook_event: JSON.parse(rawBody),
        },
      },
    )
    return result.verification_status === 'SUCCESS'
  } catch (e) {
    console.error(
      '[paypal webhook verify]',
      e instanceof Error ? e.message : e,
    )
    return false
  }
}

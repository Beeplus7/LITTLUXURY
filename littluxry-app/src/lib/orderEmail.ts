import { mkdir, readFile, writeFile } from 'fs/promises'
import path from 'path'
import nodemailer from 'nodemailer'
import { Resend } from 'resend'
import type Stripe from 'stripe'

export type OrderEmailLine = {
  name: string
  detail?: string
  quantity: number
  amount: number
}

export type OrderEmailPayload = {
  to: string
  customerName?: string
  sessionId: string
  paymentIntentId?: string
  currency: string
  total: number
  shippingAmount?: number
  shipRegion?: string
  lines: OrderEmailLine[]
  shippingAddress?: {
    name?: string
    line1?: string
    line2?: string
    city?: string
    state?: string
    postal_code?: string
    country?: string
  }
}

function dataDir() {
  return path.join(process.cwd(), 'data')
}

function sentPath() {
  return path.join(dataDir(), 'order-emails-sent.json')
}

async function readSent(): Promise<Record<string, string>> {
  try {
    const raw = await readFile(sentPath(), 'utf8')
    return JSON.parse(raw) as Record<string, string>
  } catch {
    return {}
  }
}

async function markSent(sessionId: string) {
  await mkdir(dataDir(), { recursive: true })
  const map = await readSent()
  map[sessionId] = new Date().toISOString()
  await writeFile(sentPath(), JSON.stringify(map, null, 2), 'utf8')
}

export async function alreadySent(sessionId: string) {
  const map = await readSent()
  return Boolean(map[sessionId])
}

function money(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase() || 'USD',
    }).format(amount)
  } catch {
    return `$${amount.toFixed(2)}`
  }
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export function buildOrderEmailHtml(payload: OrderEmailPayload) {
  const name = payload.customerName?.trim() || 'there'
  const rows = payload.lines
    .map(
      (line) => `
      <tr>
        <td style="padding:10px 0;border-bottom:1px solid #eee;color:#111">
          <div style="font-weight:600">${escapeHtml(line.name)}</div>
          ${
            line.detail
              ? `<div style="font-size:12px;color:#777;margin-top:2px">${escapeHtml(line.detail)}</div>`
              : ''
          }
          <div style="font-size:12px;color:#999;margin-top:2px">Qty ${line.quantity}</div>
        </td>
        <td style="padding:10px 0;border-bottom:1px solid #eee;text-align:right;color:#111;white-space:nowrap">
          ${money(line.amount, payload.currency)}
        </td>
      </tr>`,
    )
    .join('')

  const addr = payload.shippingAddress
  const addressBlock = addr
    ? `
      <p style="margin:0 0 4px;color:#444;font-size:13px;line-height:1.5">
        ${[addr.name, addr.line1, addr.line2, [addr.city, addr.state, addr.postal_code].filter(Boolean).join(', '), addr.country]
          .filter(Boolean)
          .map((x) => escapeHtml(String(x)))
          .join('<br/>')}
      </p>`
    : `<p style="margin:0;color:#777;font-size:13px">Collected on Stripe Checkout</p>`

  return `<!doctype html>
<html>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:Georgia,'Times New Roman',serif">
  <div style="max-width:560px;margin:0 auto;padding:32px 16px">
    <div style="background:#111;border:1px solid #2a2a2a;border-radius:16px;overflow:hidden">
      <div style="padding:28px 28px 18px;border-bottom:1px solid #2a2a2a">
        <div style="color:#D4AF37;letter-spacing:0.22em;font-size:11px;text-transform:uppercase">LITT LUXURY</div>
        <h1 style="margin:12px 0 0;color:#fff;font-size:28px;font-weight:400">Payment confirmed</h1>
        <p style="margin:10px 0 0;color:#b8b0a4;font-size:14px;line-height:1.5">
          Hi ${escapeHtml(name)}, thank you for your order. We’ve received your payment.
        </p>
      </div>
      <div style="padding:22px 28px;background:#faf8f5">
        <table style="width:100%;border-collapse:collapse">${rows}</table>
        <div style="margin-top:16px;padding-top:14px;border-top:1px solid #e6e0d6">
          <div style="display:flex;justify-content:space-between;color:#666;font-size:13px;margin-bottom:6px">
            <span>Shipping${payload.shipRegion ? ` · ${escapeHtml(payload.shipRegion)}` : ''}</span>
            <span>${money(payload.shippingAmount || 0, payload.currency)}</span>
          </div>
          <div style="display:flex;justify-content:space-between;align-items:baseline">
            <span style="color:#111;font-size:14px">Total paid</span>
            <span style="color:#8a6a1a;font-size:24px">${money(payload.total, payload.currency)}</span>
          </div>
        </div>
        <div style="margin-top:22px">
          <div style="color:#8a6a1a;font-size:11px;letter-spacing:0.16em;text-transform:uppercase;margin-bottom:8px">Ship to</div>
          ${addressBlock}
        </div>
        <p style="margin:22px 0 0;color:#999;font-size:11px;line-height:1.5">
          Order ref · ${escapeHtml(payload.sessionId)}
          ${payload.paymentIntentId ? `<br/>Payment · ${escapeHtml(payload.paymentIntentId)}` : ''}
        </p>
      </div>
      <div style="padding:18px 28px;color:#6a655c;font-size:12px;line-height:1.5">
        Questions? Reply to this email or visit
        <a href="https://litt-luxury.com" style="color:#D4AF37;text-decoration:none">litt-luxury.com</a>
      </div>
    </div>
  </div>
</body>
</html>`
}

export function buildOrderEmailText(payload: OrderEmailPayload) {
  const lines = payload.lines
    .map(
      (l) =>
        `- ${l.name}${l.detail ? ` (${l.detail})` : ''} × ${l.quantity}: ${money(l.amount, payload.currency)}`,
    )
    .join('\n')
  return [
    `LITT LUXURY — Payment confirmed`,
    ``,
    `Hi ${payload.customerName || 'there'},`,
    `Thank you for your order. We’ve received your payment.`,
    ``,
    lines,
    ``,
    `Shipping: ${money(payload.shippingAmount || 0, payload.currency)}`,
    `Total paid: ${money(payload.total, payload.currency)}`,
    ``,
    `Ref: ${payload.sessionId}`,
    payload.paymentIntentId ? `Payment: ${payload.paymentIntentId}` : '',
  ]
    .filter(Boolean)
    .join('\n')
}

async function sendViaResend(opts: {
  to: string[]
  subject: string
  html: string
  text: string
}) {
  const key = process.env.RESEND_API_KEY?.trim()
  if (!key) return null
  const from =
    process.env.ORDER_EMAIL_FROM?.trim() ||
    'LITT LUXURY <onboarding@resend.dev>'
  const resend = new Resend(key)
  const result = await resend.emails.send({
    from,
    to: opts.to,
    subject: opts.subject,
    html: opts.html,
    text: opts.text,
  })
  if (result.error) throw new Error(result.error.message)
  return { provider: 'resend' as const, id: result.data?.id }
}

async function sendViaSmtp(opts: {
  to: string[]
  subject: string
  html: string
  text: string
}) {
  const host = process.env.SMTP_HOST?.trim()
  const user = process.env.SMTP_USER?.trim()
  const pass = process.env.SMTP_PASS?.trim()
  if (!host || !user || !pass) return null
  const port = Number(process.env.SMTP_PORT || 587)
  const from =
    process.env.ORDER_EMAIL_FROM?.trim() ||
    `LITT LUXURY <${user}>`
  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  })
  const info = await transporter.sendMail({
    from,
    to: opts.to.join(', '),
    subject: opts.subject,
    html: opts.html,
    text: opts.text,
  })
  return { provider: 'smtp' as const, id: info.messageId }
}

export async function sendOrderConfirmationEmail(payload: OrderEmailPayload) {
  if (await alreadySent(payload.sessionId)) {
    return { ok: true, skipped: true as const, reason: 'already-sent' }
  }

  const notify = process.env.ORDER_EMAIL_NOTIFY?.trim()
  const to = [payload.to, notify].filter(Boolean) as string[]
  const uniqueTo = Array.from(new Set(to.map((e) => e.toLowerCase())))
  const subject = `Order confirmed · ${money(payload.total, payload.currency)} · LITT LUXURY`
  const html = buildOrderEmailHtml(payload)
  const text = buildOrderEmailText(payload)

  const viaResend = await sendViaResend({
    to: uniqueTo,
    subject,
    html,
    text,
  })
  if (viaResend) {
    await markSent(payload.sessionId)
    return { ok: true, skipped: false as const, ...viaResend }
  }

  const viaSmtp = await sendViaSmtp({
    to: uniqueTo,
    subject,
    html,
    text,
  })
  if (viaSmtp) {
    await markSent(payload.sessionId)
    return { ok: true, skipped: false as const, ...viaSmtp }
  }

  return {
    ok: false,
    skipped: false as const,
    error:
      'No email provider configured. Set RESEND_API_KEY (recommended) or SMTP_HOST/SMTP_USER/SMTP_PASS.',
  }
}

export function orderEmailFromCheckoutSession(
  session: Stripe.Checkout.Session,
  lineItems: Stripe.LineItem[],
): OrderEmailPayload | null {
  const to =
    session.customer_details?.email ||
    session.customer_email ||
    undefined
  if (!to) return null

  const currency = (session.currency || 'usd').toLowerCase()
  const total = (session.amount_total || 0) / 100
  const lines: OrderEmailLine[] = []
  let shippingAmount = 0

  for (const item of lineItems) {
    const name = item.description || item.price?.product?.toString() || 'Item'
    const amount = (item.amount_total || 0) / 100
    const qty = item.quantity || 1
    if (/^shipping/i.test(name)) {
      shippingAmount += amount
      continue
    }
    lines.push({
      name,
      detail: undefined,
      quantity: qty,
      amount,
    })
  }

  const addr = session.customer_details?.address
  const shipRegion = session.metadata?.shipRegion

  return {
    to,
    customerName:
      session.metadata?.customerName ||
      session.customer_details?.name ||
      undefined,
    sessionId: session.id,
    paymentIntentId:
      typeof session.payment_intent === 'string'
        ? session.payment_intent
        : session.payment_intent?.id,
    currency,
    total,
    shippingAmount,
    shipRegion:
      shipRegion === 'usa'
        ? 'USA'
        : shipRegion === 'europe'
          ? 'Europe'
          : shipRegion || undefined,
    lines,
    shippingAddress: addr
      ? {
          name: session.customer_details?.name || undefined,
          line1: addr.line1 || undefined,
          line2: addr.line2 || undefined,
          city: addr.city || undefined,
          state: addr.state || undefined,
          postal_code: addr.postal_code || undefined,
          country: addr.country || undefined,
        }
      : undefined,
  }
}
